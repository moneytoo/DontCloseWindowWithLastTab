importScripts("browser-polyfill.js");

var newTabUrl = "chrome://newtab/";

var working = false;
var handling = false;
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

async function handleEvent(type) {
	if (handling)
		return;

	handling = true;
	if (debug) console.log("handleEvent " + type);

	let wasWorking = false;

	let windows = await chrome.windows.getAll({populate: true, windowTypes: ["normal"]});
	for (let windowNumber = 0; windowNumber < windows.length; windowNumber++) {
		let window = windows[windowNumber];
		let windowNewTabs = await browser.tabs.query({"windowId": window.id, "url": newTabUrl, "pinned": false});
		let windowPinnedTabs = await chrome.tabs.query({"windowId": window.id, "pinned": true});

		if (window.tabs === undefined || window.tabs[0] === undefined)
			return;

		let windowFirstTab = await browser.tabs.get(window.tabs[0].id);

		if (first_window_id == null)
			first_window_id = window.id;

		// prevent activating first pinned tab
		if (window.tabs.length == 2) {
			if (window.tabs.length == 2 && windowFirstTab.active && windowFirstTab.pinned && isNewTabPage(windowFirstTab.url) && !working) {
				working = true;
				if (debug) console.log("activate tab 1");
				try {
					await browser.tabs.update(window.tabs[1].id, {"active": true});
					wasWorking = true;
				} catch(error) {
					setTimeout(function() { handleEvent("redo"); }, 50);
				}
				working = false;
			}
		}

		// create the single pinned tab if there's none
		if ((every_window || windows.length == 1 || (first_window && first_window_id == window.id)) && window.tabs.length < 2 && windowPinnedTabs.length < 1 && !working) {
			working = true;
			if (debug) console.log("creating pinned tab");
			try {
				await browser.tabs.create({"windowId": window.id, "index": 0, "pinned": true, "active": false, "url": newTabUrl});
				first_window_id = window.id;
				wasWorking = true;
			} catch (error) {
				setTimeout(function() { handleEvent("redo"); }, 700);
			}
			working = false;
		}

		// open new tab if there's only single pinned tab
		if ((every_window || windows.length == 1 || (first_window && first_window_id == window.id)) && window.tabs.length == 1 && windowPinnedTabs.length == 1 && !working) {
			working = true;
			if (debug) console.log("creating tab");
			try {
				await browser.tabs.create({"windowId": window.id, "url": newTabUrl});
				first_window_id = window.id;
				wasWorking = true;
			} catch (error) {
				setTimeout(function() { handleEvent("redo"); }, 700);
			}
			working = false;
		}

		// remove pinned tab if there's enough open tabs
		if ((every_window || windows.length == 1 || (first_window && first_window_id == window.id)) && window.tabs.length > 2 && windowPinnedTabs.length < window.tabs.length && windowPinnedTabs.length >= 1 && isNewTabPage(windowFirstTab.url) && !working) {
			working = true;
			if (debug) console.log("removing pinned tab 1");
			try {
				await browser.tabs.remove(windowPinnedTabs[0].id);
				wasWorking = true;
			} catch (error) {
				setTimeout(function() { handleEvent("redo"); }, 700);
			}
			working = false;
		}

		// unpin single pinned tab if there's another window
		if (!every_window && windows.length > 1 && !(first_window && first_window_id == window.id) && window.tabs.length == 1 && windowPinnedTabs.length == 1 && isNewTabPage(windowFirstTab.url) && !working) {
			working = true;
			if (debug) console.log("unpin pinned tab");
			try {
				await browser.tabs.update(windowPinnedTabs[0].id, {"pinned": false});
				wasWorking = true;
			} catch (error) {
				console.log(error);
			}
			working = false;
		}

		// remove pinned tab if 1st window has at least one regular page and new window is openning (ctrl+n)
		if (!every_window && windows.length > 1 && !(first_window && first_window_id == window.id) && window.tabs.length == 2 && windowPinnedTabs.length == 1 && isNewTabPage(windowFirstTab.url) && !working) {
			working = true;
			if (debug) console.log("removing pinned tab 2");
			try {
				await browser.tabs.remove(windowPinnedTabs[0].id);
				wasWorking = true;
			} catch (error) {
				console.log(error);
			}
			working = false;
		}

		// allow single new tab page
		if (single_new_tab && windowNewTabs.length > 1 && /*windowPinnedTabs.length == 0 &&*/ !working) {
			working = true;
			if (debug) console.log("removing tab");
			try {
				await browser.tabs.remove(windowNewTabs[0].id);
				wasWorking = true;
			} catch (error) {
				console.log(error);
			}
			working = false;
		}

		// prevent blank new tab page(s) before actual tabs with loaded pages 
		if (new_tab_last && windowPinnedTabs.length == 0 && windowNewTabs.length >= 1 && window.tabs[window.tabs.length-1].id != windowNewTabs[0].id && !working) {
			working = true;
			if (debug) console.log("removing tab 2");
			try {
				await browser.tabs.remove(windowNewTabs[0].id);
				wasWorking = true;
			} catch (error) {
				setTimeout(function() { handleEvent("redo"); }, 700);
			}
			working = false;
		}
	}

	if (debug) console.log("end handleEvent");

	handling = false;
	if (wasWorking)
		setTimeout(function() { handleEvent("redo"); }, 50);
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
			let storageChange = changes[key];
			if (key == "single_new_tab")
				single_new_tab = storageChange.newValue;
			else if (key == "new_tab_last")
				new_tab_last = storageChange.newValue;
			else if (key == "first_window")
				first_window = storageChange.newValue;
			else if (key == "every_window")
				every_window = storageChange.newValue;
		}
		handleEvent("chrome.storage.onChanged");
	});

	handleEvent("init");
}

init();
//browser.tabs.onCreated.addListener(() => handleEvent("browser.tabs.onCreated");
browser.tabs.onUpdated.addListener(() => handleEvent("browser.tabs.onUpdated"));
browser.tabs.onAttached.addListener(() => handleEvent("browser.tabs.onAttached"));
browser.tabs.onActivated.addListener(() => handleEvent("browser.tabs.onActivated"));
browser.tabs.onRemoved.addListener(() => handleEvent("browser.tabs.onRemoved"));
browser.tabs.onMoved.addListener(() => handleEvent("browser.tabs.onMoved"));
browser.windows.onRemoved.addListener(() => handleEvent("browser.windows.onRemoved"));
