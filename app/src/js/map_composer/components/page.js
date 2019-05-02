import {el} from '@fxi/el';
import {Box} from './box.js';
import {Item} from './item.js';

class Page extends Box {
  constructor(parent) {
    super(parent);

    var page = this;
    var layout = page.options.layout;
    page.workspace = parent;
    page.title = 'page'; 
    page.init({
      class: ['mc-page'],
      elContainer: page.workspace.elContent,
      elContent: page.buildEl(),
      boxRestrict : page.workspace, 
      draggable: false,
      resizable: true,
      onRemove : page.onRemove.bind(page),
      onResize: page.onResize.bind(page),
      width : layout.page.width,
      height : layout.page.height
    });

    page.addItems();
    page.placeItems();
  }

  onResize() {
    this.displayDim();
  }

  onRemove() {
    var page = this;
    page.items.forEach((i) => {
      i.destroy();
    });
  }

  buildEl() {
    return el('div',{
       class: 'mc-page-content'
    });
  }

  addItems() {
    var page = this;
    page.items = page.options.items.map((config) => {
      return new Item(page, config);
    });
  }


  placeItems() {
    var page = this;
    let y = 0;
    this.items.forEach((i) => {
      var res = page.options.layout.resolution;
      var v = y * res[1] + 'px';
      i.el.style.top = v;
      y += i.height;
    });
  }

}

export {Page};
