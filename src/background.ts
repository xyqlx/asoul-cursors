import changeCursor from "./changeCursor";

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'setting',
        title: '光标设置',
        contexts: ['page', 'action']
    });
    chrome.contextMenus.onClicked.addListener(
        (info, tab) => {
            console.log(info.menuItemId);
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
    chrome.webNavigation.onCompleted.addListener(async () => {
        const queryOptions = { active: true, currentWindow: true };
        let [tab] = await chrome.tabs.query(queryOptions);
        if (tab.id) {
            changeCursor(tab.id);
        }
    }, {
        url: [
            { urlMatches: `.*` },
        ]
    });
});