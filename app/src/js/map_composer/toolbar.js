import {el} from '@fxi/el';
import html2canvas from 'html2canvas';
import download from 'downloadjs';

class Toolbar {
  constructor(options, parent) {
    this.container = parent;
    this.options = options;
    this.el = this.createEl();

    this.addAboveContainer();
  }

  createEl() {
    return el(
      'div',
      {
        class: ['mc-toolbar']
      },
      el(
        'span',
        {
          class: ['input-group-btn']
        },
        el(
          'label',
          {
            class: ['btn', 'btn-default']
          },
          el('input', {
            type: 'checkbox',
            checked: true,
            on: {
              input: this.toggleModeLayout.bind(this)
            }
          }),
          el('span', 'Layout mode')
        ),
        el(
          'button',
          {
            type: 'button',
            class: ['btn', 'btn-default'],
            on: {
              click: this.download.bind(this)
            }
          },
          'Export image'
        ),
        el('span', 'Resolution:'),
        el('input', {
          type: 'numeric',
          class: ['btn', 'btn-default'],
          on: {
            input: this.updateDpi.bind(this)
          },
          value: this.options.print.dpi,
          max: 300,
          min: 1
        })
      )
    );
  }

  addAboveContainer() {
    this.container.el.parentElement.insertBefore(this.el, this.container.el);
  }

  toggleModeLayout(e) {
    var modeLayout = e.target.checked;
    if (modeLayout) {
      this.container.setMode('layout');
    } else {
      this.container.setMode('normal');
    }
  }

  updateDpi(e) {
    e.stopPropagation();
    var mc = this.container;
    var dpi = e.target.value;
    if (dpi >= 600) {
      dpi = 300;
      e.target.value = dpi;
    }
    mc.options.print.dpi = dpi;
    mc.setDpi(dpi);
    mc.resizeEachMap();
  }
  download() {
    //page.container.updatePreview(canvas);
    var mc = this.container;
    var page = mc.page;
    var elPrint = page.el;
    var curMode = mc.mode;
    mc.setMode('print')
      .then(() => {
        console.log('convert to canvas');
        return html2canvas(elPrint);
      })
      .then((canvas) => {
        var data = canvas.toDataURL('image/png');
        download(data, 'map-composer-export.png', 'image/png');
        mc.setMode(curMode);
      })
      .catch((e) => {
        console.warn(e);
        mc.setMode(curMode);
      });
  }
}

export {Toolbar};
