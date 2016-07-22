var {allHosts, canonicalizeHost} = require('./canonicalize');
const {loadLists} = require('./lists');
const {log} = require('./log');

var TESTPILOT_TELEMETRY_CHANNEL = 'testpilot-telemetry';
var testpilotPingChannel = new BroadcastChannel(TESTPILOT_TELEMETRY_CHANNEL);

// HACK: Start with active tab id = 1 when browser starts
var current_active_tab_id = 1;
var current_origin_disabled_index = -1;
var current_active_origin;
var blocked_requests = {};
var blocked_entities = {};
var allowed_requests = {};
var allowed_entities = {};
var total_exec_time = {};
var reasons_given = {};
var mainFrameOriginTopHosts = {};


function restartBlokForTab(tabID) {
  blocked_requests[tabID] = [];
  blocked_entities[tabID] = [];
  allowed_requests[tabID] = [];
  allowed_entities[tabID] = [];
  total_exec_time[tabID] = 0;
  reasons_given[tabID] = null;
  mainFrameOriginTopHosts[tabID] = null;
}


function blockTrackerRequests(blocklist, allowedHosts, entityList) {
  return function filterRequest(requestDetails) {
    var blockTrackerRequestsStart = Date.now();
    var requestTabID = requestDetails.tabId;
    var originTopHost, requestTopHost;

    // Start with all origin flags false
    var currentOriginDisabled = false;
    var firefoxOrigin = false;
    var newOrigin = false;

    var requestEntityName;
    var requestHostInBlocklist = false;
    var requestIsThirdParty = false;
    var requestHostMatchesMainFrame = false;

    // Determine all origin flags
    originTopHost = canonicalizeHost(new URL(requestDetails.originUrl).host);
    current_active_origin = originTopHost;
    current_origin_disabled_index = allowedHosts.indexOf(current_active_origin);
    
    if (requestDetails.frameId == 0) {
      mainFrameOriginTopHosts[requestTabID] = originTopHost;
    }

    currentOriginDisabled = current_origin_disabled_index > -1;
    firefoxOrigin = (typeof originTopHost !== "undefined" && originTopHost.includes('moz-nullprincipal'));
    newOrigin = originTopHost == '';


    // Allow request originating from Firefox and/or new tab/window origins
    if (firefoxOrigin || newOrigin) {
        total_exec_time[requestTabID] += Date.now() - blockTrackerRequestsStart;
        return {};
    }

    requestTopHost = canonicalizeHost(new URL(requestDetails.url).host);
    // check if any host from lowest-level to top-level is in the blocklist
    var allRequestHosts = allHosts(requestTopHost);
    for (let requestHost of allRequestHosts) {
      requestHostInBlocklist = blocklist.hasOwnProperty(requestHost);
      if (requestHostInBlocklist) {
        break;
      }
    }

    // Allow requests to 3rd-party domains NOT in the block-list
    if (!requestHostInBlocklist) {
        total_exec_time[requestTabID] += Date.now() - blockTrackerRequestsStart;
        return {};
    }

    requestIsThirdParty = requestTopHost != originTopHost;

    if (requestIsThirdParty) {
      // Allow all requests to the main frame origin domain from child frames' pages
      requestHostMatchesMainFrame = (requestDetails.frameId > 0 && requestTopHost == mainFrameOriginTopHosts[requestTabID]);
      if (requestHostMatchesMainFrame) {
        total_exec_time[requestTabID] += Date.now() - blockTrackerRequestsStart;
        return {};
      }
      log(`requestTopHost: ${requestTopHost} does not match originTopHost: ${originTopHost}...`);

      for (entityName in entityList) {
        var entity = entityList[entityName];
        var requestIsEntityResource = false;
        var originIsEntityProperty = false;
        var mainFrameOriginIsEntityProperty = false;

        for (let requestHost of allHosts(requestTopHost)) {
          requestIsEntityResource = entity.resources.indexOf(requestHost) > -1;
          if (requestIsEntityResource) {
            requestEntityName = entityName;
            break;
          }
        }
        for (let originHost of allHosts(originTopHost)) {
          originIsEntityProperty = entity.properties.indexOf(originHost) > -1;
          if (originIsEntityProperty) {
            break;
          }
        }

        for (let mainFrameOriginHost of allHosts(mainFrameOriginTopHosts[requestTabID])) {
          mainFrameOriginIsEntityProperty = entity.properties.indexOf(mainFrameOriginHost) > -1;
          if (mainFrameOriginIsEntityProperty) {
            break;
          }
        }

        if ((originIsEntityProperty || mainFrameOriginIsEntityProperty) && requestIsEntityResource) {
          log(`originTopHost ${originTopHost} and resource requestTopHost ${requestTopHost} belong to the same entity: ${entityName}; allowing request`);
          total_exec_time[requestTabID] += Date.now() - blockTrackerRequestsStart;
          return {};
        }
      }

      // Allow request if the origin has been added to allowedHosts
      if (currentOriginDisabled) {
        log("Protection disabled for this site; allowing request.");
        browser.tabs.sendMessage(requestTabID,
            {
              'origin-disabled': originTopHost,
              'reason-given': reasons_given[requestTabID],
              'allowed_entities': allowed_entities[requestTabID]
            }
        );
        allowed_requests[requestTabID].push(requestTopHost);
        if (allowed_entities[requestTabID].indexOf(requestEntityName) === -1) {
          allowed_entities[requestTabID].push(requestEntityName);
        }
        return {};
      }

      blocked_requests[requestTabID].push(requestTopHost);
      if (blocked_entities[requestTabID].indexOf(requestEntityName) === -1) {
        blocked_entities[requestTabID].push(requestEntityName);
      }

      total_exec_time[requestTabID] += Date.now() - blockTrackerRequestsStart;
      browser.tabs.sendMessage(requestTabID, {
        blocked_requests: blocked_requests[requestTabID],
        blocked_entities: blocked_entities[requestTabID]
      });

      return {cancel: true};
    }

  // none of the above checks matched, so default to allowing the request
  total_exec_time[requestTabID] += Date.now() - blockTrackerRequestsStart;
  return {}

  }

}


function startListeners({blocklist, allowedHosts, entityList}) {
  browser.webRequest.onBeforeRequest.addListener(
      blockTrackerRequests(blocklist, allowedHosts, entityList),
      {urls:["*://*/*"]},
      ["blocking"]
  );

  browser.tabs.onActivated.addListener(function(activeInfo) {
    current_active_tab_id = activeInfo.tabId;
  });

  browser.tabs.onUpdated.addListener(function(tabID, changeInfo) {
    if (changeInfo.status == "loading") {
      restartBlokForTab(tabID);
    } else if (changeInfo.status == "complete") {
      let actionPerformed = (current_origin_disabled_index === -1) ? "Blocked " : "Detected ";
      let actionRequests = (current_origin_disabled_index === -1) ? blocked_requests[tabID] : allowed_requests[tabID];
      let actionEntities = (current_origin_disabled_index === -1) ? blocked_entities[tabID] : allowed_entities[tabID];
      log("blocked " + actionRequests.length + " requests: " + actionRequests);
      log("from " + actionEntities.length + " entities: " + actionEntities);
      log("total_exec_time: " + total_exec_time[tabID]);
    }
  });

  browser.runtime.onMessage.addListener(function (message) {
    if (message == "disable") {
      allowedHosts.push(current_active_origin);
      browser.storage.local.set({allowedHosts: allowedHosts});
      browser.tabs.reload(current_active_tab_id);
    }
    if (message == "re-enable") {
      allowedHosts.splice(current_origin_disabled_index, 1);
      browser.storage.local.set({allowedHosts: allowedHosts});
      browser.tabs.reload(current_active_tab_id);
    }
    if (message.hasOwnProperty('feedback')) {
      let testPilotPingMessage = {
        originDomain: current_active_origin,
        trackerDomains: blocked_requests[current_active_tab_id],
        feedback: message.feedback
      };
      log("telemetry ping payload: " + JSON.stringify(testPilotPingMessage));
      testpilotPingChannel.postMessage(testPilotPingMessage);
      log("mainFrameOriginTopHosts[current_active_tab_id]: " + mainFrameOriginTopHosts[current_active_tab_id]);
      browser.tabs.sendMessage(current_active_tab_id, {
        "feedback": message.feedback,
        "origin": mainFrameOriginTopHosts[current_active_tab_id]
      });
    }
    if (message.hasOwnProperty('breakage')) {
      let testPilotPingMessage = {
        originDomain: current_active_origin,
        trackerDomains: blocked_requests[current_active_tab_id],
        breakage: message.breakage,
        notes: message.notes
      };
      log("telemetry ping payload: " + JSON.stringify(testPilotPingMessage));
      testpilotPingChannel.postMessage(testPilotPingMessage);
      browser.tabs.sendMessage(current_active_tab_id, message);
    }
    if (message == 'close-feedback') {
      browser.tabs.sendMessage(current_active_tab_id, message);
    }
  });

}


const state = {
  blocklist: {},
  allowedHosts: [],
  entityList: {}
};

loadLists(state).then(() => {
  startListeners(state);
}, console.error.bind(console));
