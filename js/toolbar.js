browser.runtime.onMessage.addListener(function (runtimeMessage) {
  var allowedEntitiesCount;
  var blockedEntitiesCount;
  if (runtimeMessage.hasOwnProperty('origin-disabled')) {
    allowedEntitiesCount = runtimeMessage.allowed_entities.length;

    document.querySelector('#title-blocking').className = 'hide';
    document.querySelector('#title-disabled').className = 'title';
    document.querySelector('#title-allowed-count').innerHTML = allowedEntitiesCount;

    for (let feedbackElement of document.querySelectorAll('.feedback')) {
      feedbackElement.className = 'feedback hide';
    }

    if (runtimeMessage.hasOwnProperty('reason-given') && runtimeMessage['reason-given'] != null) {
      document.querySelector('#disable-reason-thankyou').className = '';
    } else {
      document.querySelector('#disable-reasons').className = '';
    }
  } else {
    blockedEntitiesCount = runtimeMessage.blocked_entities.length;
    document.querySelector('#title-block-count').innerHTML = blockedEntitiesCount;
  }
});

document.querySelector('#disable-link').addEventListener('click', function () {
  browser.runtime.sendMessage('disable');
});

document.querySelector('#re-enable-link').addEventListener('click', function () {
  browser.runtime.sendMessage('re-enable');
});

for (let feedbackBtn of document.querySelectorAll('.feedback-btn')) {
  feedbackBtn.addEventListener('click', function (event) {
    var feedback = event.target.dataset.feedback;
    browser.runtime.sendMessage({'feedback': feedback});
    for (let feedbackDiv of document.querySelectorAll('.feedback')) {
      feedbackDiv.className = 'hide';
    }
    document.querySelector('#feedback-' + feedback).className = 'feedback';
  });
}
