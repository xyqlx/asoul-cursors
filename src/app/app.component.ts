import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { of } from 'rxjs';
import { CursorRule } from 'src/cursor-rule';
import { v4 as uuidv4 } from 'uuid';
import pako from 'pako';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less']
})
export class AppComponent implements OnInit {
  constructor(private cdRef: ChangeDetectorRef, private sanitizer: DomSanitizer) { }
  title = 'asoul-cursors';
  listOfData: any[] = [];
  currentRule?: CursorRule;
  currentRuleSizeSwitch?: { [cursorType: string]: boolean };
  enable = true;
  ngOnInit() {
    this.loadData();
  }
  // work for some image dataUrl
  public getSantizeUrl(url: string) {
    return this.sanitizer.bypassSecurityTrustUrl(url);
  }
  loadData() {
    let port = chrome.runtime.connect({
      name: "getAllRules"
    });
    port.onMessage.addListener((msg) => {
      this.listOfData = msg;
      this.cdRef.detectChanges();
    });
    port.postMessage({});
    port = chrome.runtime.connect({
      name: "getEnable"
    });
    port.onMessage.addListener((msg) => {
      this.enable = msg;
      this.cdRef.detectChanges();
    });
    port.postMessage({});
  }
  cursorTypes = ['default', 'pointer', 'text'];
  friendlyNames: { [cursorType: string]: string } = {
    'default': '默认',
    'pointer': '超链接',
    'text': '文本'
  };
  ruleModalVisible = false;
  loading = false;
  add() {
    this.currentRule = new CursorRule(
      uuidv4(),
      '',
      '',
      {
        'default': { data: '', center: { x: 0, y: 0 }, size: { width: 32, height: 32 } },
        'pointer': { data: '', center: { x: 0, y: 0 }, size: { width: 32, height: 32 } },
        'text': { data: '', center: { x: 0, y: 0 }, size: { width: 32, height: 32 } }
      }
    );
    this.currentRuleSizeSwitch = {
      'default': true,
      'pointer': true,
      'text': true
    }
    this.ruleModalVisible = true;
  }
  switchEnable(){
    const port = chrome.runtime.connect({
      name: "switchEnable"
    });
    port.onMessage.addListener((msg) => {
      
    });
    port.postMessage(this.enable);
  }
  handleOk() {
    this.save();
    this.ruleModalVisible = false;
    this.cdRef.detectChanges();
  }
  handleCancel() {
    this.ruleModalVisible = false;
    this.cdRef.detectChanges();
  }
  customUpload(cursorType: string) {
    return (item: any) => {
      const file = item.file;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.currentRule!.cursor[cursorType].data = reader.result as string;
      }
      reader.readAsDataURL(file);
      // idk which to return
      return of().subscribe();
    };
  }
  enableSize(cursorType: string) {
    return this.currentRule?.cursor[cursorType]?.size !== undefined;
  }
  switchSize(cursorType: string, enable: boolean) {
    if (enable) {
      this.currentRule!.cursor[cursorType].size = {
        width: 32,
        height: 32
      };
    } else {
      delete this.currentRule!.cursor[cursorType].size;
    }
  }
  save() {
    const port = chrome.runtime.connect({
      name: "addRule"
    });
    port.onMessage.addListener((msg) => {
      this.loadData();
    });
    port.postMessage(this.currentRule);
  }
  deleteRule(ruleId: string) {
    const port = chrome.runtime.connect({
      name: "deleteRule"
    });
    port.onMessage.addListener((msg) => {
      this.loadData();
    });
    port.postMessage({
      id: ruleId
    });
  }
  editRule(rule: CursorRule) {
    const port = chrome.runtime.connect({
      name: "getRule"
    });
    port.onMessage.addListener((msg) => {
      this.currentRule = msg;
      this.currentRuleSizeSwitch = {
        'default': this.enableSize('default'),
        'pointer': this.enableSize('pointer'),
        'text': this.enableSize('text')
      }
      this.ruleModalVisible = true;
      this.cdRef.detectChanges();
    });
    port.postMessage({ id: rule.id });
  }
  importData() {
    // 打开文件选择框
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json.gz';
    input.onchange = (e) => {
      const file = input.files![0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(reader.result as ArrayBuffer);
        // decompress data
        const decompressedData = pako.inflate(data, { to: 'string' });
        const json = JSON.parse(decompressedData);
        const port = chrome.runtime.connect({
          name: "importData"
        });
        port.onMessage.addListener((msg) => {
          this.loadData();
        });
        port.postMessage(json);
      }
      reader.readAsArrayBuffer(file);
    }
    input.click();
  }
  exportData() {
    const port = chrome.runtime.connect({
      name: "exportData"
    });
    port.onMessage.addListener((msg) => {
      const data = msg;
      // compress data to gzip
      const compressedData = pako.gzip(JSON.stringify(data));

      const blob = new Blob([compressedData], { type: 'application/x-gzip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // use datetime to avoid conflict
      a.download = `asoul-cursors${new Date().toISOString()}.json.gz`;
      a.click();
    });
    port.postMessage({});
  }
}
