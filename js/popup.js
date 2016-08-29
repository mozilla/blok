const {DOM, createFactory, createClass, createElement} = require('react')
const {div, a, span, input, label, hr, p, fieldset, legend} = DOM
const ReactDOM = require('react-dom')

let disabled = false
let days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
let months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const Title = createFactory(createClass({
  displayName: 'Title',

  render: function () {
    let {disabled} = this.props
    let titleText = 'Blok is blocking tracker requests on this site.'
    if (disabled) {
      titleText = 'Parts of this site may be tracking your activity.'
    }

    return (
      div({ className: 'columns' },
        div({ className: 'title' },
          titleText
        )
      )
    )
  }
}))

const HostReport = createFactory(createClass({
  displayName: 'Host Report',

  render: function () {
    const {hostReport} = this.props
    const date = new Date(hostReport.dateTime)
    const hostReportDateTimeString = days[date.getDay()] + ', ' + months[date.getMonth()] + ' ' + date.getDate()

    let reportText = ''
    if (hostReport.feedback === 'page-problem') {
      reportText = 'You reported a problem on this page on '
    } else if (hostReport.feedback === 'page-works') {
      reportText = 'You said this page works well on '
    } else {
      return false
    }
    reportText += hostReportDateTimeString + '.'

    return (
      div({ className: 'columns' },
        reportText
      )
    )
  }
}))

const Feedback = createFactory(createClass({
  feedbackBtnHandler: function (event) {
    let feedback = event.target.dataset.feedback
    browser.runtime.sendMessage({'feedback': feedback})
    if (feedback === 'page-problem') {
      this.props.showFeedbackPanel()
    } else {
      window.close()
    }
  },

  render: function () {
    return (
      div({ className: 'columns' },
        a(
          {
            className: 'feedback-btn secondary expanded button',
            onClick: this.feedbackBtnHandler,
            'data-feedback': 'page-works'
          },
          'This page works well'
        ),
        a(
          {
            className: 'feedback-btn expanded button',
            onClick: this.feedbackBtnHandler,
            'data-feedback': 'page-problem'
          },
          'Report a problem'
        )
      )
    )
  }
}))

const Toggle = createFactory(createClass({
  /*
  componentDidUpdate: function () {
    if (this.props.disabled) {
      this._input.removeAttribute('checked')
    } else {
      this._input.setAttribute('checked', true)
    }
  },
  */

  render: function () {
    let {disabled, sendToggleMessage} = this.props
    let currentStatus = disabled ? 'disabled' : 'enabled'
    let labelText = 'Blok is ' + currentStatus + ' for this site.'

    return div(
      {className: 'row align-middle'},
      div(
        {className: 'small-8 columns toggle-label-column'},
        labelText
      ),
      div(
        {className: 'small-4 columns toggle-column'},
        span(
          { className: 'switch' },
          input({
            className: 'switch-input',
            id: 'enabledSwitch',
            type: 'checkbox',
            name: 'enabledSwitch',
            autoComplete: 'off',
            checked: disabled ? null : true
          }),
          label(
            {
              className: 'switch-paddle',
              id: 'toggle-blok',
              htmlFor: 'enabledSwitch',
              onClick: sendToggleMessage
            },
            span(
              { className: 'show-for-sr' },
              'Toggle Blok'
            )
          )
        )
      )
    )
  }
}))

const MainPanel = createFactory(createClass({
  render: function () {
    let {disabled, hostReport} = this.props

    let title = div({className: 'row'},
      Title({ disabled: disabled })
    )
    let report = div({className: 'row'},
      HostReport({ hostReport: hostReport })
    )
    let feedback = disabled ? null : div({ className: 'row align-center' }, Feedback({ showFeedbackPanel: this.props.showFeedbackPanel }))
    let toggle = Toggle({ disabled: disabled, sendToggleMessage: sendToggleMessage })
    return div(
      {id: 'main-panel'},
      title, report, feedback, hr(), toggle
    )
  }
}))

const FeedbackPanel = createClass({
  render: function () {
    return div(
      {id: 'feedback-panel'},
      div(
        {className: 'row panel-row'},
        div(
          {className: 'small-1 columns feedback-panel-back-arrow'},
          '\u2329'
        ),
        div(
          {className: 'small-11 columns feedback-panel-form'},
          div(
            {className: 'row'},
            'Thanks! We have noted you saw a problem with this page.'
          ),
          div(
            {className: 'row'},
            p(
              {},
              'Please share any additional information about the problems you see.'
            ),
            fieldset(
              {},
              legend(
                {},
                'I noticed a problem with:'
              )
            )
          )
        )
      )
    )
  }
})

const Popup = createClass({
  getInitialState: function () {
    return { showFeedbackPanel: false }
  },

  showFeedbackPanel: function () {
    this.setState({ showFeedbackPanel: true })
  },

  render: function () {
    let {disabled, hostReport, sendToggleMessage} = this.props
    let mainPanel = null
    let feedbackPanel = null

    if (this.state.showFeedbackPanel) {
      feedbackPanel = createElement(FeedbackPanel, {})
    } else {
      mainPanel = createElement(MainPanel,
        {
          disabled: disabled,
          hostReport: hostReport,
          sendToggleMessage: sendToggleMessage,
          showFeedbackPanel: this.showFeedbackPanel
        }
      )
    }

    return div({}, mainPanel, feedbackPanel)
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

function sendToggleMessage () {
  if (disabled) {
    browser.runtime.sendMessage('re-enable')
  } else {
    browser.runtime.sendMessage('disable')
  }
  window.close()
}

browser.runtime.getBackgroundPage((bgPage) => {
  disabled = bgPage.topFrameHostDisabled
  let pageHostReport = bgPage.topFrameHostReport

  ReactDOM.render(
    createElement(Popup,
      {
        disabled: disabled,
        hostReport: pageHostReport,
        sendToggleMessage: sendToggleMessage
      }
    ),
    document.getElementById('popup')
  )
})

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
