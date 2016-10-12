// Saves options to chrome.storage.sync.
function save_options() {
  var single_new_tab = document.getElementById('single_new_tab').checked;
  var every_window = document.getElementById('every_window').checked;
  chrome.storage.sync.set({
    single_new_tab: single_new_tab,
    every_window: every_window
  }, function() {
    var status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(function() {
      status.textContent = '';
    }, 750);
  });
}

function restore_options() {
  chrome.storage.sync.get({
    single_new_tab: false,
    every_window: false
  }, function(items) {
    document.getElementById('single_new_tab').checked = items.single_new_tab;
    document.getElementById('every_window').checked = items.every_window;
  });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);