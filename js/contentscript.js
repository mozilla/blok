var toolbarFrame;

if (window.parent == window) {
  toolbarFrame = document.getElementById('blok-toolbar-iframe');

  browser.runtime.onMessage.addListener(function (message) {
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

    if (message.feedback && message.feedback == "page-problem") {
      let feedbackModal = document.createElement("div");
      feedbackModal.setAttribute("id", "breakage-modal");
      feedbackModal.setAttribute("class", "reveal");
      feedbackModal.setAttribute("data-reveal", true);
      feedbackModal.innerHTML = `
        <div class="top-bar">
          <div class="top-bar-left">
            Blok: Report Problem
          </div>
          <div class="top-bar-right">
            <button class="close-button" data-close aria-label="Close modal" type="button">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
        </div>
        <div class="row">
          <fieldset>
            <legend>What's wrong with the page?</legend>
            <input type="radio" name="breakage" value="images" id="broken-images">
            <label for="broken-images">Images</label>
            <input type="radio" name="breakage" value="video" id="broken-video">
            <label for="broken-video">Video</label>
            <input type="radio" name="breakage" value="layout" id="broken-layout">
            <label for="broken-layout">Layout</label>
            <input type="radio" name="breakage" value="buttons" id="broken-buttons">
            <label for="broken-buttons">Buttons</label>
            <input type="radio" name="breakage" value="other" id="broken-other">
            <label for="broken-other">Something else</label>
          </fieldset>
          <label>
            Tell us about it:
            <textarea rows="3"></textarea>
          </label>
        </div>
        <div class="row text-right">
          <input type="button" class="button" value="Cancel" data-close>
          <input type="button" class="button" value="Submit">
        </div>
      `;

      document.body.appendChild(feedbackModal);

      let modal = new Foundation.Reveal(jQuery('#breakage-modal'));
      modal.open();
    }
  });
}
