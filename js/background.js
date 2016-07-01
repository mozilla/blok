var blocklist = {};
var allowedHosts = [];

// HACK: Start with active tab id = 1 when browser starts
var current_active_tab_id = 1;
var current_active_origin;
var blocked_requests = {};
var total_exec_time = {};


function restartBlokForTab(tabID) {
  blocked_requests[tabID] = [];
  total_exec_time[tabID] = 0;
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
      allowedHosts = item;
    }
    resolve(allowedHosts);
  });
});


function blockTrackerRequests(requestDetails) {
    var blockTrackerRequestsStart = Date.now();
    var requestTabID = requestDetails.tabId;
    var originTopHost, requestTopHost;
    var current_origin_disabled_index

    // Start with all origin flags false
    var currentOriginDisabled = false;
    var firefoxOrigin = false;
    var newOrigin = false;

    var requestHostInBlocklist = false;

    if (typeof requestDetails.originUrl == "undefined") {
      return {}
    }

    originTopHost = new URL(requestDetails.originUrl).host.split('.').slice(-2).join('.');
    current_active_origin = originTopHost;
    current_origin_disabled_index = allowedHosts.indexOf(current_active_origin);
    
    // Determine all origin flags
    currentOriginDisabled = current_origin_disabled_index > -1;
    firefoxOrigin = (typeof originTopHost !== "undefined" && originTopHost.includes('moz-nullprincipal'));
    newOrigin = originTopHost == '';

    // Allow request if the origin has been added to allowedHosts
    if (currentOriginDisabled) {
      console.log("Protection disabled for this site; allowing request.");
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
