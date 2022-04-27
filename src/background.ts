import changeCursor from "./change-cursor";
import { CursorRule } from "./cursor-rule";
import Dexie, { Table } from 'dexie';

const db = new Dexie("AsoulCursor");
db.version(1).stores({
    cursorRules: '&id, name',
    cursorImageData: '&id'
});

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'setting',
        title: '光标规则设置',
        contexts: ['page', 'action']
    });
});
chrome.contextMenus.onClicked.addListener(
    (info, tab) => {
        if (info.menuItemId === 'setting') {
            chrome.windows.create({
                url: chrome.runtime.getURL("index.html"),
                type: "popup",
                width: 900,
                height: 900,
            }, function (win) {
                // win represents the Window object from windows API
                // Do something after opening
            });
        }
    }
);
function injectCursor(force = false){
    const queryOptions = { };
    chrome.tabs.query(queryOptions, (tabs) => {
        tabs.forEach((tab) => {
            if (tab?.id) {
                changeCursor(tab.id, force);
            }
        });
    });
}
chrome.webNavigation.onCompleted.addListener(() => {
    injectCursor();
});
chrome.webNavigation.onHistoryStateUpdated.addListener((e) => {
    changeCursor(e.tabId, false);
});
chrome.runtime.onConnect.addListener((port) => {
    if (port.name === "getAllRules") {
        port.onMessage.addListener(async (msg) => {
            const cursorRules = await db.table('cursorRules').toArray();
            port.postMessage(cursorRules);
       });
    }else if(port.name === "getRule"){
        port.onMessage.addListener(async (msg) => {
            const cursorRule = await db.table('cursorRules').get(msg.id);
            const cursorImageData = await db.table('cursorImageData').get(msg.id);
            Object.keys(cursorRule.cursor).forEach((cursorType) => {
                cursorRule.cursor[cursorType].data = cursorImageData.data[cursorType];
            });
            port.postMessage(cursorRule);
        });
    }
    else if(port.name === "addRule"){
        // 其实这里应该加个重复检测
        port.onMessage.addListener(async (msg) => {
            const cursorRule = msg as CursorRule;
            const cursorImageData: {[cursorType: string]: string} = {};
            Object.keys(cursorRule.cursor).forEach((cursorType) => {
                cursorImageData[cursorType] = cursorRule.cursor[cursorType].data;
                cursorRule.cursor[cursorType].data = '';
            });
            await db.table('cursorRules').put(cursorRule);
            await db.table('cursorImageData').put({id: cursorRule.id, data: cursorImageData});
            injectCursor(true);
            port.postMessage({});
        });
    }else if(port.name === "deleteRule"){
        port.onMessage.addListener(async (msg) => {
            await db.table('cursorRules').delete(msg.id);
            await db.table('cursorImageData').delete(msg.id);
            injectCursor(true);
            port.postMessage({});
        });
    }else if(port.name === "exportData"){
        port.onMessage.addListener(async (msg) => {
            port.postMessage({
                cursorRules: await db.table('cursorRules').toArray(),
                cursorImageData: await db.table('cursorImageData').toArray()
            })
        });
    }else if(port.name === 'importData'){
        port.onMessage.addListener(async (msg) => {
            const {cursorRules, cursorImageData} = msg;
            await db.table('cursorRules').bulkPut(cursorRules);
            await db.table('cursorImageData').bulkPut(cursorImageData);
            injectCursor(true);
            port.postMessage({});
        });
    }
})