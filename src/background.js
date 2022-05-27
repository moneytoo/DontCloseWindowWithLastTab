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
	return url == newTabUrl || url == "edge://newtab/" || (url.indexOf("/_/chrome/newtab?") !== -1 && url.indexOf("google.") !== -1);
}

async function activateTab(tabId) {
	try {
		await chrome.tabs.update(tabId, {"active": true});
	} catch (error) {
		if (error == 'Error: Tabs cannot be edited right now (user may be dragging a tab).') {
			setTimeout(() => handleEvent(), 50);
		}
	}
}

async function createTab(windowId) {
	if (working)
		return;
	working = true;
	try {
		await chrome.tabs.create({"windowId": windowId, "url": newTabUrl});
		working = false;
		first_window_id = windowId;
	} catch (error) {
		working = false;
		if (error == 'Error: Tabs cannot be edited right now (user may be dragging a tab).') {
			setTimeout(() => handleEvent(), 50);
		}
	}
}

async function createPinnedTab(windowId) {
	if (working)
		return;
	working = true;
	try {
		await chrome.tabs.create({"windowId": windowId, "index": 0, "pinned": true, "active": false, "url": newTabUrl});
		working = false;
		first_window_id = windowId;
	} catch (error) {
		working = false;
		if (error == 'Error: Tabs cannot be edited right now (user may be dragging a tab).') {
			setTimeout(() => handleEvent(), 50);
		}
	}
}

async function removeTab(tabId) {
	try {
		await chrome.tabs.remove(tabId);
	} catch (error) {
		if (error == 'Error: Tabs cannot be edited right now (user may be dragging a tab).') {
			setTimeout(() => handleEvent(), 50);
		}
	}
}

async function unpinTab(tabId) {
	try {
		await chrome.tabs.update(tabId, {"pinned": false});
	} catch (error) {
		if (error == 'Error: Tabs cannot be edited right now (user may be dragging a tab).') {
			setTimeout(() => handleEvent(), 50);
		}
	}
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

						// prevent activating first pinned tab
						if (window.tabs.length == 2) {
							if (window.tabs.length == 2 && windowFirstTab.active && windowFirstTab.pinned && isNewTabPage(windowFirstTab.url)) {
								if (debug) console.log("activate tab 1");
								activateTab(window.tabs[1].id);
							}
						}

						// create the single pinned tab if there's none
						if ((every_window || windows.length == 1 || (first_window && first_window_id == window.id)) && window.tabs.length < 2 && windowPinnedTabs.length < 1) {
							if (debug) console.log("creating pinned tab");
							createPinnedTab(window.id);
						}

						// open new tab if there's only single pinned tab
						if ((every_window || windows.length == 1 || (first_window && first_window_id == window.id)) && window.tabs.length == 1 && windowPinnedTabs.length == 1) {
							if (debug) console.log("creating tab");
							createTab(window.id);
						}

						// remove pinned tab if there's enough open tabs
						if ((every_window || windows.length == 1 || (first_window && first_window_id == window.id)) && window.tabs.length > 2 && windowPinnedTabs.length < window.tabs.length && windowPinnedTabs.length >= 1 && isNewTabPage(windowFirstTab.url)) {
							if (debug) console.log("removing pinned tab 1");
							removeTab(windowPinnedTabs[0].id);
						}

						// unpin single pinned tab if there's another window
						if (!every_window && windows.length > 1 && !(first_window && first_window_id == window.id) && window.tabs.length == 1 && windowPinnedTabs.length == 1 && isNewTabPage(windowFirstTab.url)) {
							if (debug) console.log("unpin pinned tab");
							unpinTab(windowPinnedTabs[0].id);
						}

						// remove pinned tab if 1st window has at least one regular page and new window is openning (ctrl+n)
						if (!every_window && windows.length > 1 && !(first_window && first_window_id == window.id) && window.tabs.length == 2 && windowPinnedTabs.length == 1 && isNewTabPage(windowFirstTab.url)) {
							if (debug) console.log("removing pinned tab 2");
							removeTab(windowPinnedTabs[0].id);
						}

						// allow single new tab page
						if (single_new_tab && windowNewTabs.length > 1) {
							if (debug) console.log("removing tab");
							removeTab(windowNewTabs[0].id);
						}

						// prevent blank new tab page(s) before actual tabs with loaded pages 
						if (new_tab_last && windowPinnedTabs.length == 0 && windowNewTabs.length >= 1 && window.tabs[window.tabs.length-1].id != windowNewTabs[0].id) {
							if (debug) console.log("removing tab 2");
							removeTab(windowNewTabs[0].id);
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
