import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less']
})
export class AppComponent implements OnInit {
  title = 'asoul-cursors';
  listOfData: any[] = [];
  ngOnInit() {
    const port = chrome.runtime.connect({
      name: "getData"
    });
    port.postMessage({});
    port.onMessage.addListener((msg) => {
      this.listOfData = msg;
    });
  }
}
