import {NestedList} from './index.js';
import {state} from './state.js';

let elTest = document.getElementById('test');


window.li = new NestedList(elTest, {
  id: 'demo',
  state: state,
  useStateStored : true,
  autoMergeState : true,
  onRenderItemContent: function(elContent,data) {
    let li = this;
    elTest = li.el("div",{style:{
      width : "100%",
    }},
    (`View ${data.id}`)
    );

    elContent.appendChild(elTest);
  }
});
