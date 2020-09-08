// log
// console.log("* background loaded *")

var audibleTabs = [];
var audibleTabs_old = [];
var audibleTabs_host = [];
var audibleTabs_log = false;
var allTabs = [];
var siteTabs = [];
var mutedSites = [];
var mutedSites_log = [false];
var user_mutedTabs = [];
var go_tabs_tid = [];
var go_tabs_wid = [];
var go_tabs_visited_tid = [];
var go_tabs_helper = 1;
var tabNow = [];

function onUpdated() {
    // log
    // console.log("done!");
}

function onError(error) {
    // log
    // console.log('Error: ${error}');
}

// ARRAYSEQUAL(a,b):
// Compares equality of two arrays
// They must be exactly the same to return true
// They can be different objects
// array: a, array: b -> bool
function arraysEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length !== b.length) return false;

  for (var i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// UNIQ(a):
// Removes all duplicates.
// array: a -> array: formated a
function uniq(a) {
    var seen = {};
    return a.filter(function(item) {
        return seen.hasOwnProperty(item) ? false : (seen[item] = true);
    });
}

// EXTRACTHOSTNAME(url):
// Gets the formated version of a url.
// string: url -> string: formated url
function extractHostname(url) {
    // console.log("url before: "+url);
    var hostname;
    if (url.includes("file:///")){
      hostname = "file:///*"
    } else {
      //find & remove protocol (http, ftp, etc.) and get hostname
      if (url.indexOf("//") > -1) {
          hostname = url.split('/')[2];
      } else {
          hostname = url.split('/')[0];
      }

      //find & remove port number
      hostname = hostname.split(':')[0];
      //find & remove "?"
      hostname = hostname.split('?')[0];
      var dot_number = (hostname.match(/\./g) || []).length;

      if (dot_number > 1) {
        hostname = hostname.split('.',3);
        hostname = hostname.slice(1,hostname.length);
        hostname = hostname.join('.');
        hostname = '*://*.'+hostname+'/*';
      }
      else {
        hostname = '*://*.'+hostname+'/*';
      }
    }
    console.log('host:'+hostname);
    return hostname;
}

// HOSTCHECKER(hostname):
// returns true if the hostname is in the mutedSites list
// hostname is a formated url
// string: hostname -> bool
function hostChecker(hostname) {
  var not_available = mutedSites;
  for (var i = 0; i < not_available.length; i++) {
    if (hostname.includes(not_available[i])) {
      console.log("not_available host:" + not_available[i]);
      return true;
    }
  }
  return false;
}

// UNMUTETAB(myTab):
// Unmutes a single tab
// myTab is an array made of a single tab
// array: myTab -> console
function unmuteTab(myTab){
  if (myTab === undefined || myTab.length == 0) {
    console.log("Error: zero tab");
  } else {
    for (var tabid in myTab){
      var updating = browser.tabs.update(myTab[tabid], {muted: false});
      updating.then(onUpdated, onError);
    }
    // log
    // console.log("Specific tab unmuted");
  }
}

// HANDLEUPDATED(tabId, changeInfo):
// Mutes or unmutes a new/refresh tab according to a blacklist.
// Uses a listener.
// listener: tabId, changeInfo -> functions: toggleMute_siteTabs or unmuteTab
function handleUpdated(tabId, changeInfo) {
  if (changeInfo.mutedInfo){
    // console.log(changeInfo.mutedInfo);
    if (changeInfo.mutedInfo.muted == true && changeInfo.mutedInfo.reason === "user"){
      user_mutedTabs.push(tabId);
      // go_tabs_visited_tid = go_tabs_visited_tid.filter(function(a){return a !== tabId});
      // log
      // console.log("user muted tab ", tabId);
    } else if (changeInfo.mutedInfo.muted == false && changeInfo.mutedInfo.reason === "user"){
      // log
      // console.log("user unmuted tab ", tabId);
      user_mutedTabs = user_mutedTabs.filter(function(a){return a !== tabId});
    }
    console.log("user muted: "+user_mutedTabs);
  }
  if (changeInfo.url) {
    // log
    // console.log("tab: " + tabId +
                // " url changed to " + changeInfo.url);
    var tab_url = changeInfo.url;
    tabId = [tabId];
    tab_url = extractHostname(tab_url);
    var extension_made = user_mutedTabs.includes(tabId);
    if (hostChecker(tab_url) == true){
      toggleMute_siteTabs(tabId, tab_url, 1);
    } else if (extension_made == false) {
      // log
      // console.log('user-made change will be kept');
    } else {
      unmuteTab(tabId);
    }
  }
}


// TOGGLEMUTE_SITETABS(siteTabs, hostname, override):
// Mutes all the tabs of a specific site, and adds the site
// to the blacklist.
// If the site is already muted, it unmutes it, removing it
// from the blacklist.
// If a tab is created/refreshed, it mutes/unmutes accordinly
// hostname is the formated url
// array: siteTabs, string: hostname, int: override -> console
function toggleMute_siteTabs(siteTabs, hostname, override){
  if (siteTabs === undefined || siteTabs.length == 0) {
    // log
    // console.log("Error: zero site tabs");
    mutedSites.splice(-1,1);
  } else if (override == 1) {
    for (var tabid in siteTabs){
        var updating = browser.tabs.update(siteTabs[tabid], {muted: true});
        updating.then(onUpdated, onError);
      }
        // log
        // console.log("Specific site tab muted");
        siteTabs.length = 0;
  } else {
    var hostname_index = mutedSites_log.length - 1;
    if (hostChecker(hostname) == true) {
      hostname_index = mutedSites.indexOf(hostname);
    }
    // console.log(hostname_index);
    if (mutedSites_log[hostname_index]==false){
      for (var tabid in siteTabs){
        var updating = browser.tabs.update(siteTabs[tabid], {muted: true});
        updating.then(onUpdated, onError);
      }
        // log
        // console.log("All site tabs muted");
        siteTabs.length = 0;
        mutedSites.push(hostname);
        mutedSites_log.push(false);
        mutedSites_log[hostname_index] = true;
        // console.log(mutedSites_log);
    } else {
      for (var tabid in siteTabs){
        var updating = browser.tabs.update(siteTabs[tabid], {muted: false});
        updating.then(onUpdated, onError);
      }
        // log
        // console.log("All site tabs unmuted");
        siteTabs.length = 0;
        mutedSites_log[hostname_index] = false;
        const remove_index = hostname_index;
        if (remove_index > -1) {
          mutedSites.splice(remove_index, 1);
          mutedSites_log.splice(remove_index, 1);
        }
        // console.log(mutedSites_log);
    }
  }

  // log
  // console.log("muted sites: "+mutedSites);
  // log
  // console.log("muted sites log: "+mutedSites_log);
}

// UNMUTEALL(allTabs):
// Unmutes all the tabs and restores the blacklist to its
// initial state.
// array: allTabs -> console
function unmuteAll(allTabs){
  if (allTabs === undefined || allTabs.length == 0) {
    // log
    // console.log("Error: zero tabs");
  } else {
    for (var tabid in allTabs){
      var updating = browser.tabs.update(allTabs[tabid], {muted: false});
      updating.then(onUpdated, onError);
    }
      // log
      // console.log("All tabs unmuted");
      audibleTabs.length = 0;
      audibleTabs_old.length = 0;
      allTabs.length = 0;
      siteTabs.length = 0;
      mutedSites.length = 0;
      mutedSites_log = [false];
      user_mutedTabs.length = 0;
      go_tabs_tid.length = 0;
      go_tabs_wid.length = 0;
      go_tabs_visited_tid.length = 0;
      go_tabs_helper = 1;
  }
}

// TOGGLEMUTE_AUDIBLETABS(audibleTabs, toogle):
// Mutes all tabs that are playing audio, and also
// unmutes said tabs that where muted, except for those in the blacklist.
// array: audibleTabs, int: toogle -> console
function toggleMute_audibleTabs(audibleTabs, toggle){
  if (audibleTabs === undefined || audibleTabs.length == 0) {
    // log
    // console.log("Error: zero audible tabs");
  } else if (toggle == 0) {
      for (var tabid in audibleTabs){
        var updating = browser.tabs.update(audibleTabs[tabid], {muted: true});
        updating.then(onUpdated, onError);
      }
        // log
        // console.log("New audible tabs muted");
        // audibleTabs_log = true;
  } else {
    // if (audibleTabs_log == false){
    //   for (var tabid in audibleTabs){
    //     var updating = browser.tabs.update(audibleTabs[tabid], {muted: true});
    //     updating.then(onUpdated, onError);
    //   }
    //     console.log("All audible tabs muted");
    //     audibleTabs_log = true;
    // } else {
      for (var tabid in audibleTabs){
        var updating = browser.tabs.update(audibleTabs[tabid], {muted: false});
        updating.then(onUpdated, onError);
      }
        // log
        // console.log("All audible tabs unmuted");
        audibleTabs_log = false;
        audibleTabs.length = 0;
        audibleTabs_old.length = 0;
        audibleTabs_host.length = 0;
    // }
  }
}


// LOGTABS_AUDIBLE(tabs):
// Decides which audible tabs should be muted or unmuted.
// object: tabs -> function: toggleMute_audibleTabs
function logTabs_audible(tabs) {
  var free_pass = false;
  // console.log("audible tabs 1: "+audibleTabs);
    if (tabs === undefined || tabs.length == 0) {
      // log
      // console.log('Error: tab is undefined');
    } else {
      for (let tab of tabs) {
          audibleTabs.push(tab.id);
          var host = extractHostname(tab.url);
          audibleTabs_host.push(host);
          free_pass = tab.audible;
          // log
          // console.log('free_pass '+free_pass+' to '+host);
          // console.log(audibleTabs_host);
      }
    }
    // console.log("audible tabs 2: "+audibleTabs);
    for (var index in audibleTabs) {
      // console.log('before deleted: '+audibleTabs);
      // console.log('before deleted: '+audibleTabs_host);
      var hostname = audibleTabs_host[index];
      // console.log("URL helper: "+hostname);
      var blacklisted = hostChecker(hostname);
      // console.log(blacklisted)
      // console.log('index: '+index);
      if (blacklisted == true && free_pass == false){
        audibleTabs_old = audibleTabs_old.filter(function(a){return a !== audibleTabs[index]});
        audibleTabs.splice(index,1);
        audibleTabs_host.splice(index,1);
        // console.log('id for old: '+audibleTabs[index]);
        // console.log('old deleted: '+audibleTabs_old);
        // console.log('after deleted: '+audibleTabs);
        // console.log('after deleted: '+audibleTabs_host);
      }
    }
    // console.log("audible tabs: "+audibleTabs);
    // console.log("old before: "+audibleTabs_old);
  audibleTabs = uniq(audibleTabs);
  // log
  // console.log(audibleTabs);
  if (arraysEqual(audibleTabs,audibleTabs_old)==false){
    audibleTabs_old = audibleTabs.slice();
    toggleMute_audibleTabs(audibleTabs, 0);
  } else {
    toggleMute_audibleTabs(audibleTabs, 1);
  }
    // console.log("old after: "+audibleTabs_old);

}

// LOGTABS_ALL(tabs):
// Puts every tab id in a list of tabs, ready to be unmuted.
// object: tabs -> function: unmuteAll
function logTabs_all(tabs) {
  for (let tab of tabs) {
    allTabs.push(tab.id);
  }
  // log
  // console.log(allTabs);
  unmuteAll(allTabs);
}

// LOGSITE(tabs):
// Gets the site formated url of the current tab.
// tabs is only one tab.
// object: tabs -> function: extractHostname, pormise: logTabs_allsite
function logSite(tabs) {
  var currentSite;
  for (let tab of tabs) {
    currentSite = tab.url;
  }
  // log
  // console.log(currentSite);
  var hostname = extractHostname(currentSite);
  let querying = browser.tabs.query({url: hostname});
  querying.then(logTabs_allsite, onError);
}

// LOGTABS_ALLSITE(tabs):
// Gets all the tabs that match the tab url.
// object: tabs -> function: extractHostname, toggleMute_siteTabs
function logTabs_allsite(tabs) {
  if (tabs === undefined || tabs.length == 0) {
    // log
    // console.log('Error: tab is undefined');

  } else {
    var hostname = extractHostname(tabs[0].url);
    for (let tab of tabs) {
      siteTabs.push(tab.id);
    }
    // log
    // console.log(siteTabs);
    toggleMute_siteTabs(siteTabs, hostname, 0);
  }
}

// GO_TO_SOUND(tabWindow, tabId):
// Changes the selected tab to an audible tab.
// Goes to the next audible if selected is already audible.
// Its inputs are id's from the desired window and desired tab.
// Although its inputs are arrays, the function only takes the first item
// array: tabWindow, tabId -> console
function go_to_sound(tabWindow, tabId){
  if (go_tabs_tid === undefined || go_tabs_tid.length == 0) {
    // log
    // console.log('Error: no audible tabs');
  } else {
    go_tabs_visited_tid.push(tabId[0]);
    tabWindow = tabWindow[0];
    tabId = tabId[0];
    var focusWindow = browser.windows.update(tabWindow, {focused: true});
    focusWindow.then(onUpdated,onError);
    var focusTab = browser.tabs.update(tabId, {active: true});
    focusTab.then(onUpdated,onError);
    go_tabs_tid.length = 0;
    go_tabs_wid.length = 0;
    // log
    // console.log("visited: "+go_tabs_visited_tid);
    // console.log("audio: "+go_tabs_tid);
    // console.log('done!');
  }
}

// LOGTABS_GO(tabs):
// Orders audible tabs, so the desired tab is first.
// object: tabs -> function: go_to_sound
function logTabs_go(tabs) {
  // log
  // console.log("visited: "+go_tabs_visited_tid);
  if (tabs === undefined || tabs.length == 0) {
    // log
    // console.log('Error: tab is undefined');

  } else {
    for (let tab of tabs) {
      var tabWindow = tab.windowId;
      var tabId = tab.id;
      go_tabs_wid.push(tabWindow);
      go_tabs_tid.push(tabId);
      // console.log(tabWindow);
    }
    // log
    // console.log('helper: '+go_tabs_helper);
    if (go_tabs_helper == 1){
      go_tabs_helper = go_tabs_tid.length;
      go_tabs_visited_tid.length = 0;
    } else {
      go_tabs_helper -= 1;
    }

    // log
    // console.log(go_tabs_tid.indexOf(tabNow[0]));
    // log
    // console.log(go_tabs_tid.length-1);
    if (go_tabs_tid.indexOf(tabNow[0]) != go_tabs_tid.length-1){
      go_tabs_visited_tid.push(tabNow);
    }
    go_tabs_visited_tid = uniq(go_tabs_visited_tid);


    for (var item in go_tabs_visited_tid){
      var index = go_tabs_tid.findIndex((e) => e == go_tabs_visited_tid[item]);
      // log
      // console.log('indexes go '+go_tabs_tid[index]);
      if (go_tabs_tid[index] == tabNow){
        var rever_tid = go_tabs_tid.reverse();
        var index_tid = go_tabs_tid.length - index - 1;
        rever_tid.splice(index_tid, go_tabs_tid.length);
        go_tabs_tid = rever_tid.reverse();
        var rever_wid = go_tabs_wid.reverse();
        var index_wid = go_tabs_wid.length - index - 1;
        rever_wid.splice(index_wid, go_tabs_wid.length);
        go_tabs_wid = rever_wid.reverse();
        // go_tabs_tid.splice(index,1);
        // go_tabs_wid.splice(index,1);
      }
      else {
        if (go_tabs_tid.includes(tabNow) == false) {

        } else {
          go_tabs_helper = 1;
        }
      }

    }
    // log
    // console.log("audio: "+go_tabs_tid);
    go_to_sound(go_tabs_wid, go_tabs_tid);
  }
}

// ADDLISTENER():
// Listens to the hotkeys set in json and passes to the proper function.
// command: hotkey -> function: logTabs_audible,  logTabs_all, logSite
browser.commands.onCommand.addListener((command) => {
    // log
    // console.log('Action: '+command);
  if (command == "mute-audible"){
    let querying = browser.tabs.query({audible: true});
    querying.then(logTabs_audible, onError);
  } else if(command == "unmute-all"){
    let querying = browser.tabs.query({});
    querying.then(logTabs_all, onError);
  } else if(command == "mute-site"){
    let querying = browser.tabs.query({currentWindow: true, active: true});
    querying.then(logSite, onError);
  } else if(command == "go-to-sound"){
    let querying = browser.tabs.query({audible: true});
    querying.then(logTabs_go, onError);
  }
});

// ONUPDATED.ADDLISTENER(handleUpdated):
// Gets triggered everytime a tab is updated, and passes its info.
// browser -> function: handleUpdated
browser.tabs.onUpdated.addListener(handleUpdated);

// ONACTIVATED.ADDLISTENER():
// Triggered when a new tab is active/selected.
// It saves the triggerred tab.
// browser -> console
browser.tabs.onActivated.addListener((activeInfo) => {
  tabNow[0] = activeInfo.tabId;
  // console.log('tab now: '+tabNow);
  // console.log("done!");
});

// ONFOCUSCHANGED.ADDLISTENER():
// Triggered when a new windows is active/selected.
// It then gets the tab for said windows.
// It saves the triggered tab.
// browser -> console
browser.windows.onFocusChanged.addListener((windowId) => {
  // console.log("window changed to "+windowId);
  browser.tabs.query({currentWindow: true, active: true}).then((tabs) => {
      let tab = tabs[0]; // Safe to assume there will only be one result
      // console.log("new window tab is "+tab.id);
      tabNow[0] = tab.id;
      // console.log('tab now: '+tabNow);
      // console.log("done!");
  }, console.error)
});

// MENUS.CREATE():
// Creates a new browser menu item in the context tab menu
browser.menus.create({
  id: "mute-site",
  title: "Mute Site",
  contexts: ["tab"]
});

// ONLCICKED.ADDLISTENER():
// Triggered when the menu "mute-site" is clicked
// It is as if the command hotkey was pressed
// browser -> function: logSite
browser.menus.onClicked.addListener(async function (info, tab) {
  if (info.menuItemId == "mute-site") {
    // log
    // console.log("pop: "+info.srcUrl);
    // log
    // console.log(tab.url);
    var tabs = [tab];
    logSite(tabs);
}});

// MENUS.CREATE():
// Creates a new browser menu item in the context link menu
browser.menus.create({
  id: "mute-tab",
  title: "Open Link in New Muted Tab",
  contexts: ["link"]
});

// ONLCICKED.ADDLISTENER():
// Triggered when the menu "mute-tab" is clicked
// Opens the tab ina new muted tab
// browser -> function: logSite
browser.menus.onClicked.addListener(async function (info, tab) {
  if (info.menuItemId == "mute-tab") {
    if (info.linkUrl) {
      let newTab = await browser.tabs.create({ 'active': false, 'url': info.linkUrl, 'index': tab.index+1 });
      browser.tabs.update(newTab.id, { 'muted': true });
    }
  }
});

// UPDATEMENUITEM(menuItem, url):
// Changes the "mute-site" menu text according to the blacklist
// string: url -> browser
function updateMenuItem(menuItemId, url) {
  var host = extractHostname(url);
  var name = "";
  if (mutedSites.includes(host) == false) {
    name = "Mute Site";
  } else {
    name = "Unmute Site";
  }
  browser.menus.update(menuItemId, {
    title: name
  });
  browser.menus.refresh();
}

// ONSHOWN.ADDLISTENER():
// Sends the url when the "mute-site" menu is shown
// browser -> function: updateMenuItem
browser.menus.onShown.addListener(function(info,tab) {
  var url = tab.url;
  if (!info.menuItemId == "mute-site") {
    // log
    // console.log("shown");
    return;
  }
  updateMenuItem("mute-site", url);
});
