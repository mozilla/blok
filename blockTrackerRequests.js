var blocklist_url = 'disconnect-blocklist.json';
var blocklist = {};

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
    // Allow all requests originating from new tab/window pages
    if (requestDetails.originUrl.includes('moz-nullprincipal')) {
        return {};
    }
    // First check if the request url top host is in the blocklist at all
    var requestTopHost = new URL(requestDetails.url).host.split('.').slice(-2).join('.');
    if (!blocklist.hasOwnProperty(requestTopHost)) {
        return {};
    }
    console.log("requestTopHost: " + requestTopHost + " is in the blocklist. Check if this is a 3rd-party request ...");

    // Block if the request url top host doesn't match origin url top host (i.e., 3rd-party)
    var originTopHost = new URL(requestDetails.originUrl).host.split('.').slice(-2).join('.');
    if (requestTopHost != originTopHost) {
      console.log("requestTopHost: " + requestTopHost + " does not match originTopHost: " + originTopHost + ". Blocking request.");
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
