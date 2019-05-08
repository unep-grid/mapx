import {el} from '@fxi/el';
import {Page} from './page.js';
import {Box} from './box.js';

class Workspace extends Box {
  constructor(boxParent) {
    super(boxParent);
    var workspace = this;
    workspace.title = "workspace";  
    workspace.init({
      class : ['mc-workspace'],
      boxContainer: boxParent,
      elContent: workspace.buildEl(),
      draggable: false,
      resizable: false,
      onRemove : workspace.onRemove.bind(workspace)
    });

    workspace.page = new Page(workspace);
  }

  onRemove() {
    var ws = this;
    ws.page.destroy();
  }

  buildEl() {
    return el('div', {class: ['mc-workspace-content']});
  }
}

export {Workspace};
