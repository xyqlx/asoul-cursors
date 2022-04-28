import Dexie, { Table } from 'dexie';
const db = new Dexie("AsoulCursor");
db.version(1).stores({
    cursorRules: '&id, name',
    cursorImageData: '&id'
});
function setCursor(cursorMap: { [cursorType: string]: { data: string, center: { x: number, y: number }, size?: { width: number, height: number } } }, extensionUrl: string, force: boolean) {
    const existed = document.getElementById('asoul-cursor');
    if (existed) {
        if (force) {
            // 这个window似乎与console里的window不同
            (window as any)?.removeAsoulCursor();
        } else {
            return;
        }
    }
    cursorMap = { ...cursorMap };
    cursorMap['auto'] = cursorMap['default'];
    cursorMap['none'] = cursorMap['default'];
    const cursor = document.createElement("img");
    const assetsUrl = extensionUrl + "assets";
    cursor.id = "asoul-cursor";
    if (cursorMap['default'].data) {
        cursor.src = cursorMap['default'].data;
        if (cursorMap['default'].size) {
            cursor.style.width = cursorMap['default'].size?.width + 'px';
            cursor.style.height = cursorMap['default'].size?.height + 'px';
        }
    }
    cursor.style.position = "absolute";
    cursor.style.pointerEvents = "none";
    // bilibili投币界面zindex怎么是10k，梁木了
    cursor.style.zIndex = "2147483647";
    cursor.style.visibility = "hidden";
    console.log(`勇敢牛牛，不怕困难！插件设置见 ${extensionUrl}/index.html`);
    // add listener to mousemove
    let lastX = -1;
    let lastY = -1;
    let offsetX = 0;
    let offsetY = 0;
    let scrollFlag = false;
    let centerX = 0;
    let centerY = 0;
    // change mouse position
    const onmousemove = (e: any) => {
        lastX = e.pageX;
        lastY = e.pageY;
        cursor.style.left = (lastX - centerX) + "px";
        cursor.style.top = (lastY - centerY) + "px";
        if (scrollFlag) {
            offsetX = window.scrollX;
            offsetY = window.scrollY;
            scrollFlag = false;
        }
    };
    window.addEventListener("mousemove", onmousemove);
    document.addEventListener("dragover", onmousemove);
    const onscroll = (e: Event) => {
        scrollFlag = true;
        if (lastX === -1 || lastY === -1) {
            return;
        }
        cursor.style.left = lastX + window.scrollX - offsetX + "px";
        cursor.style.top = lastY + window.scrollY - offsetY + "px";
    };
    window.addEventListener("scroll", onscroll);
    let inited = false;
    let lastTarget: HTMLElement | null = null;
    let lastCursorType = 'none';
    // check mouseover target
    const onmouseover = (e: MouseEvent) => {
        if (!inited) {
            // document.documentElement.style.cursor = 'none';
            cursor.style.visibility = 'visible';
            inited = true;
        }
        if (e.target) {
            // 恢复上次修改的cursor style
            if (lastTarget) {
                if (lastCursorType !== 'none' && lastCursorType !== 'auto' && lastCursorType !== 'default') {
                    // 这句可能会导致 Forced reflow while executing JavaScript took 54ms
                    lastTarget.style.cursor = lastCursorType;
                }
            }
            // 获取target和cursor type
            lastTarget = e.target as any;
            let cursorType = lastTarget!.style.cursor;
            if (cursorType === '') {
                cursorType = window.getComputedStyle(e.target as any)["cursor"];
            }
            // 无需改变图片
            if (lastCursorType === cursorType) {
                return;
            }
            const cursorTypes = ['default', 'pointer', 'text', 'auto', 'none'];
            // 隐藏图片
            if (cursorTypes.indexOf(cursorType) === -1) {
                cursor.style.visibility = "hidden";
                lastTarget = null;
            }
            lastCursorType = cursorType;
            for (const c of cursorTypes) {
                if (cursorType === c) {
                    const cursorData = cursorMap[cursorType];
                    if (cursorData.data) {
                        // 隐藏光标
                        (e.target as any).style.cursor = 'none';
                        cursor.style.visibility = "visible";
                        cursor.src = cursorData.data;
                        if (cursorData.size) {
                            cursor.style.width = cursorData.size.width + 'px';
                            cursor.style.height = cursorData.size.height + 'px';
                        }
                        centerX = cursorData.center.x;
                        centerY = cursorData.center.y;
                    } else {
                        // 原来的光标样式
                        cursor.style.visibility = "hidden";
                    }
                    break;
                }
            }
        }
    };
    document.addEventListener('mouseover', onmouseover);
    // add cursor
    document.body.appendChild(cursor);
    (window as any).removeAsoulCursor = () => {
        document.removeEventListener('mouseover', onmouseover);
        window.removeEventListener("scroll", onscroll);
        window.removeEventListener("mousemove", onmousemove);
        document.removeEventListener("dragover", onmousemove);
        document.body.removeChild(cursor);
    }
    // add listener to dom changed
    let observer = new MutationObserver(mutations => {
        for(let mutation of mutations) {
            mutation.removedNodes.forEach(node => {
                // if node's id is 'asoul-cursor'
                if ((node as any).id === 'asoul-cursor') {
                    // remove listener
                    // observer.disconnect();
                    // 是的百度就会在HistoryStateUpdated之后修改dom
                    document.body.appendChild(cursor);
                }
            });
         }
    });
    observer.observe(document, { childList: true, subtree: true });
}

export default function changeCursor(tabId: number, force: boolean) {
    chrome.tabs.get(tabId, async (tab) => {
        const tabUrl = tab.url;
        // if tabUrl regex match https or http
        if (!tabUrl || !tabUrl.match(/^https?:\/\//)) {
            return;
        }
        const extensionUrl = chrome.runtime.getURL("");
        const cursorRules = await db.table('cursorRules').toArray();
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
        // find matched rule
        let matchedRule: { pattern: string, id: string } | null = null;
        for (const rule of rules) {
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
                args: [rule.cursor, extensionUrl, force]
            });
        }
    });
}