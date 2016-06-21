browser.runtime.getBackgroundPage(function(backgroundPage) {
  var current_active_tab_id = backgroundPage.current_active_tab_id;
  var blocked_requests_count = backgroundPage.blocked_requests[current_active_tab_id].length;
  var disabled_tabs = backgroundPage.disabled_tabs;
  var current_tab_disabled_index = disabled_tabs.indexOf(current_active_tab_id);

  if (current_tab_disabled_index > -1) {
    document.getElementById("blocking_summary").innerHTML = "Blocking disabled for this tab";
    document.getElementById("disable_btn").value = "Re-enable blocking for this tab";
    document.getElementById("disable_btn").addEventListener("click", function(){
      disabled_tabs.splice(current_tab_disabled_index, 1);
      browser.tabs.reload(current_active_tab_id);
      window.close();
    });
  } else {
    document.getElementById("blocked_requests_count").innerHTML = blocked_requests_count;
    document.getElementById("disable_btn").addEventListener("click", function(){
      disabled_tabs.push(current_active_tab_id);
      browser.tabs.reload(current_active_tab_id);
      document.getElementById("disabled_reason_buttons").className = "";
      document.getElementById("details").className = "row hide";
    });
  }
});
