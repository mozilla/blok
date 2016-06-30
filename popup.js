browser.runtime.getBackgroundPage(function (backgroundPage) {
  alert('Blocked ' + backgroundPage.blocked_requests.length + ' requests')
})
