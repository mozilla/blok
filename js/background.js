var {canonicalizeHost} = require('./canonicalize');
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
      chrome.tabs.sendMessage(requestTabID,
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
    var requestHostnameParts = requestTopHost.split('.');
    while (requestHostnameParts.length > 1) {
      requestTopHost = requestHostnameParts.join('.');
      requestHostInBlocklist = blocklist.hasOwnProperty(requestTopHost);
      if (requestHostInBlocklist) {
        break;
      }
      requestHostnameParts.splice(0, 1);
    }

    // Allow requests to 3rd-party domains NOT in the block-list
    if (!requestHostInBlocklist) {
        total_exec_time[requestTabID] += Date.now() - blockTrackerRequestsStart;
        return {};
    }

    requestIsThirdParty = requestTopHost != originTopHost;

    // Block if the request host is 3rd-party
    if (requestIsThirdParty) {
      console.log("requestTopHost: " + requestTopHost + " does not match originTopHost: " + originTopHost + "...");

      // Check if origin property is requesting a "3rd-party" resource belonging to the same entity
      for (entityName in entityList) {
        var entity = entityList[entityName];
        var originIsEntityProperty = false;
        var requestIsEntityResource = false;

        originIsEntityProperty = entity.properties.hasOwnProperty(originTopHost);
        requestIsEntityResource = entity.resources.hasOwnProperty(requestTopHost);

        if (originIsEntityProperty && requestIsEntityResource) {
          console.log("origin property and resource request belong to the same entity: " + entityName + "; allowing request");
          total_exec_time[requestTabID] += Date.now() - blockTrackerRequestsStart;
          return {};
        }
      }

      blocked_requests[requestTabID].push(requestTopHost);
      console.log("blocked " + blocked_requests[requestTabID].length + " requests: " + blocked_requests[requestTabID]);

      total_exec_time[requestTabID] += Date.now() - blockTrackerRequestsStart;
      console.log("total_exec_time: " + total_exec_time[requestTabID]);
      chrome.tabs.sendMessage(requestTabID, {
        blocked_requests: blocked_requests[requestTabID]
      });

      return {cancel: true};
    }
  }
}


function startListeners({blocklist, allowedHosts, entityList}) {
  chrome.webRequest.onBeforeRequest.addListener(
      blockTrackerRequests(blocklist, allowedHosts, entityList),
      {urls:["*://*/*"]},
      ["blocking"]
  );

  chrome.tabs.onActivated.addListener(function(activeInfo) {
    current_active_tab_id = activeInfo.tabId;
  });

  chrome.tabs.onUpdated.addListener(function(tabID, changeInfo) {
    if (changeInfo.status == "loading") {
      restartBlokForTab(tabID);
    }
  });

  chrome.runtime.onMessage.addListener(function (message) {
    if (message == "close-toolbar") {
      chrome.tabs.sendMessage(current_active_tab_id, 'close-toolbar');
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
