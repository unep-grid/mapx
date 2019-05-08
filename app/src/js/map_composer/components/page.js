import {el} from '@fxi/el';
import {Box} from './box.js';
import {Item} from './item.js';

class Page extends Box {
  constructor(boxParent) {
    super(boxParent);
    var page = this;
    var state = page.state;
    page.title = 'page';
    page.init({
      class: ['mc-page'],
      content: page.buildEl(),
      boxContainer: boxParent,
      boxRestrict: boxParent,
      draggable: false,
      resizable: true,
      onRemove: page.onRemove.bind(page),
      onResize: page.onResize.bind(page),
      width: state.page_width,
      height: state.page_height
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
    return el('div', {
      class: 'mc-page-content'
    });
  }

  addItems() {
    var page = this;
    page.items = page.state.items.map((config) => {
      return new Item(page, config);
    });
  }

  placeItems() {
    var page = this;
    let y = 0;
    page.items.forEach((i) => {
      y += i.setY(y);
    });
  }
}

export {Page};
