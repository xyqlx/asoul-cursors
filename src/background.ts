import changeCursor from "./change-cursor";
import { CursorRule } from "./cursor-rule";
import Dexie, { Table } from 'dexie';
import Pako from "pako";

const db = new Dexie("AsoulCursor");
db.version(1).stores({
    cursorRules: '&id, name',
    cursorImageData: '&id',
    environment: '&key'
});

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'setting',
        title: 'ASOUL光标规则设置',
        contexts: ['page', 'action']
    });
    // if database is empty, add default cursor rule
    db.table('cursorRules').count().then(async (count) => {
        if (count === 0) {
            // read default cursor rule from file
            const file = await fetch('assets/default.json.gz');
            const dataBuffer = await file.arrayBuffer();
            const data = new Uint8Array(dataBuffer);
            // decompress data
            const decompressedData = Pako.inflate(data, { to: 'string' });
            const json = JSON.parse(decompressedData);
            await db.table('cursorRules').bulkPut(json.cursorRules);
            await db.table('cursorImageData').bulkPut(json.cursorImageData);
        }
    });
    db.table('environment').count().then(async (count) => {
        if (count === 0) {
            await db.table('environment').put({ 'key': 'enable', 'value': true });
        }
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
async function injectCursor(force = false) {
    const { cursorRules, rules } = await getCursorRules();
    const queryOptions = {};
    chrome.tabs.query(queryOptions, (tabs) => {
        tabs.forEach((tab) => {
            if (tab?.id) {
                changeCursor(cursorRules, rules, tab.id, force);
            }
        });
    });
}
async function getCursorRules(){
    const enable = await db.table('environment').get('enable');
    const cursorRules = enable.value ? await db.table('cursorRules').toArray() : [];
    const rules: { pattern: string, id: string }[] = [];
    cursorRules.forEach((rule) => {
        rule.pattern.split('\n').forEach((pattern: string) => {
            rules.push({
                pattern: pattern.trim(),
                id: rule.id
            });
        });
    });
    // sort rules by pattern desc
    rules.sort((a, b) => {
        if (a.pattern < b.pattern) {
            return 1;
        }
        if (a.pattern > b.pattern) {
            return -1;
        }
        return 0;
    });
    return {
        cursorRules,
        rules
    }
}
chrome.webNavigation.onCompleted.addListener(async () => {
    await injectCursor();
});
chrome.webNavigation.onHistoryStateUpdated.addListener(async (e) => {
    const { cursorRules, rules } = await getCursorRules();
    changeCursor(cursorRules, rules, e.tabId, false);
});
chrome.runtime.onConnect.addListener((port) => {
    if (port.name === "getAllRules") {
        port.onMessage.addListener(async (msg) => {
            const cursorRules = await db.table('cursorRules').toArray();
            port.postMessage(cursorRules);
        });
    } else if (port.name === "getRule") {
        port.onMessage.addListener(async (msg) => {
            const cursorRule = await db.table('cursorRules').get(msg.id);
            const cursorImageData = await db.table('cursorImageData').get(msg.id);
            Object.keys(cursorRule.cursor).forEach((cursorType) => {
                cursorRule.cursor[cursorType].data = cursorImageData.data[cursorType];
            });
            port.postMessage(cursorRule);
        });
    }
    else if (port.name === "addRule") {
        // 其实这里应该加个重复检测
        port.onMessage.addListener(async (msg) => {
            const cursorRule = msg as CursorRule;
            const cursorImageData: { [cursorType: string]: string } = {};
            Object.keys(cursorRule.cursor).forEach((cursorType) => {
                cursorImageData[cursorType] = cursorRule.cursor[cursorType].data;
                cursorRule.cursor[cursorType].data = '';
            });
            await db.table('cursorRules').put(cursorRule);
            await db.table('cursorImageData').put({ id: cursorRule.id, data: cursorImageData });
            injectCursor(true);
            port.postMessage({});
        });
    } else if (port.name === "deleteRule") {
        port.onMessage.addListener(async (msg) => {
            await db.table('cursorRules').delete(msg.id);
            await db.table('cursorImageData').delete(msg.id);
            injectCursor(true);
            port.postMessage({});
        });
    } else if (port.name === "exportData") {
        port.onMessage.addListener(async (msg) => {
            port.postMessage({
                cursorRules: await db.table('cursorRules').toArray(),
                cursorImageData: await db.table('cursorImageData').toArray()
            })
        });
    } else if (port.name === 'importData') {
        port.onMessage.addListener(async (msg) => {
            const { cursorRules, cursorImageData } = msg;
            await db.table('cursorRules').bulkPut(cursorRules);
            await db.table('cursorImageData').bulkPut(cursorImageData);
            injectCursor(true);
            port.postMessage({});
        });
    } else if (port.name === 'switchEnable') {
        port.onMessage.addListener(async (msg) => {
            await db.table('environment').put({ 'key': 'enable', 'value': msg });
            injectCursor(true);
            port.postMessage({});
        });
    } else if (port.name === 'getEnable') {
        port.onMessage.addListener(async (msg) => {
            const enable = await db.table('environment').get('enable');
            port.postMessage(enable.value);
        });
    }
})