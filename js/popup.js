function hideClass (className) {
  for (let blockingElement of document.querySelectorAll('.' + className)) {
    blockingElement.className = className + ' hide'
  }
}

function showClass (className) {
  for (let disabledElement of document.querySelectorAll('.' + className)) {
    disabledElement.className = className
  }
}

function setDisabledUI () {
  hideClass('blocking')
  showClass('disabled')
}

function setEnabledUI () {
  hideClass('disabled')
  showClass('blocking')
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
