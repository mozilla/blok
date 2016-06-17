browser.runtime.getBackgroundPage(function(backgroundPage) {
  var current_active_tab_id = backgroundPage.current_active_tab_id;
  var blocked_requests_count = backgroundPage.blocked_requests[current_active_tab_id].length;

  document.getElementById("blocked_requests_count").innerHTML = blocked_requests_count;
});
