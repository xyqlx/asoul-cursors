import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { of } from 'rxjs';
import { CursorRule } from 'src/cursor-rule';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less']
})
export class AppComponent implements OnInit {
  constructor(private cdRef: ChangeDetectorRef){}
  title = 'asoul-cursors';
  listOfData: any[] = [];
  currentRule?: CursorRule;
  currentRuleSizeSwitch?: { [cursorType: string]: boolean};
  ngOnInit() {
    this.loadData();
  }
  loadData(){
    const port = chrome.runtime.connect({
      name: "getAllRules"
    });
    port.onMessage.addListener((msg) => {
      this.listOfData = msg;
      this.cdRef.detectChanges();
    });
    port.postMessage({});
  }
  cursorTypes = ['default', 'pointer', 'text'];
  ruleModalVisible = false;
  loading = false;
  add(){
    this.currentRule = new CursorRule(
      uuidv4(),
      '怎么会是呢',
      '',
      {
        'default': { data: '', size: { width: 32, height: 32 } },
        'pointer': { data: '', size: { width: 32, height: 32 } },
        'text': { data: '', size: { width: 32, height: 32 } }
      }
    );
    this.currentRuleSizeSwitch = {
      'default': true,
      'pointer': true,
      'text': true
    }
    this.ruleModalVisible = true;
  }
  handleOk(){
    this.save();
    this.ruleModalVisible = false;
    this.cdRef.detectChanges();
  }
  handleCancel(){
    this.ruleModalVisible = false;
    this.cdRef.detectChanges();
  }
  customUpload(cursorType: string){
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
  enableSize(cursorType: string){
    return this.currentRule?.cursor[cursorType]?.size !== undefined;
  }
  switchSize(cursorType: string, enable: boolean){
    if(enable){
      this.currentRule!.cursor[cursorType].size = {
        width: 32,
        height: 32
      };
    }else{
      delete this.currentRule!.cursor[cursorType].size;
    }
  }
  save(){
    const port = chrome.runtime.connect({
      name: "addRule"
    });
    port.postMessage(this.currentRule);
    this.loadData();
  }
  deleteRule(ruleId: string){
    const port = chrome.runtime.connect({
      name: "deleteRule"
    });
    port.postMessage({
      id: ruleId
    });
    this.loadData();
  }
  editRule(rule: CursorRule){
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
    port.postMessage({id: rule.id});
  }
}
