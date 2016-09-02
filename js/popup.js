let disabled = false
let days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
let months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function show (querySelector) {
  for (let element of document.querySelectorAll(querySelector)) {
    element.classList.remove('hide')
  }
}

function hide (querySelector) {
  for (let element of document.querySelectorAll(querySelector)) {
    element.classList.add('hide')
  }
}

function showMainPanel () {
  show('#main-panel')
  hide('#feedback-panel')
}

function showFeedbackPanel () {
  hide('#main-panel')
  show('#feedback-panel')
}

function showHostReport (hostReport) {
  let date = new Date(hostReport.dateTime)
  let hostReportDateTimeString = days[date.getDay()] + ', ' + months[date.getMonth()] + ' ' + date.getDate()
  document.querySelector('.host-report-date').innerText = ' on ' + hostReportDateTimeString
  show('.' + hostReport.feedback + '-host-report')
  show('.host-report-row')
}

function setDisabledUI () {
  hide('.blocking')
  show('.disabled')
  document.querySelector('#enabledSwitch').removeAttribute('checked')
}

function setEnabledUI () {
  hide('.disabled')
  show('.blocking')
  document.querySelector('#enabledSwitch').setAttribute('checked', true)
}

function updateFromBackgroundPage (bgPage) {
  disabled = bgPage.topFrameHostDisabled
  if (disabled) {
    setDisabledUI()
  } else {
    setEnabledUI()
  }
  let hostReport = bgPage.topFrameHostReport
  if (hostReport.hasOwnProperty('feedback')) {
    showHostReport(hostReport)
  }
}

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
      showFeedbackPanel()
    } else {
      window.close()
    }
  })
}

document.querySelector('.feedback-panel-back-arrow').addEventListener('click', () => {
  showMainPanel()
})

document.querySelector('#submit-btn').addEventListener('click', function () {
  let breakageChecked = document.querySelector('input.breakage:checked')
  if (breakageChecked !== null) {
    let message = {
      'breakage': breakageChecked.value,
      'notes': document.querySelector('textarea#notes').value
    }
    browser.runtime.sendMessage(message)
    window.close()
  } else {
    document.querySelector('#breakage-required').className = ''
  }
})

browser.runtime.getBackgroundPage(updateFromBackgroundPage)
