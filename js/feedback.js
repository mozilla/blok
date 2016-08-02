for (let closeBtn of document.querySelectorAll('.close-feedback')) {
  closeBtn.addEventListener('click', function () {
    browser.runtime.sendMessage('close-feedback')
  })
}

document.querySelector('.submit').addEventListener('click', function () {
  let breakageChecked = document.querySelector('input:checked')
  if (breakageChecked !== null) {
    let message = {
      'breakage': breakageChecked.value,
      'notes': document.querySelector('textarea#notes').textContent
    }
    browser.runtime.sendMessage(message)
    browser.runtime.sendMessage('close-feedback')
  } else {
    document.querySelector('#breakage-required').className = ''
  }
})
