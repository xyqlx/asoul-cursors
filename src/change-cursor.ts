import Dexie, { Table } from 'dexie';
import { CursorRule } from './cursor-rule';
const db = new Dexie("AsoulCursor");
db.version(1).stores({
    cursorRules: '&id, name',
    cursorImageData: '&id',
    environment: '&key'
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
    // if cursorMap has no keys, return
    if (!Object.keys(cursorMap).length) {
        return;
    }
    cursorMap = { ...cursorMap };
    cursorMap['auto'] = cursorMap['default'];
    cursorMap['none'] = cursorMap['default'];
    const cursor = document.createElement("img");
    cursor.id = "asoul-cursor";
    if (cursorMap['default'].data) {
        cursor.src = cursorMap['default'].data;
        if (cursorMap['default'].size) {
            cursor.style.width = cursorMap['default'].size?.width + 'px';
            cursor.style.height = cursorMap['default'].size?.height + 'px';
        }
    }
    cursor.style.position = "fixed";
    cursor.style.pointerEvents = "none";
    // bilibili投币界面zindex怎么是10k，梁木了
    cursor.style.zIndex = "2147483647";
    cursor.style.visibility = "hidden";
    console.log(`ASOUL光标插件设置见 ${extensionUrl}/index.html`);
    // add listener to mousemove
    let centerX = 0;
    let centerY = 0;
    // change mouse position
    const onmousemove = (e: MouseEvent | DragEvent) => {
        cursor.style.left = (e.clientX - centerX) + "px";
        cursor.style.top = (e.clientY - centerY) + "px";
    };
    window.addEventListener("mousemove", onmousemove);
    document.addEventListener("dragover", onmousemove);
    let inited = false;
    let lastTarget: HTMLElement | null = null;
    let lastCursorType = 'none';
    const cursorTypeCache: Map<HTMLElement, string> = new Map();
    // check mouseover target
    const onmouseover = (e: MouseEvent) => {
        if (!inited) {
            // document.documentElement.style.cursor = 'none';
            cursor.style.visibility = 'visible';
            inited = true;
        }
        if (e.target) {
            // 获取target和cursor type
            const target = e.target as HTMLElement;
            let cursorType = target.style.cursor;
            // if target is descendants of last target
            if (cursorType === '') {
                cursorType = window.getComputedStyle(e.target as any)["cursor"];
            }
            if(cursorType === 'none'){
                if(lastTarget && lastTarget.contains(target)){
                    cursorType = lastCursorType;
                    target.style.cursor = cursorType;
                }
                if(cursorTypeCache.has(target)){
                    cursorType = cursorTypeCache.get(target)!;
                }
                // console.log('none: ' + lastCursorType);
            }
            // console.log(target);
            // console.log('check cursor style ', cursorType);
            lastTarget = target;
            const cursorTypes = ['default', 'pointer', 'text', 'auto', 'none'];
            // 隐藏图片
            if (cursorTypes.indexOf(cursorType) === -1) {
                cursor.style.visibility = "hidden";
            }
            for (const c of cursorTypes) {
                if (cursorType === c) {
                    const cursorData = cursorMap[cursorType];
                    if (cursorData.data) {
                        // 恢复cursor style
                        if (cursorType !== 'none') {
                            cursorTypeCache.set(target, cursorType);
                            const event = () => {
                                // 这句可能会导致 Forced reflow while executing JavaScript took 54ms
                                target!.style.cursor = cursorType;
                                // console.log(target);
                                // console.log('restore cursor style ', cursorType);
                                target!.removeEventListener("mouseleave", event);
                                cursorTypeCache.delete(target);
                            }
                            target!.addEventListener("mouseleave", event);
                        }
                        // 隐藏光标
                        target.style.cursor = 'none';
                        cursor.style.visibility = "visible";
                        if (lastCursorType !== cursorType) {
                            cursor.src = cursorData.data;
                            if (cursorData.size) {
                                cursor.style.width = cursorData.size.width + 'px';
                                cursor.style.height = cursorData.size.height + 'px';
                            }
                            centerX = cursorData.center.x;
                            centerY = cursorData.center.y;
                        }
                    } else {
                        // 原来的光标样式
                        cursor.style.visibility = "hidden";
                    }
                    break;
                }
            }
            lastCursorType = cursorType;
        }
    };
    document.addEventListener('mouseover', onmouseover);
    // add listener to fullscreen change
    const onfullscreenchange = () => {
        if (document.fullscreenElement) {
            // move asoul-cursor to this element
            document.fullscreenElement.appendChild(cursor);
        } else {
            // move asoul-cursor back to body
            document.body.appendChild(cursor);
        }
    }
    document.addEventListener('fullscreenchange', onfullscreenchange);
    // add cursor
    document.body.appendChild(cursor);
    // add listener to dom changed
    let observer = new MutationObserver(mutations => {
        for (let mutation of mutations) {
            mutation.removedNodes.forEach(node => {
                // if node's id is 'asoul-cursor'
                if ((node as any).id === 'asoul-cursor') {
                    // remove listener
                    // observer.disconnect();
                    // 是的百度就会在HistoryStateUpdated之后修改dom
                    const existed = document.getElementById('asoul-cursor');
                    if (!existed) {
                        document.body.appendChild(cursor);
                    }
                }
            });
        }
    });
    observer.observe(document, { childList: true, subtree: true });
    (window as any).removeAsoulCursor = () => {
        document.removeEventListener('mouseover', onmouseover);
        window.removeEventListener("mousemove", onmousemove);
        document.removeEventListener("dragover", onmousemove);
        observer.disconnect();
        const lastCursor = document.getElementById('asoul-cursor');
        if (lastCursor) {
            document.body.removeChild(lastCursor);
        }
    }
}

export default function changeCursor(cursorRules: CursorRule[], rules: { pattern: string, id: string }[], tabId: number, force: boolean) {
    chrome.tabs.get(tabId, async (tab) => {
        const tabUrl = tab.url;
        // if tabUrl regex match https or http
        if (!tabUrl || !tabUrl.match(/^https?:\/\//)) {
            return;
        }
        const extensionUrl = chrome.runtime.getURL("");
        // find matched rule
        let matchedRule: { pattern: string, id: string } | null = null;
        for (const rule of rules) {
            if (tabUrl.startsWith(rule.pattern)) {
                matchedRule = rule;
                break;
            }
        }
        if (matchedRule !== null) {
            const rule = cursorRules.find((rule) => rule.id === matchedRule!.id) as CursorRule;
            const cursorImageData = await db.table('cursorImageData').get(rule!.id);
            Object.keys(rule.cursor).forEach((cursorType) => {
                rule.cursor[cursorType].data = cursorImageData.data[cursorType];
            });
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: setCursor,
                args: [rule.cursor, extensionUrl, force]
            });
        } else if (force) {
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: setCursor,
                args: [{}, extensionUrl, force]
            });
        }
    });
}