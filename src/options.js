// Saves options to chrome.storage.sync.
function save_options() {
  var single_new_tab = document.getElementById('single_new_tab').checked;
  var new_tab_last = document.getElementById('new_tab_last').checked;
  var any_window = document.getElementById('any_window').checked;
  var first_window = document.getElementById('first_window').checked;
  var every_window = document.getElementById('every_window').checked;
  chrome.storage.sync.set({
    single_new_tab: single_new_tab,
    new_tab_last: new_tab_last,
    any_window: any_window,
    first_window: first_window,
    every_window: every_window,
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
    new_tab_last: false,
    any_window: true,
    first_window: false,
    every_window: false
  }, function(items) {
    document.getElementById('single_new_tab').checked = items.single_new_tab;
    document.getElementById('new_tab_last').checked = items.new_tab_last;
    document.getElementById('any_window').checked = items.any_window;
    document.getElementById('first_window').checked = items.first_window;
    document.getElementById('every_window').checked = items.every_window;

    toggle_new_tab_last();
  });
}

function toggle_new_tab_last() {
  if (document.getElementById('new_tab_last').checked && !document.getElementById('single_new_tab').checked) {
    document.getElementById('new_tab_last').checked = false;
  }
  document.getElementById('new_tab_last').disabled = !document.getElementById('single_new_tab').checked;
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);
document.getElementById('single_new_tab').addEventListener('change', toggle_new_tab_last);

