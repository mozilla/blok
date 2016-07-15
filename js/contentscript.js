var toolbarFrame;

if (window.parent == window) {
  toolbarFrame = document.getElementById('blok-toolbar-iframe');

  browser.runtime.onMessage.addListener(function (message) {
    if (message == "close-toolbar") {
      document.querySelector('#blok-toolbar-spacer').remove();
      toolbarFrame.remove();
      return;
    }

    if (!toolbarFrame) {
      var toolbarSpacer = document.createElement("div");
      toolbarSpacer.setAttribute("id", "blok-toolbar-spacer");
      toolbarSpacer.setAttribute("class", "blok-toolbar-spacer");
      var bodyEl = document.getElementsByTagName("body")[0];
      bodyEl.insertBefore(toolbarSpacer, bodyEl.firstChild);

      toolbarFrame = document.createElement("iframe");
      toolbarFrame.setAttribute("id", "blok-toolbar-iframe");
      toolbarFrame.setAttribute("class", "blok-toolbar-iframe");
      toolbarFrame.setAttribute("src", browser.runtime.getURL('toolbar.html'));
      document.body.appendChild(toolbarFrame);
    }
  });
}
