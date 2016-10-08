// Saves options to chrome.storage.sync.
function save_options() {
  var single_new_tab = document.getElementById('single_new_tab').checked;
  chrome.storage.sync.set({
    single_new_tab: single_new_tab
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
    single_new_tab: false
  }, function(items) {
    document.getElementById('single_new_tab').checked = items.single_new_tab;
  });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);