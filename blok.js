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
    console.log("requestTabID: " + requestTabID);
    var originTopHost, requestTopHost;
    if (requestDetails.hasOwnProperty('originUrl')) {
      originTopHost = new URL(requestDetails.originUrl).host.split('.').slice(-2).join('.');
    }
    var requestTopHost = new URL(requestDetails.url).host.split('.').slice(-2).join('.');

    current_active_origin = originTopHost;
    var current_origin_disabled_index = allowedHosts.indexOf(current_active_origin);

    // Allow request if the origin has been added to allowedHosts
    if (current_origin_disabled_index > -1) {
      console.log("Protection disabled for this site; allowing request.");
      return {};
    }

    // Allow request originating from Firefox new tab/window pages
    if (requestDetails.originUrl.includes('moz-nullprincipal')) {
        total_exec_time[requestTabID] += Date.now() - blockTrackerRequestsStart;
        return {};
    }

    // Allow requests to 3rd-party domains NOT in the block-list
    if (!blocklist.hasOwnProperty(requestTopHost)) {
        total_exec_time[requestTabID] += Date.now() - blockTrackerRequestsStart;
        return {};
    }

    // Block if the request url top host doesn't match origin url top host (i.e., 3rd-party)
    if (requestTopHost != originTopHost) {
      console.log("requestTopHost: " + requestTopHost + " does not match originTopHost: " + originTopHost + ". Blocking request.");
      blocked_requests[requestTabID].push(requestTopHost);
      console.log("blocked " + blocked_requests[requestTabID].length + " requests: " + blocked_requests[requestTabID]);

      total_exec_time[requestTabID] += Date.now() - blockTrackerRequestsStart;
      console.log("total_exec_time: " + total_exec_time[requestTabID]);
      chrome.tabs.executeScript(requestTabID, {code: 'alert(\'Blocked \' + backgroundPage.blocked_requests.length + \' requests\')'});

      return {cancel: true};
    }
}


Promise.all([getBlocklistJSON, getAllowedHosts]).then(function(values) {
  chrome.webRequest.onBeforeRequest.addListener(
      blockTrackerRequests,
      {urls:["*://*/*"]},
      ["blocking"]
  );
});


chrome.tabs.onActivated.addListener(function(activeInfo) {
  current_active_tab_id = activeInfo.tabId;
});

chrome.tabs.onUpdated.addListener(function(tabID, changeInfo) {
  if (changeInfo.status == "loading") {
    restartBlokForTab(tabID);
  }
});
