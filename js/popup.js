var disabled = false

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
  document.querySelector('#enabledSwitch').removeAttribute('checked')
}

function setEnabledUI () {
  hideClass('disabled')
  showClass('blocking')
  document.querySelector('#enabledSwitch').setAttribute('checked', true)
}

browser.runtime.getBackgroundPage((bgPage) => {
  disabled = bgPage.topFrameHostDisabled
  if (disabled) {
    setDisabledUI()
  } else {
    setEnabledUI()
  }
})

document.querySelector('#toggle-blok').addEventListener('click', () => {
  if (disabled) {
    browser.runtime.sendMessage('re-enable')
  } else {
    browser.runtime.sendMessage('disable')
  }
  window.close()
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
