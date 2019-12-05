import {el} from '@fxi/el';
import {Box} from './box.js';
import {Item} from './item.js';
import download from 'downloadjs';
import html2canvas from 'html2canvas';

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
      boxBound: boxParent,
      boundEdges: {top: true, left: true, bottom: false, right: false},
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
    var page = this;
    var mc = page.mc;
    page.displayDim();
    var w = Math.round(page.toLengthUnit(page.width));
    var h = Math.round(page.toLengthUnit(page.height));
    page.mc.toolbar.elInputPageWidth.value = w;
    page.mc.toolbar.elInputPageHeight.value = h;
    mc.setState('page_width', w);
    mc.setState('page_height', h);
  }

  onRemove() {
    var page = this;
    page.items.forEach((i) => {
      i.destroy();
    });
  }

  exportPng() {
    var page = this;
    var mc = page.mc;
    var elPrint = page.el;
    var curMode = mc.state.mode;
    var curDpi = mc.state.dpi;

    mc.setMode('print')
      .then(() => {
        return html2canvas(elPrint, {
          logging: false
        });
      })
      .then((canvas) => {
        var data = canvas.toDataURL('image/png');
        mc.setDpi();
        return download(data, 'map-composer-export.png', 'image/png');
      })
      .then(() => {
        mc.setMode(curMode);
        setTimeout(() => {
          mc.setDpi(curDpi);
        }, 100);
      })
      .catch((e) => {
        mc.displayWarning(
          'Oups, something went wrong during the rendering, please read the console log.'
        );
        console.warn(e);
        mc.setMode(curMode);
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
    let x = 0;
    var g = page.state.grid_snap_size * 10;
    page.items.forEach((i) => {
      i.setTopLeft({
        top: y,
        left: x,
        inPx: true
      });
      x += g;
      y += g;
    });
  }
}

export {Page};
