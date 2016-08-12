var feedbackModalOverlay
var toolbarFrame
var toolbarSpacer

feedbackModalOverlay = document.getElementById('blok-feedback-modal-overlay')
toolbarFrame = document.getElementById('blok-toolbar-iframe')
toolbarSpacer = document.getElementById('blok-toolbar-spacer')

browser.runtime.onMessage.addListener(function (message) {
  // Any message indicates Blok has something to show
  if (!toolbarFrame) {
    toolbarSpacer = document.createElement('div')
    toolbarSpacer.setAttribute('id', 'blok-toolbar-spacer')
    toolbarSpacer.setAttribute('class', 'blok-toolbar-spacer')
    var bodyEl = document.getElementsByTagName('body')[0]
    bodyEl.insertBefore(toolbarSpacer, bodyEl.firstChild)

    toolbarFrame = document.createElement('iframe')
    toolbarFrame.setAttribute('id', 'blok-toolbar-iframe')
    toolbarFrame.setAttribute('class', 'blok-toolbar-iframe')
    toolbarFrame.setAttribute('src', browser.runtime.getURL('html/popup.html'))
    document.body.appendChild(toolbarFrame)
  }

  if (!feedbackModalOverlay) {
    feedbackModalOverlay = document.createElement('div')
    feedbackModalOverlay.setAttribute('class', 'blok-feedback-modal-overlay blok-hide')

    let feedbackFrame = document.createElement('iframe')
    feedbackFrame.setAttribute('id', 'blok-feedback-iframe')
    feedbackFrame.setAttribute('class', 'blok-feedback-iframe')
    feedbackFrame.setAttribute('src', browser.runtime.getURL('html/feedback.html'))

    feedbackModalOverlay.appendChild(feedbackFrame)
    document.body.appendChild(feedbackModalOverlay)
  }

  // page-problem message should show modal for feedback
  if (message.feedback && message.feedback === 'page-problem') {
    feedbackModalOverlay.setAttribute('class', 'blok-feedback-modal-overlay')
    document.body.appendChild(feedbackModalOverlay)
    console.log('message.origin: ' + message.origin)
    feedbackModalOverlay.querySelector('#blok-feedback-iframe').contentDocument.querySelector('#feedback-title-site-name').textContent = message.origin
  } else if (message.feedback && message.feedback === 'page-works') {
    feedbackModalOverlay.remove()
  }

  if (message === 'close-toolbar') {
    toolbarFrame.remove()
    toolbarSpacer.remove()
  }

  if (message === 'close-feedback') {
    feedbackModalOverlay.remove()
  }
})
