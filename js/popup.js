const {DOM, createClass, createElement} = require('react')
const {div} = DOM
const ReactDOM = require('react-dom')

let disabled = false
let days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
let months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const title = createClass({
  displayName: "Title",

  render: function() {
    let {disabled} = this.props
    let titleText = 'Blok is blocking tracker requests on this site.'
    if (disabled) {
      titleText = 'Parts of this site may be tracking your activity.'
    }

    return(
      div({ className: 'columns' },
        div({ className: 'title' },
          titleText
        )
      )
    )
  }
})

const hostReport = createClass({
  displayName: "Host Report",

  render: function() {
    const {hostReport} = this.props
    const date = new Date(hostReport.dateTime)
    const hostReportDateTimeString = days[date.getDay()] + ', ' + months[date.getMonth()] + ' ' + date.getDate()

    let reportText = ''
    if (hostReport.feedback == 'page-problem') {
      reportText = 'You reported a problem on this page on '
    } else if (hostReport.feedback == 'page-works') {
      reportText = 'You said this page works well on '
    } else {
      return false
    }
    reportText += hostReportDateTimeString + '.'

    return(
      div({ className: 'columns' },
        reportText
      )
    )
  }
})

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

browser.runtime.getBackgroundPage((bgPage) => {
  disabled = bgPage.topFrameHostDisabled
  ReactDOM.render(
    createElement(title, {disabled: disabled}),
    document.getElementById('title-row')
  )

  let pageHostReport = bgPage.topFrameHostReport
  if (pageHostReport.hasOwnProperty('feedback')) {
    ReactDOM.render(
      createElement(hostReport, {hostReport: pageHostReport}),
      document.getElementById('host-report-row')
    )
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
