var newTabUrl = "chrome://newtab/";

var working = false;

var single_new_tab = false;
var every_window = false;

var debug = false;

function handleEvent() {
	chrome.windows.getAll({populate: true, windowTypes: ["normal"]}, function(windows){
		for (var windowNumber = 0; windowNumber < windows.length; windowNumber++) {
			var window = windows[windowNumber];
			chrome.tabs.query({"windowId": window.id, "url": newTabUrl}, function(window, windowNumber, windowNewTabs) {
				//chrome.tabs.query({"windowId": window.id, "pinned": true, "url": newTabUrl}, function(window, windowNumber, windowNewTabs, windowPinnedNewTabs) {
				chrome.tabs.query({"windowId": window.id, "pinned": true}, function(window, windowNumber, windowNewTabs, windowPinnedTabs) {

					if (window.tabs.length == 2) {
						chrome.tabs.get(window.tabs[0].id, function(window, windowNumber, windowNewTabs, windowPinnedTabs, windowFirstTab) {

							// prevent activating first pinned tab
							if (window.tabs.length == 2 && windowFirstTab.active && windowFirstTab.pinned && !working) {
								working = true;
								chrome.tabs.update(window.tabs[1].id, {"active": true}, function(tab) {
									working = false;
								});
							}
						}.bind(null, window, windowNumber, windowNewTabs, windowPinnedTabs));
					}

					// create the single pinned tab if there's none
					if ((every_window || windows.length == 1) && window.tabs.length < 2 && windowPinnedTabs.length < 1 && !working) {
						working = true;
						if (debug) console.log("creating pinned tab");
						chrome.tabs.create({"windowId": window.id, "index": 0, "pinned": true, "active": false, "url": newTabUrl}, function(tab) {
							working = false;
						});
					}

					// open new tab if there's only single pinned tab
					if ((every_window || windows.length == 1) && window.tabs.length == 1 && windowPinnedTabs.length == 1 && !working) {
						working = true;
						if (debug) console.log("creating tab");
						chrome.tabs.create({"windowId": window.id, "url": newTabUrl}, function(tab) {
							working = false;
						});
					}

					// remove pinned tab if there's enough open tabs
					if ((every_window || windows.length == 1) && window.tabs.length > 2 && windowPinnedTabs.length < window.tabs.length && windowPinnedTabs.length >= 1 && !working) {
						working = true;
						if (debug) console.log("removing pinned tab 1");
						chrome.tabs.remove(windowPinnedTabs[0].id, function(tab) {
							working = false;
						});
					}

					// unpin single pinned tab if there's another window
					if (!every_window && windows.length > 1 && window.tabs.length == 1 && windowPinnedTabs.length == 1 && !working) {
						working = true;
						if (debug) console.log("unpin pinned tab");
						chrome.tabs.update(windowPinnedTabs[0].id, {"pinned": false}, function(tab) {
							working = false;
						});
					}

					// remove pinned tab if 1st window has at least one regular page and new window is openning (ctrl+n)
					if (!every_window && windows.length > 1 && window.tabs.length == 2 && windowPinnedTabs.length == 1 && !working) {
						working = true;
						if (debug) console.log("removing pinned tab 2");
						chrome.tabs.remove(windowPinnedTabs[0].id, function(tab) {
							working = false;
						});
					}

					// prevent blank new tab page(s) before actual tabs with loaded pages (allow single new tab page)
					if (single_new_tab && windowNewTabs.length > 1 && windowPinnedTabs.length == 0 && !working) {
						working = true;
						if (debug) console.log("removing tab");
						chrome.tabs.remove(windowNewTabs[0].id, function(tab) {
							working = false;
						});
					}
				}.bind(null, window, windowNumber, windowNewTabs));
			}.bind(null, window, windowNumber));
		}
	});
}

function init() {
	chrome.storage.sync.get({
		single_new_tab: false,
		every_window: false
	}, function(items) {
		single_new_tab = items.single_new_tab;
		every_window = items.every_window;
	});

	chrome.storage.onChanged.addListener(function(changes, namespace) {
		for (key in changes) {
			if (debug) console.log("changed");
			var storageChange = changes[key];
			if (key == "single_new_tab")
				single_new_tab = storageChange.newValue;
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
chrome.windows.onRemoved.addListener(handleEvent);
