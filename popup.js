browser.runtime.getBackgroundPage(function(backgroundPage) {
  var current_active_tab_id = backgroundPage.current_active_tab_id;
  var current_active_origin = backgroundPage.current_active_origin;
  var blocked_requests = backgroundPage.blocked_requests;
  var blocked_requests_count = blocked_requests[current_active_tab_id].length;
  var allowedHosts = backgroundPage.allowedHosts;
  var current_origin_disabled_index = allowedHosts.indexOf(current_active_origin);

  if (current_origin_disabled_index > -1) {
    document.querySelector("#blocking_summary").innerHTML = "Blocking disabled for this site";
    document.querySelector("#disable_btn").value = "Re-enable blocking for this site in this tab";
    document.querySelector("#disable_btn").addEventListener("click", function(){
      allowedHosts.splice(current_origin_disabled_index, 1);
      browser.storage.local.set({allowedHosts: allowedHosts});
      browser.tabs.reload(current_active_tab_id);
      window.close();
    });
  } else {
    document.querySelector("#blocked_requests_count").innerHTML = blocked_requests_count;
    document.querySelector("#disable_btn").addEventListener("click", function(){
      allowedHosts.push(current_active_origin);
      browser.storage.local.set({allowedHosts: allowedHosts});
      browser.tabs.reload(current_active_tab_id);
      document.querySelector("#disabled_reason_buttons").className = "";
      document.querySelector("#details").className = "row hide";
    });
  }
  for (reasonElement of document.querySelectorAll(".reason")) {
    reasonElement.addEventListener("click", function(event){
      // Send the reason to some metrics/telemetry/analytics pipeline
      /*
       * https://github.com/mozilla/testpilot/pull/952 would be:

      fetch('https://testpilot.firefox.com/api/metrics/ping/testpilottest',
        {
          method: 'POST',
          mode: 'cors',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
          })
        }
      )
      .then(resp => {
        console.log('metric ping success', resp)
      })
      .catch(e => {
        console.log('problem sending metrics ping', e)
      });


       * https://github.com/mozilla/testpilot/pull/1008 would be:


      document.getElementById('tp-proxy').contentWindow.postMessage({
        op: 'queueTelemetryPing',
        data: {
          subject: 'tracking-protection-experiment',
          data: {
            originTopHost: ..,
            reason: ..
          }
        }
      }, '*');

      */
      window.close();
    });
  }
});
