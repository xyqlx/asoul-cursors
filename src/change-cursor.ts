import Dexie, { Table } from 'dexie';
const db = new Dexie("AsoulCursor");
db.version(1).stores({
    cursorRules: '&id, name'
});
function setCursor(cursorMap: { [cursorType: string]: { data: string, size?: { width: number, height: number } } }, extensionUrl: string) {
    const existed = document.getElementById('asoul-cursor');
    if (existed) {
        return;
    }
    cursorMap = {...cursorMap};
    cursorMap['auto'] = cursorMap['default'];
    cursorMap['none'] = cursorMap['default'];
    const cursor = document.createElement("img");
    const assetsUrl = extensionUrl + "assets";
    cursor.id = "asoul-cursor";
    cursor.src = assetsUrl + '/ava/9.gif';
    cursor.style.position = "absolute";
    cursor.style.pointerEvents = "none";
    cursor.style.zIndex = "9999";
    cursor.style.visibility = "hidden";
    console.log(`勇敢牛牛，不怕困难！插件设置见 ${extensionUrl}/index.html`);
    // add listener to mousemove
    let lastX = -1;
    let lastY = -1;
    let offsetX = 0;
    let offsetY = 0;
    let scrollFlag = false;
    // change mouse position
    const onmousemove = (e: any) => {
        lastX = e.pageX;
        lastY = e.pageY;
        cursor.style.left = lastX + "px";
        cursor.style.top = lastY + "px";
        if (scrollFlag) {
            offsetX = window.scrollX;
            offsetY = window.scrollY;
            scrollFlag = false;
        }
    };
    window.addEventListener("mousemove", onmousemove);
    document.addEventListener("dragover", onmousemove);
    window.addEventListener("scroll", (e) => {
        scrollFlag = true;
        if (lastX === -1 || lastY === -1) {
            return;
        }
        cursor.style.left = lastX + window.scrollX - offsetX + "px";
        cursor.style.top = lastY + window.scrollY - offsetY + "px";
    });
    let inited = false;
    let lastTarget: HTMLElement | null = null;
    let lastCursorType = 'none';
    // check mouseover target
    document.addEventListener('mouseover', function (e) {
        if (!inited) {
            // document.documentElement.style.cursor = 'none';
            cursor.style.visibility = 'visible';
            inited = true;
        }
        if (e.target) {
            if (lastTarget) {
                if (lastCursorType !== 'none' && lastCursorType !== 'auto' && lastCursorType !== 'default') {
                    // 这句可能会导致 Forced reflow while executing JavaScript took 54ms
                    lastTarget.style.cursor = lastCursorType;
                }
            }
            lastTarget = e.target as any;
            let cursorType = lastTarget!.style.cursor;
            if (cursorType === '') {
                cursorType = window.getComputedStyle(e.target as any)["cursor"];
            }
            (e.target as any).style.cursor = 'none';
            if (lastCursorType === cursorType) {
                return;
            }
            lastCursorType = cursorType;
            
            const cursorTypes = ['default', 'pointer', 'text', 'auto', 'none'];
            cursorTypes.forEach((cursorType) => {
                if (cursorType === cursorType) {
                    const cursorData = cursorMap[cursorType];
                    if (cursorData) {
                        cursor.src = cursorData.data;
                        if (cursorData.size) {
                            cursor.style.width = cursorData.size.width + 'px';
                            cursor.style.height = cursorData.size.height + 'px';
                        }
                    }
                }
            });            
            if (cursorTypes.indexOf(cursorType) === -1) {
                cursor.style.visibility = "hidden";
                (e.target as any).style.cursor = lastCursorType;
                lastTarget = null;
            }
        }
    });
    // add cursor
    document.body.appendChild(cursor);
}

export default function changeCursor(tabId: number) {
    chrome.tabs.get(tabId, async (tab) => {
        const tabUrl = tab.url;
        // if tabUrl regex match https or http
        if (!tabUrl || !tabUrl.match(/^https?:\/\//)) {
            return;
        }
        const extensionUrl = chrome.runtime.getURL("");
        const cursorRules = await db.table('cursorRules').toArray();
        const rules: {pattern: string, id: string}[] = [];
        cursorRules.forEach((rule) => {
            rule.pattern.split('\n').forEach((pattern: string) => {
                rules.push({
                    pattern: pattern.trim(),
                    id: rule.id
                });
            });
        });
        // sort rules by pattern
        rules.sort((a, b) => {
            if (a.pattern < b.pattern) {
                return -1;
            }
            if (a.pattern > b.pattern) {
                return 1;
            }
            return 0;
        });
        // find matched rule
        let matchedRule: {pattern: string, id: string} | null = null;
        for(const rule of rules){
            if (tabUrl.startsWith(rule.pattern)) {
                matchedRule = rule;
                break;
            }
        }
        if (matchedRule !== null) {
            const rule = cursorRules.find((rule) => rule.id === matchedRule!.id);
            const cursorImageData = await db.table('cursorImageData').get(rule!.id);
            Object.keys(rule.cursor).forEach((cursorType) => {
                rule.cursor[cursorType].data = cursorImageData.data[cursorType];
            });
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: setCursor,
                args: [rule.cursor, extensionUrl]
            });
        }
    });
}