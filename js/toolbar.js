browser.runtime.onMessage.addListener(function (runtimeMessage) {
  var blockedCount, blockedForm, allowedCount;
  if (runtimeMessage.hasOwnProperty('origin-disabled')) {
    allowedCount = runtimeMessage.allowed_requests.length;

    document.querySelector('#title-blocking').className = 'hide';
    document.querySelector('#title-disabled').className = 'title';
    document.querySelector('#title-allowed-count').innerHTML = allowedCount;

    for (feedbackElement of document.querySelectorAll('.feedback')) {
      feedbackElement.className = 'feedback hide';
    }

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

document.querySelector('#disable-link').addEventListener('click', function (event) {
  browser.runtime.sendMessage("disable");
});

document.querySelector('#re-enable-link').addEventListener('click', function (event) {
  browser.runtime.sendMessage("re-enable");
});

for (feedbackBtn of document.querySelectorAll('.feedback-btn')) {
  feedbackBtn.addEventListener('click', function (event) {
    var feedback = event.target.dataset.feedback;
    browser.runtime.sendMessage({"feedback": feedback});
    document.querySelector('.feedback').className = 'hide';
    document.querySelector('#feedback-' + feedback).className = 'feedback';
  });
}
