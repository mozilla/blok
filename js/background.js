var TESTPILOT_TELEMETRY_CHANNEL = 'testpilot-telemetry';
var testpilotPingChannel = new BroadcastChannel(TESTPILOT_TELEMETRY_CHANNEL);

var blocklist = {};
var allowedHosts = [];

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


var getBlocklistJSON = new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('get', 'disconnect-blocklist.json', true);
    xhr.responseType = 'json';
    xhr.onload = function () {
      var status = xhr.status;
      if (status == 200) {
        var data = xhr.response;

        // remove un-needed categories per disconnect
        delete data.categories['Content'];
        delete data.categories['Legacy Disconnect'];
        delete data.categories['Legacy Content'];

        // parse thru the disconnect blocklist and create
        // local blocklist "grouped" by main domain. I.e.,
        // blocklist["facebook.com"] = http://www.facebook.com
        // blocklist["fb.com"] = http://www.facebook.com
        // blocklist["doubleclick.net"] = http://www.google.com
        // blocklist["google-analytics.com"] = http://www.google.com
        // etc.
        for (category_name in data.categories) {
          var category = data.categories[category_name];
          var entity_count = category.length;

          for (var i = 0; i < entity_count; i++) {
            var entity = category[i];

            for (entity_name in entity) {
              var urls = entity[entity_name];

              for (main_domain in urls) {
                blocklist[main_domain] = [];
                var domains = urls[main_domain];
                var domains_count = domains.length;

                for (var j = 0; j < domains_count; j++) {
                  blocklist[domains[j]] = main_domain;
                }

              }

            }

          }

        }
        resolve(blocklist);
      } else {
        reject(status);
      }
    };
    xhr.send();
});


var getAllowedHosts = new Promise(function(resolve, reject) {
  browser.storage.local.get("allowedHosts", function(item) {
    if (Object.keys(item).length === 0) {
      allowedHosts = [];
    } else {
      allowedHosts = item.allowedHosts;
    }
    resolve(allowedHosts);
  });
});


function blockTrackerRequests(requestDetails) {
    var blockTrackerRequestsStart = Date.now();
    var requestTabID = requestDetails.tabId;
    var originTopHost, requestTopHost;

    // Start with all origin flags false
    var currentOriginDisabled = false;
    var firefoxOrigin = false;
    var newOrigin = false;

    var requestHostInBlocklist = false;

    // Determine all origin flags
    originTopHost = new URL(requestDetails.originUrl).host.split('.').slice(-2).join('.');
    current_active_origin = originTopHost;
    current_origin_disabled_index = allowedHosts.indexOf(current_active_origin);
    
    currentOriginDisabled = current_origin_disabled_index > -1;
    firefoxOrigin = (typeof originTopHost !== "undefined" && originTopHost.includes('moz-nullprincipal'));
    newOrigin = originTopHost == '';

    // Allow request if the origin has been added to allowedHosts
    if (currentOriginDisabled) {
      console.log("Protection disabled for this site; allowing request.");
      chrome.tabs.sendMessage(requestTabID, {'origin-disabled': originTopHost});
      return {};
    }

    // Allow request originating from Firefox and/or new tab/window origins
    if (firefoxOrigin || newOrigin) {
        total_exec_time[requestTabID] += Date.now() - blockTrackerRequestsStart;
        return {};
    }

    requestTopHost = new URL(requestDetails.url).host.split('.').slice(-2).join('.');
    requestHostInBlocklist = blocklist.hasOwnProperty(requestTopHost);

    // Allow requests to 3rd-party domains NOT in the block-list
    if (!requestHostInBlocklist) {
        total_exec_time[requestTabID] += Date.now() - blockTrackerRequestsStart;
        return {};
    }

    // Block if the request host is 3rd-party
    if (requestTopHost != originTopHost) {
      console.log("requestTopHost: " + requestTopHost + " does not match originTopHost: " + originTopHost + ". Blocking request.");
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


Promise.all([getBlocklistJSON, getAllowedHosts]).then(function(values) {
  chrome.webRequest.onBeforeRequest.addListener(
      blockTrackerRequests,
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
