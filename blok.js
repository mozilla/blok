var blocklist_url = 'disconnect-blocklist.json';
var blocklist = {};

var current_active_tab_id;
var current_active_origin;
var blocked_requests = {};
var total_exec_time = {};
var disabled_tabs = [];


function restartBlok(tabID) {
  chrome.pageAction.hide(tabID);
  blocked_requests[tabID] = [];
  total_exec_time[tabID] = 0;
}


function getJSON(url) {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open('get', url, true);
    xhr.responseType = 'json';
    xhr.onload = function () {
      var status = xhr.status;
      if (status == 200) {
        resolve(xhr.response);
      } else {
        reject(status);
      }
    };
    xhr.send();
  });
}


function blockTrackerRequests(requestDetails) {
    var blockTrackerRequestsStart = Date.now();
    var current_tab_disabled_index = disabled_tabs.indexOf(current_active_tab_id);
    var originTopHost = new URL(requestDetails.originUrl).host.split('.').slice(-2).join('.');
    var requestTopHost = new URL(requestDetails.url).host.split('.').slice(-2).join('.');

    // When the user goes to a new domain,
    // remove the tabID from disabled_tabs, and reset active origin
    // so protection is re-enabled in the tab for the new domain
    if (originTopHost != current_active_origin) {
      disabled_tabs.splice(current_tab_disabled_index, 1);
      current_active_origin = originTopHost;
      current_tab_disabled_index = disabled_tabs.indexOf(current_active_tab_id);
    }

    // Allow request if protection for this tab has been disabled
    if (current_tab_disabled_index > -1) {
      console.log("Protection disabled for this tab; allowing request.");
      return {};
    }

    // Allow request originating from Firefox new tab/window pages
    if (requestDetails.originUrl.includes('moz-nullprincipal')) {
        total_exec_time[current_active_tab_id] += Date.now() - blockTrackerRequestsStart;
        return {};
    }

    // Allow requests to 3rd-party domains NOT in the block-list
    if (!blocklist.hasOwnProperty(requestTopHost)) {
        total_exec_time[current_active_tab_id] += Date.now() - blockTrackerRequestsStart;
        return {};
    }

    // Block if the request url top host doesn't match origin url top host (i.e., 3rd-party)
    if (requestTopHost != originTopHost) {
      console.log("requestTopHost: " + requestTopHost + " does not match originTopHost: " + originTopHost + ". Blocking request.");
      blocked_requests[current_active_tab_id].push(requestTopHost);
      console.log("blocked_requests: " + blocked_requests[current_active_tab_id]);

      total_exec_time[current_active_tab_id] += Date.now() - blockTrackerRequestsStart;
      console.log("total_exec_time: " + total_exec_time[current_active_tab_id]);

      return {cancel: true};
    }
}


getJSON(blocklist_url).then(function(data) {
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
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      current_active_tab_id = tabs[0].id;
      restartBlok(current_active_tab_id);
      if (tabID == tabs[0].id) {
        chrome.pageAction.show(current_active_tab_id);
      }
    });
  }
});
