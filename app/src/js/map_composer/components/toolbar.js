import {el} from '@fxi/el';
import html2canvas from 'html2canvas';
import download from 'downloadjs';
import {Box} from './box.js';

class Toolbar extends Box {
  constructor(parent) {
    super(parent);
    var toolbar = this;
    toolbar.init({
      class: ['mc-toolbar'],
      elContainer: parent.elContent,
      elContent: toolbar.buildEl(),
      draggable: false,
      resizable: false,
      onRemove: toolbar.onRemove.bind(toolbar),
      onResize: toolbar.onResize.bind(toolbar)
    });
    toolbar.mc = parent;
  }

  buildEl() {
    var toolbar = this;
    return el(
      'form',
      {
        class: 'mc-toolbar-content'
      },
      el(
        'div',
        {
          class: 'checkbox'
        },
        el(
          'label',
          el('input', {
            type: 'checkbox',
            checked: true,
            on: {
              input: toolbar.toggleModeLayout.bind(toolbar)
            }
          }),
          el('span', 'Layout mode')
        )
      ),
      el(
        'div',
        {
          class: 'form-group'
        },
        el('label', 'Resolution'),
        el('input', {
          type: 'numeric',
          class: 'form-control',
          on: {
            change: toolbar.updateDpi.bind(toolbar)
          },
          value: toolbar.options.print.dpi,
          max: 300,
          min: 72
        })
      ),
      el(
        'div',
        {
          class: 'form-group'
        },
        el('label', 'Scale'),
        el('input', {
          type: 'numeric',
          class: 'form-control',
          on: {
            change: toolbar.updateScale.bind(toolbar)
          },
          value: 1,
          max: 1,
          min: 0.2
        })
      ),
      el(
        'div',
        {
          class: 'form-group'
        },
        el('label', 'Legend columns'),
        el('input', {
          type: 'numeric',
          class: 'form-control',
          on: {
            change: toolbar.updateLegendColumnCount.bind(toolbar)
          },
          value: 1,
          max: 10,
          min: 1
        })
      ),
      el(
        'button',
        {
          type: 'button',
          class: ['btn', 'btn-default'],
          on: {
            click: toolbar.download.bind(toolbar)
          }
        },
        'Export image'
      )
    );
  }

  onRemove() {}

  toggleModeLayout(e) {
    var toolbar = this;
    var mc = toolbar.mc;
    var modeLayout = e.target.checked;
    if (modeLayout) {
      mc.setMode('layout');
    } else {
      mc.setMode('normal');
    }
  }

  updateDpi(e) {
    e.stopPropagation();
    var mc = this.mc;
    var dpi = validateValueNumeric(e.target);
    mc.setDpi(dpi);
  }

  updateScale(e) {
    e.stopPropagation();
    var mc = this.mc;
    var scale = validateValueNumeric(e.target);
    mc.setScale(scale);
  }

  updateLegendColumnCount(e) {
    e.stopPropagation();
    var mc = this.mc;
    var n = validateValueNumeric(e.target);
    mc.setLegendColumnCount(n);
  }

  download() {
    var mc = this.mc;
    var workspace = mc.workspace;
    var page = workspace.page;
    var elPrint = page.el;
    var curMode = mc.mode;

    mc.setMode('print')
      .then(() => {
        return html2canvas(elPrint);
      })
      .then((canvas) => {
        var data = canvas.toDataURL('image/png');
        download(data, 'map-composer-export.png', 'image/png');
        mc.setMode(curMode);
      })
      .catch((e) => {
        alert('Oups, something went wrong during the rendering, please read the console log.');
        console.warn(e);
        mc.setMode(curMode);
      });
  }
}

export {Toolbar};

function validateValueNumeric(el) {
  var value = el.value * 1;
  var min = el.min * 1;
  var max = el.max * 1;
  if (value >= max) {
    value = max;
  }
  if (value <= min) {
    value = min;
  }
  el.value = value;
  return value;
}
