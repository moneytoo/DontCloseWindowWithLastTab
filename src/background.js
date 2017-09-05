var newTabUrl = "chrome://newtab/";

var working = false;
var first_window_id = null;

var single_new_tab = false;
var new_tab_last = false;
var first_window = true;
var every_window = false;

var debug = false;

function isNewTabPage(url) {
	url = url.trim();
	return url == newTabUrl || (url.indexOf("/_/chrome/newtab?") !== -1 && url.indexOf("google.") !== -1);
}

function handleEvent() {
	if (debug) console.log("handleEvent");

	chrome.windows.getAll({populate: true, windowTypes: ["normal"]}, function(windows){
		for (var windowNumber = 0; windowNumber < windows.length; windowNumber++) {
			var window = windows[windowNumber];
			chrome.tabs.query({"windowId": window.id, "url": newTabUrl, "pinned": false}, function(window, windowNumber, windowNewTabs) {
				chrome.tabs.query({"windowId": window.id, "pinned": true}, function(window, windowNumber, windowNewTabs, windowPinnedTabs) {
					if (window.tabs === undefined || window.tabs[0] === undefined)
						return;

					chrome.tabs.get(window.tabs[0].id, function(window, windowNumber, windowNewTabs, windowPinnedTabs, windowFirstTab) {

					if (first_window_id == null)
						first_window_id = window.id;

					if (window.tabs.length == 2) {
						// prevent activating first pinned tab
						if (window.tabs.length == 2 && windowFirstTab.active && windowFirstTab.pinned && isNewTabPage(windowFirstTab.url) && !working) {
							working = true;
							chrome.tabs.update(window.tabs[1].id, {"active": true}, function(tab) {
								working = false;
							});
						}
					}

					// create the single pinned tab if there's none
					if ((every_window || windows.length == 1 || (first_window && first_window_id == window.id)) && window.tabs.length < 2 && windowPinnedTabs.length < 1 && !working) {
						working = true;
						if (debug) console.log("creating pinned tab");
						chrome.tabs.create({"windowId": window.id, "index": 0, "pinned": true, "active": false, "url": newTabUrl}, function(tab) {
							working = false;
							first_window_id = window.id;
						});
					}

					// open new tab if there's only single pinned tab
					if ((every_window || windows.length == 1 || (first_window && first_window_id == window.id)) && window.tabs.length == 1 && windowPinnedTabs.length == 1 && !working) {
						working = true;
						if (debug) console.log("creating tab");
						chrome.tabs.create({"windowId": window.id, "url": newTabUrl}, function(window, tab) {
							working = false;
							first_window_id = window.id;
						}.bind(null, window));
					}

					// remove pinned tab if there's enough open tabs
					if ((every_window || windows.length == 1 || (first_window && first_window_id == window.id)) && window.tabs.length > 2 && windowPinnedTabs.length < window.tabs.length && windowPinnedTabs.length >= 1 && isNewTabPage(windowFirstTab.url) && !working) {
						working = true;
						if (debug) console.log("removing pinned tab 1");

						chrome.tabs.remove(windowPinnedTabs[0].id, function(tab) {
							working = false;
							if (chrome.runtime.lastError !== undefined && chrome.runtime.lastError.message.indexOf('user may be dragging a tab') !== -1)
								setTimeout(function() { handleEvent(); }, 700);
						});
					}

					// unpin single pinned tab if there's another window
					if (!every_window && windows.length > 1 && !(first_window && first_window_id == window.id) && window.tabs.length == 1 && windowPinnedTabs.length == 1 && isNewTabPage(windowFirstTab.url) && !working) {
						working = true;
						if (debug) console.log("unpin pinned tab");
						chrome.tabs.update(windowPinnedTabs[0].id, {"pinned": false}, function(tab) {
							working = false;
						});
					}

					// remove pinned tab if 1st window has at least one regular page and new window is openning (ctrl+n)
					if (!every_window && windows.length > 1 && !(first_window && first_window_id == window.id) && window.tabs.length == 2 && windowPinnedTabs.length == 1 && isNewTabPage(windowFirstTab.url) && !working) {
						working = true;
						if (debug) console.log("removing pinned tab 2");
						chrome.tabs.remove(windowPinnedTabs[0].id, function(tab) {
							working = false;
						});
					}

					// allow single new tab page
					if (single_new_tab && windowNewTabs.length > 1 && /*windowPinnedTabs.length == 0 &&*/ !working) {
						working = true;
						if (debug) console.log("removing tab");
						chrome.tabs.remove(windowNewTabs[0].id, function(tab) {
							working = false;
						});
					}

					// prevent blank new tab page(s) before actual tabs with loaded pages 
					if (new_tab_last && windowPinnedTabs.length == 0 && windowNewTabs.length >= 1 && window.tabs[window.tabs.length-1].id != windowNewTabs[0].id && !working) {
						working = true;
						if (debug) console.log("removing tab 2");
						chrome.tabs.remove(windowNewTabs[0].id, function(tab) {
							working = false;
							if (chrome.runtime.lastError !== undefined && chrome.runtime.lastError.message.indexOf('user may be dragging a tab') !== -1)
								setTimeout(function() { handleEvent(); }, 700);
						});
					}

					}.bind(null, window, windowNumber, windowNewTabs, windowPinnedTabs));
				}.bind(null, window, windowNumber, windowNewTabs));
			}.bind(null, window, windowNumber));
		}
	});
}

function init() {
	chrome.storage.sync.get({
		single_new_tab: false,
		new_tab_last: false,
		first_window: false,
		every_window: false,
	}, function(items) {
		single_new_tab = items.single_new_tab;
		new_tab_last = items.new_tab_last;
		first_window = items.first_window;
		every_window = items.every_window;
	});

	chrome.storage.onChanged.addListener(function(changes, namespace) {
		for (key in changes) {
			if (debug) console.log("changed");
			var storageChange = changes[key];
			if (key == "single_new_tab")
				single_new_tab = storageChange.newValue;
			else if (key == "new_tab_last")
				new_tab_last = storageChange.newValue;
			else if (key == "first_window")
				first_window = storageChange.newValue;
			else if (key == "every_window")
				every_window = storageChange.newValue;
		}
		handleEvent();
	});

	handleEvent();
}

init();
//chrome.tabs.onCreated.addListener(handleEvent);
chrome.tabs.onUpdated.addListener(handleEvent);
chrome.tabs.onAttached.addListener(handleEvent);
chrome.tabs.onActivated.addListener(handleEvent);
chrome.tabs.onRemoved.addListener(handleEvent);
chrome.tabs.onMoved.addListener(handleEvent);
chrome.windows.onRemoved.addListener(handleEvent);
