for (let closeBtn of document.querySelectorAll('.close-feedback')) {
  closeBtn.addEventListener('click', function () {
    browser.runtime.sendMessage('close-feedback');
  });
}

document.querySelector('.submit').addEventListener('click', function() {
  let message = {
    'breakage': document.querySelector('input:checked').value,
    'notes': document.querySelector('textarea#notes').textContent
  };
  browser.runtime.sendMessage(message);
  browser.runtime.sendMessage('close-feedback');
});
