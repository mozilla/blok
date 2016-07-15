var {allHosts, canonicalizeHost} = require('./canonicalize');
const {loadLists} = require('./lists');

var TESTPILOT_TELEMETRY_CHANNEL = 'testpilot-telemetry';
var testpilotPingChannel = new BroadcastChannel(TESTPILOT_TELEMETRY_CHANNEL);

// HACK: Start with active tab id = 1 when browser starts
var current_active_tab_id = 1;
var current_origin_disabled_index = -1;
var current_active_origin;
var blocked_requests = {};
var total_exec_time = {};
var reasons_given = {};


function restartBlokForTab(tabID) {
  blocked_requests[tabID] = [];
  total_exec_time[tabID] = 0;
  reasons_given[tabID] = null;
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

    var requestHostInBlocklist = false;
    var requestIsThirdParty = false;

    // Determine all origin flags
    // NOTE: we may not need to canonicalize the origin host?
    originTopHost = canonicalizeHost(new URL(requestDetails.originUrl).host);
    current_active_origin = originTopHost;
    current_origin_disabled_index = allowedHosts.indexOf(current_active_origin);
    
    currentOriginDisabled = current_origin_disabled_index > -1;
    firefoxOrigin = (typeof originTopHost !== "undefined" && originTopHost.includes('moz-nullprincipal'));
    newOrigin = originTopHost == '';

    // Allow request if the origin has been added to allowedHosts
    if (currentOriginDisabled) {
      console.log("Protection disabled for this site; allowing request.");
      browser.tabs.sendMessage(requestTabID,
          {
            'origin-disabled': originTopHost,
            'reason-given': reasons_given[requestTabID]
          }
      );
      return {};
    }

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
      console.log("requestTopHost: ${requestTopHost} does not match originTopHost: ${originTopHost}...");

      for (entityName in entityList) {
        var entity = entityList[entityName];
        var requestIsEntityResource = false;
        var originIsEntityProperty = false;

        for (let requestHost of allHosts(requestTopHost)) {
          requestIsEntityResource = entity.resources.indexOf(requestHost) > -1;
          if (requestIsEntityResource) {
            break;
          }
        }
        for (let originHost of allHosts(originTopHost)) {
          originIsEntityProperty = entity.properties.indexOf(originHost) > -1;
          if (originIsEntityProperty) {
            break;
          }
        }

        if (originIsEntityProperty && requestIsEntityResource) {
          console.log("origin property of ${originHost} and resource requested from ${requestHost} belong to the same entity: ${entityName}; allowing request");
          total_exec_time[requestTabID] += Date.now() - blockTrackerRequestsStart;
          return {};
        }
      }

      blocked_requests[requestTabID].push(requestTopHost);
      console.log("blocked " + blocked_requests[requestTabID].length + " requests: " + blocked_requests[requestTabID]);

      total_exec_time[requestTabID] += Date.now() - blockTrackerRequestsStart;
      console.log("total_exec_time: " + total_exec_time[requestTabID]);
      browser.tabs.sendMessage(requestTabID, {
        blocked_requests: blocked_requests[requestTabID]
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
    }
  });

  browser.runtime.onMessage.addListener(function (message) {
    if (message == "close-toolbar") {
      browser.tabs.sendMessage(current_active_tab_id, 'close-toolbar');
    }
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
    if (message.hasOwnProperty('disable-reason')) {
      testpilotPingChannel.postMessage({
        originDomain: current_active_origin,
        trackerDomains: blocked_requests[current_active_tab_id],
        reason: message['disable-reason']
      });
      reasons_given[current_active_tab_id] = message['disable-reason'];
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
