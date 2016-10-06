let disabled = false
let days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
let months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

let breakageChecked = null

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

function showFeedbackPanel () {
  hide('#main-panel')
  show('#feedback-panel')
  hide('#breakage-notes-panel')
}

function showBreakageNotesPanel () {
  hide('#main-panel')
  hide('#feedback-panel')
  show('#breakage-notes-panel')
}

// grabbed from http://stackoverflow.com/questions/13203518/javascript-date-suffix-formatting
// for clean date formatting
// TODO: find an alternate solution if we ever L10N
function ordinal (date) {
  if (date > 20 || date < 10) {
    switch (date % 10) {
      case 1:
        return 'st'
      case 2:
        return 'nd'
      case 3:
        return 'rd'
    }
  }
  return 'th'
}

function showHostReport (hostReport) {
  let date = new Date(hostReport.dateTime)
  let hostReportDateTimeString = days[date.getDay()] + ', ' + months[date.getMonth()] + ' ' + date.getDate() + ordinal(date.getDate())
  let hostReportType = '.' + hostReport.feedback + '-host-report'
  document.querySelector(hostReportType + ' .host-report-date').innerText = ' ' + hostReportDateTimeString
  hide('.host-report')
  show(hostReportType)
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
  // timeout set so animation completes prior to close
  setTimeout(() => {
    window.close()
  }, 500)
})

for (let feedbackBtn of document.querySelectorAll('.feedback-btn')) {
  feedbackBtn.addEventListener('click', function (event) {
    let feedback = event.target.dataset.feedback
    let hostReport = {
      'feedback': feedback,
      'dateTime': Date.now()
    }
    showHostReport(hostReport)
    browser.runtime.sendMessage(hostReport)
    if (feedback === 'page-problem') {
      showFeedbackPanel()
    } else {
      window.close()
    }
  })
}

for (let submitBtn of document.querySelectorAll('.submit-btn')) {
  submitBtn.addEventListener('click', function (ev) {
    if (ev.target.id === 'submit-breakage-btn') {
      breakageChecked = document.querySelector('input.breakage:checked')
      if (breakageChecked !== null) {
        let message = {
          'breakage': breakageChecked.value,
          'notes': document.querySelector('textarea#notes').value
        }
        browser.runtime.sendMessage(message)
        showBreakageNotesPanel()
      } else {
        document.querySelector('#breakage-required').className = ''
      }
    } else if (ev.target.id === 'submit-notes-btn') {
      let notes = document.querySelector('textarea#notes').value
      if (notes !== null) {
        let message = {
          'breakage': breakageChecked.value,
          'notes': notes
        }
        browser.runtime.sendMessage(message)
      }
      window.close()
    }
  })
}

browser.runtime.getBackgroundPage(updateFromBackgroundPage)
