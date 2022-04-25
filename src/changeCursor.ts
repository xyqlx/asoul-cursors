function setCursor(extensionUrl: string, size?: {width: number, height: number}) {
    const cursor = document.createElement("img");
    const assetsUrl = extensionUrl + "assets";
    cursor.src = assetsUrl + '/ava/9.gif';
    cursor.style.position = "absolute";
    cursor.style.pointerEvents = "none";
    cursor.style.zIndex = "9999";
    cursor.style.visibility = "hidden";
    cursor.style.cursor = "none";
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
    const onmousemove = (e: any) => {
        cursor.style.left = e.pageX + "px";
        cursor.style.top = e.pageY + "px";
        lastX = e.pageX;
        lastY = e.pageY;
        offsetX = window.scrollX;
        offsetY = window.scrollY;
    };
    window.addEventListener("mousemove", onmousemove);
    document.addEventListener("dragover", onmousemove);
    window.addEventListener("scroll", (e) => {
        if (lastX === -1 || lastY === -1) {
            return;
        }
        cursor.style.left = lastX + window.scrollX - offsetX + "px";
        cursor.style.top = lastY + window.scrollY - offsetY + "px";
    });
    let inited = false;
    let lastTarget: HTMLElement | null = null;
    let lastCursorType = 'none';
    document.addEventListener('mouseover', function(e){
        if(!inited){
            // document.documentElement.style.cursor = 'none';
            cursor.style.visibility = 'visible';
            inited = true;
        }
        if(e.target){
            if(lastTarget){
                lastTarget.style.cursor = lastCursorType;
            }
            const cursorType = window.getComputedStyle(e.target as any)["cursor"];
            lastTarget = e.target as any;
            lastCursorType = cursorType;
            (e.target as any).style.cursor = 'none';
            if(cursorType === 'pointer'){
                cursor.src = assetsUrl + '/ava/4.gif';
            }
            else if(cursorType === 'auto' || cursorType === 'default' || cursorType === 'none'){
                cursor.src = assetsUrl + '/ava/9.gif';
            }else{
                console.log(cursorType);
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