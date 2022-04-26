function setCursor(extensionUrl: string, size?: {width: number, height: number}) {
    const existed = document.getElementById('asoul-cursor');
    if(existed) {
        return;
    }
    const cursor = document.createElement("img");
    const assetsUrl = extensionUrl + "assets";
    cursor.id = "asoul-cursor";
    cursor.src = assetsUrl + '/ava/9.gif';
    cursor.style.position = "absolute";
    cursor.style.pointerEvents = "none";
    cursor.style.zIndex = "9999";
    cursor.style.visibility = "hidden";
    if(size){
        cursor.style.width = size.width + "px";
        cursor.style.height = size.height + "px";
    }
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
        if(scrollFlag){
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
    document.addEventListener('mouseover', function(e){
        if(!inited){
            // document.documentElement.style.cursor = 'none';
            cursor.style.visibility = 'visible';
            inited = true;
        }
        if(e.target){
            if(lastTarget){
                if(lastCursorType !== 'none' && lastCursorType !== 'auto' && lastCursorType !== 'default'){ 
                    // 这句可能会导致 Forced reflow while executing JavaScript took 54ms
                    lastTarget.style.cursor = lastCursorType;
                }
            }
            lastTarget = e.target as any;
            let cursorType = lastTarget!.style.cursor;
            if(cursorType === ''){
                cursorType = window.getComputedStyle(e.target as any)["cursor"];
            }
            (e.target as any).style.cursor = 'none';
            if(lastCursorType === cursorType){
                return;
            }
            lastCursorType = cursorType;
            if(cursorType === 'pointer'){
                cursor.style.visibility = "visible";
                cursor.src = assetsUrl + '/ava/4.gif';
            }
            else if(cursorType === 'auto' || cursorType === 'default' || cursorType === 'none'){
                cursor.style.visibility = "visible";
                cursor.src = assetsUrl + '/ava/9.gif';
            }else if(cursorType === 'text'){
                cursor.style.visibility = "visible";
                cursor.src = assetsUrl + '/ava/14.gif';
            } else{
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
    chrome.tabs.get(tabId, (tab) => {
        const tabUrl = tab.url;
        // if tabUrl regex match https or http
        if (!tabUrl || !tabUrl.match(/^https?:\/\//)) {
            return;
        }
        const extensionUrl = chrome.runtime.getURL("");
        const code = `html {
            cursor: none;
        }`;
        // chrome.scripting.insertCSS({ css: code, target: { tabId: tabId } });
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: setCursor,
            args: [extensionUrl, {width: 80, height: 80}]
        });
    });
}