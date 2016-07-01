chrome.runtime.onMessage.addListener(function (runtimeMessage) {
  var blockedCount = runtimeMessage.blocked_requests.length;
  document.querySelector('#block-count').innerHTML = blockedCount;
});

document.querySelector('#disable-btn').addEventListener('click', function (event) {
  chrome.runtime.sendMessage("disable")
  document.querySelector('#disable-reasons').className = "";
  document.querySelector('#disable').className = "hide";
});

for (reasonBtn of document.querySelectorAll('.reason')) {
  reasonBtn.addEventListener('click', function (event) {
  });
}
