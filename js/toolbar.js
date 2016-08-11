function setDisabledUI () {
  document.querySelector('#title-blocking').className = 'hide'
  document.querySelector('#title-disabled').className = 'title'
  for (let feedbackElement of document.querySelectorAll('.feedback')) {
    feedbackElement.className = 'feedback hide'
  }
}

function setEnabledUI () {
  document.querySelector('#title-blocking').className = 'title'
  document.querySelector('#title-disabled').className = 'hide'
  for (let feedbackElement of document.querySelectorAll('.feedback')) {
    feedbackElement.className = 'feedback'
  }
}

browser.runtime.getBackgroundPage((bgPage) => {
  console.log('toolbar.js, bgPage.topFrameHostDisabled: ' + bgPage.topFrameHostDisabled)
  if (bgPage.topFrameHostDisabled) {
    setDisabledUI()
  } else {
    setEnabledUI()
  }
})

document.querySelector('#disable-link').addEventListener('click', function () {
  setDisabledUI()
  browser.runtime.sendMessage('disable')
})

document.querySelector('#re-enable-link').addEventListener('click', function () {
  setEnabledUI()
  browser.runtime.sendMessage('re-enable')
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
