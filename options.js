function save() {
  var f = document.forms['options'];
  localStorage['single_new_tab'] = (f.single_new_tab.checked) ? '1' : '0';
  return false;
}

function init() {
  var f = document.forms['options'];

  if (localStorage['single_new_tab'])
    f.single_new_tab.checked = localStorage['single_new_tab'] == '1';
  else
    f.single_new_tab.checked = false;
}

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('options').addEventListener('submit', save);
  init();
});
