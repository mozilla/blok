var disabled = false

function hideClass (className) {
  for (let element of document.querySelectorAll('.' + className)) {
    element.className = className + ' hide'
  }
}

function showClass (className) {
  for (let element of document.querySelectorAll('.' + className)) {
    element.className = className
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
    if (feedback === 'page-problem') {
      document.querySelector('#main-panel').className = 'hide'
      document.querySelector('#feedback-panel').className = ''
    } else {
      window.close()
    }
  })
}

function showMainPanel () {
  document.querySelector('#main-panel').className = ''
  document.querySelector('#feedback-panel').className = 'hide'
}

document.querySelector('.feedback-panel-back-arrow').addEventListener('click', () => {
  showMainPanel()
})

document.querySelector('#submit-btn').addEventListener('click', function () {
  let breakageChecked = document.querySelector('input.breakage:checked')
  if (breakageChecked !== null) {
    let message = {
      'breakage': breakageChecked.value,
      'notes': document.querySelector('textarea#notes').textContent
    }
    browser.runtime.sendMessage(message)
    window.close()
  } else {
    document.querySelector('#breakage-required').className = ''
  }
})
