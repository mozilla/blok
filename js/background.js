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


// like trim() helper from underscore.string:
// trims chars from beginning and end of str
function trim(str, chars) {
  // escape any regexp chars
  chars = chars.replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1');
  return str.replace(new RegExp('^' + chars + '+|' + chars + '+$', 'g'), '');
}


// https://developers.google.com/safe-browsing/v4/urls-hashing#canonicalization
function canonicalizeHost(host) {
  // Remove all leading and trailing dots
  var canonicalizedHost = trim(host, '.');

  // Replace consecutive dots with a single dot
  canonicalizedHost = canonicalizedHost.replace(new RegExp('[\.+]'), '.');

  // TODO: If the hostname can be parsed as an IP address,
  // normalize it to 4 dot-separated decimal values.
  // The client should handle any legal IP-address encoding,
  // including octal, hex, and fewer than four components

  // Lowercase the whole string
  canonicalizedHost = canonicalizedHost.toLowerCase();
  return canonicalizedHost;
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
