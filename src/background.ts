import changeCursor from "./change-cursor";
import { CursorRule } from "./cursor-rule";

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
                width: 640,
                height: 480
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
chrome.runtime.onConnect.addListener(function(port) {
    if (port.name == "getData") {
        port.onMessage.addListener(function(msg) {
            port.postMessage([
                new CursorRule('1', '默认', ["https://www.baidu.com"], {'default': ''})
            ]);
       });
    }
})