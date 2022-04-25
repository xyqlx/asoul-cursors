function setCursor(assetsUrl: string, size?: {width: number, height: number}) {
    const cursor = document.createElement("img");
    cursor.src = assetsUrl + '/ava/9.gif';
    cursor.style.position = "absolute";
    cursor.style.pointerEvents = "none";
    if(size){
        cursor.style.width = size.width + "px";
        cursor.style.height = size.height + "px";
    }
    // add listener to mousemove
    window.addEventListener("mousemove", (e) => {
        cursor.style.left = e.pageX + "px";
        cursor.style.top = e.pageY + "px";
    });
    let inited = false;
    document.addEventListener('mouseover',function(e){
        if(!inited){
            document.getElementsByTagName('html')[0].style.cursor = 'none';
            inited = true;
        }
        if(e.target){
            const cursorType = window.getComputedStyle(e.target as any)["cursor"]
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
        const assetsUrl = chrome.runtime.getURL("assets");
        const code = `html {
            cursor: none;
        }`;
        // chrome.scripting.insertCSS({ css: code, target: { tabId: tabId } });
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: setCursor,
            args: [assetsUrl, {width: 80, height: 80}]
        });
    });
}