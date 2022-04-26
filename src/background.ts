import changeCursor from "./changeCursor";

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'setting',
        title: '光标设置',
        contexts: ['page', 'action']
    });
});
chrome.contextMenus.onClicked.addListener(
    (info, tab) => {
        if (info.menuItemId === 'setting') {
            chrome.windows.create({
                url: chrome.runtime.getURL("index.html"),
                type: "popup",
                width: 300,
                height: 500
            }, function (win) {
                // win represents the Window object from windows API
                // Do something after opening
            });
        }
    }
);
chrome.webNavigation.onCompleted.addListener(() => {
    const queryOptions = { };
    chrome.tabs.query(queryOptions, (tabs) => {
        tabs.forEach((tab) => {
            if (tab?.id) {
                changeCursor(tab.id);
            }
        });
    });
}, {
    url: [
        { urlMatches: `(http|https).*` },
    ]
});