browser.runtime.onMessage.addListener(function (runtimeMessage) {
  if (runtimeMessage.hasOwnProperty('origin-disabled')) {
    document.querySelector('#title-blocking').className = 'hide'
    document.querySelector('#title-disabled').className = 'title'

    for (let feedbackElement of document.querySelectorAll('.feedback')) {
      feedbackElement.className = 'feedback hide'
    }

    if (runtimeMessage.hasOwnProperty('reason-given') && runtimeMessage['reason-given'] != null) {
      document.querySelector('#disable-reason-thankyou').className = ''
    } else {
      document.querySelector('#disable-reasons').className = ''
    }
  }
})

document.querySelector('#disable-link').addEventListener('click', function () {
  browser.runtime.sendMessage('disable')
})

document.querySelector('#re-enable-link').addEventListener('click', function () {
  browser.runtime.sendMessage('re-enable')
})

document.querySelector('#close-btn').addEventListener('click', function () {
  browser.runtime.sendMessage('close-toolbar')
})

for (let feedbackBtn of document.querySelectorAll('.feedback-btn')) {
  feedbackBtn.addEventListener('click', function (event) {
    var feedback = event.target.dataset.feedback
    browser.runtime.sendMessage({'feedback': feedback})
    for (let feedbackDiv of document.querySelectorAll('.feedback')) {
      feedbackDiv.className = 'hide'
    }
    document.querySelector('#feedback-' + feedback).className = 'feedback'
  })
}
