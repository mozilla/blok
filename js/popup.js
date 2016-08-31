const React = require('react')
const ReactDOM = require('react-dom')
const {Provider} = require('react-redux')
const {Store} = require('react-chrome-redux')

const store = new Store({
  portName: 'blok'
})

let disabled = false

const Title = React.createFactory(React.createClass({
  displayName: 'Title',

  render: function () {
    let titleText = 'Blok is blocking tracker requests on this site.'
    if (this.props.disabled) {
      titleText = 'Parts of this site may be tracking your activity.'
    }

    return (
      <div className='columns'>
        <div className='title'>
          {titleText}
        </div>
      </div>
    )
  }
}))

const HostReport = React.createFactory(React.createClass({
  displayName: 'Host Report',

  render: function () {
    const {hostReport} = this.props
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
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
      <div className='columns'>{reportText}</div>
    )
  }
}))

const Feedback = React.createFactory(React.createClass({
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
      <div className='columns'>
        <a className='feedback-btn secondary expanded button' onClick={this.feedbackBtnHandler} data-feedback='page-works'>
          This page works well
        </a>
        <a className='feedback-btn expanded button' onClick={this.feedbackBtnHandler} data-feedback='page-problem'>
          Report a problem
        </a>
      </div>
    )
  }
}))

const Toggle = React.createFactory(React.createClass({
  render: function () {
    let {disabled, sendToggleMessage} = this.props
    let currentStatus = disabled ? 'disabled' : 'enabled'
    let labelText = 'Blok is ' + currentStatus + ' for this site.'
    let checked = disabled ? null : true

    return (
      <div className='row align-middle'>
        <div className='small-8 columns toggle-label-column'>
          {labelText}
        </div>
        <div className='small-4 columns toggle-column'>
          <span className='switch'>
            <input className='switch-input' id='enabledSwitch' type='checkbox' name='enabledSwitch' autoComplete='off' checked={checked} />
            <label className='switch-paddle' id='toggle-blok' htmlFor='enabledSwitch' onClick={sendToggleMessage}>
              <span className='show-for-sr'>
                'Toggle Blok'
              </span>
            </label>
          </span>
        </div>
      </div>
    )
  }
}))

const MainPanel = React.createFactory(React.createClass({
  render: function () {
    let {disabled, hostReport} = this.props
    let feedback = null
    let report = null

    let title = (
      <div className='row'>
        <Title disabled={disabled} />
      </div>
    )
    if (hostReport) {
      report = (
        <div className='row'>
          <HostReport hostReport={hostReport} />
        </div>
      )
    }
    if (!disabled) {
      feedback = (
        <div className='row align-center'>
          <Feedback showFeedbackPanel={this.props.showFeedbackPanel} />
        </div>
      )
    }
    let toggle = (
      <Toggle disabled={disabled} sendToggleMessage={sendToggleMessage} />
    )
    return (
      <div id='main-panel'>
        {title}
        {report}
        {feedback}
        <hr />
        {toggle}
      </div>
    )
  }
}))

const FeedbackBreakage = React.createFactory(React.createClass({
  render: function () {
    let breakage = this.props.breakage
    return (
      <div>
        <input className='breakage' type='radio' name='breakage' value={breakage} id={breakage} />
        <label htmlFor={breakage}>
          {breakage}
        </label>
      </div>
    )
  }
}))

const FeedbackPanel = React.createClass({
  render: function () {
    return (
      <div id='feedback-panel'>
        <div className='row panel-row'>
          <div className='small-1 columns feedback-panel-back-arrow' onClick={this.props.showMainPanel}>
            &lang;
          </div>
          <div className='small-11 columns feedback-panel-form'>
            <div className='row'>
              <h5>Thanks! We have noted you saw a problem with this page.</h5>
            </div>
            <div className='row'>
              <p>Please share any additional information about the problems you see.</p>
              <fieldset>
                <legend>I noticed a problem with:</legend>
                <FeedbackBreakage breakage='images' />
                <FeedbackBreakage breakage='video' />
                <FeedbackBreakage breakage='layout' />
                <FeedbackBreakage breakage='buttons' />
                <FeedbackBreakage breakage='other' />
              </fieldset>
            </div>
            <div className='row'>
              <label className='notes-label'>
                Why do you think Blok caused this problem?
                <textarea id='notes' rows='3' />
              </label>
            </div>
            <div className='row'>
              <a id='submit-btn' className='expanded button' onClick={this.props.sendBreakageMessage}>Submit</a>
            </div>
          </div>
        </div>
      </div>
    )
  }
})

const Popup = React.createClass({
  getInitialState: function () {
    return { showFeedbackPanel: false }
  },

  showFeedbackPanel: function () {
    this.setState({ showFeedbackPanel: true })
  },

  showMainPanel: function () {
    this.setState({ showFeedbackPanel: false })
  },

  render: function () {
    let {disabled, hostReport, sendToggleMessage} = this.props

    if (this.state.showFeedbackPanel) {
      return (
        <FeedbackPanel showMainPanel={this.showMainPanel} sendBreakageMessage={this.props.sendBreakageMessage} />
      )
    } else {
      return (
        <MainPanel disabled={disabled} hostReport={hostReport} sendToggleMessage={sendToggleMessage} showFeedbackPanel={this.showFeedbackPanel} />
      )
    }
  }
})

function sendToggleMessage () {
  if (disabled) {
    browser.runtime.sendMessage('re-enable')
    store.dispatch({ type: 'ENABLE_BLOCKING' })
  } else {
    browser.runtime.sendMessage('disable')
    store.dispatch({ type: 'DISABLE_BLOCKING' })
  }
  window.close()
}

function sendBreakageMessage () {
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
}

browser.runtime.getBackgroundPage((bgPage) => {
  disabled = bgPage.topFrameHostDisabled
  let pageHostReport = bgPage.topFrameHostReport

  ReactDOM.render(
    <Popup disabled={disabled} hostReport={pageHostReport} sendToggleMessage={sendToggleMessage} sendBreakageMessage={sendBreakageMessage} />,
    document.getElementById('popup')
  )
})
/*
ReactDOM.render(
  <Provider store={store}>
    <Popup />
  </Provider>,
  document.getElementById('popup')
)
*/
