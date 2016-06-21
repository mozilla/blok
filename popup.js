browser.runtime.getBackgroundPage(function(backgroundPage) {
  var current_active_tab_id = backgroundPage.current_active_tab_id;
  var blocked_requests = backgroundPage.blocked_requests;
  var blocked_requests_count = blocked_requests[current_active_tab_id].length;
  var disabled_tabs = backgroundPage.disabled_tabs;
  var current_tab_disabled_index = disabled_tabs.indexOf(current_active_tab_id);

  if (current_tab_disabled_index > -1) {
    document.querySelector("#blocking_summary").innerHTML = "Blocking disabled for this tab";
    document.querySelector("#disable_btn").value = "Re-enable blocking for this tab";
    document.querySelector("#disable_btn").addEventListener("click", function(){
      disabled_tabs.splice(current_tab_disabled_index, 1);
      browser.tabs.reload(current_active_tab_id);
      window.close();
    });
  } else {
    document.querySelector("#blocked_requests_count").innerHTML = blocked_requests_count;
    document.querySelector("#disable_btn").addEventListener("click", function(){
      disabled_tabs.push(current_active_tab_id);
      browser.tabs.reload(current_active_tab_id);
      document.querySelector("#disabled_reason_buttons").className = "";
      document.querySelector("#details").className = "row hide";
    });
  }
  document.querySelector(".reason").addEventListener("click", function(event){
    fetch('https://testpilot.firefox.com/api/metrics/ping/testpilottest',
      {
        method: 'POST',
        mode: 'cors',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
        })
      }
    )
    .then(resp => console.log('metric ping success', resp))
    .catch(e => console.log('problem sending metrics ping', e));
  });
});
