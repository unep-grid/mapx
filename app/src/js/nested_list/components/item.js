import {NestedList} from '../index.js';

class Item {
  constructor(opt, li) {
    if (!(li instanceof NestedList)) {
      throw new Error('NestedList instance not valid');
    }
    let item = this;
    item.opt = opt;
    item.li = li;
    item.id = opt.id || li.randomId();
    item.build();
  }

  build() {
    let item = this;
    let li = item.li;
    let opt = item.opt;
    let cl = [
      li.opt.class.base,
      li.opt.class.draggable,
      li.opt.class.item
    ];
   
    let hasContentElement = li.isElement(opt.content);
    item.elContent = null;

    item.el = li.el('div', {
      id: item.id,
      draggable: true,
      class: cl
    });
 
    item.elContent = li.el('div', {
      class: li.opt.class.itemContent
    });

    item.el.appendChild(item.elContent);
    
    if (hasContentElement) {
      item.elContent.appendChild(opt.content);
    }

    /**
    * Keep an instance attached to element ? mmh, why not
    */
   item.el._instance = item;
  }
}

export {Item};
