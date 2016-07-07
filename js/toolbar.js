chrome.runtime.onMessage.addListener(function (runtimeMessage) {
  var blockedCount, blockedForm;
  if (runtimeMessage.hasOwnProperty('origin-disabled')) {
    document.querySelector('#title-blocking').className = 'hide';
    document.querySelector('#title-disabled').className = 'title';
    document.querySelector('#title-origin').innerHTML = runtimeMessage['origin-disabled'];
    document.querySelector('#disable').className = 'hide';
    if (runtimeMessage.hasOwnProperty('reason-given') && runtimeMessage['reason-given'] != null) {
      document.querySelector('#disable-reason-thankyou').className = '';
    } else {
      document.querySelector('#disable-reasons').className = '';
    }
  } else {
    blockedCount = runtimeMessage.blocked_requests.length;
    document.querySelector('#title-block-count').innerHTML = blockedCount;
  }
});

document.querySelector('#disable-btn').addEventListener('click', function (event) {
  chrome.runtime.sendMessage("disable");
});

document.querySelector('#re-enable-btn').addEventListener('click', function (event) {
  chrome.runtime.sendMessage("re-enable");
});

for (closeBtn of document.querySelectorAll('.close-btn')) {
  closeBtn.addEventListener('click', function (event) {
    chrome.runtime.sendMessage("close-toolbar");
  });
}

for (reasonBtn of document.querySelectorAll('.reason')) {
  reasonBtn.addEventListener('click', function (event) {
    chrome.runtime.sendMessage({"disable-reason": event.target.text});
    document.querySelector('#disable-reasons').className = 'hide';
    document.querySelector('#disable-reason-thankyou').className = '';
  });
}
