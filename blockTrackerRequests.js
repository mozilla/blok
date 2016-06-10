var blocklist_url = 'disconnect-blocklist.json';

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

var blocklist;

getJSON(blocklist_url).then(function(data) {
  // do something with the data ... store to global var?
  blocklist = data;
});

function blockTrackerRequests(requestDetails) {
    // Allow all requests originating from new tab/window pages
    if (requestDetails.originUrl.includes('moz-nullprincipal')) {
        return {};
    }
    // Check if url is in the flat list of blocked domains
    var requestURL = new URL(requestDetails.url);
    if (requestDetails.url.includes('facebook.com') &&
        !requestDetails.originUrl.includes('facebook.com')) {
            return {cancel: true};
    }
}

chrome.webRequest.onBeforeRequest.addListener(
    blockTrackerRequests,
    {urls:["*://*/*"]},
    ["blocking"]
);
