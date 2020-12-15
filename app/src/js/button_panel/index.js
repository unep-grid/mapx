//import {el} from '@fxi/el';
import {el} from './../el/src/index.js';
import {ListenerStore} from '../listener_store/index.js';
import './style.less';

const options = {
  elContainer: document.body,
  button_text: 'Toggle',
  button_lang_key: null,
  button_classes: ['fa', 'fa-list-ul'],
  position: 'top-right',
  tooltip_position : 'bottom-left',
  container_style: {},
  add: true
};

class ButtonPanel {
  constructor(opt) {
    const panel = this;
    panel.opt = Object.assign({}, options, opt);
    panel.ls = new ListenerStore();
    panel.init();
  }

  init() {
    const panel = this;
    panel.cb = [];
    panel.build();
    //panel.setTitle();
    panel.setButtonLabel();
    panel.show();
    panel.ls.addListener({
      target: panel.elBtnPanel,
      bind: panel,
      callback: panel.toggle,
      group: 'base',
      type: 'click'
    });
    panel.ls.addListener({
      target: panel.elHandles,
      bind: panel,
      callback: panel.handleResize,
      group: 'base',
      type: 'mousedown'
    });
  }

  fire(type, data) {
    const panel = this;
    panel.cb.forEach((c) => {
      if (c.type === type) {
        c.cb(panel, data);
      }
    });
  }

  on(type, cb) {
    const panel = this;
    const item = panel.cb.reduce((a, c) => {
      return a || (c.type === type && c.cb === cb ? c : a);
    }, false);
    if (!item) {
      panel.cb.push({
        type: type,
        cb: cb
      });
    }
  }
  off(type, cb) {
    const panel = this;
    const item = panel.cb.reduce((a, c) => {
      return a || (c.type === type && c.cb === cb ? c : a);
    }, false);
    if (item) {
      const pos = panel.cb.indexOf(item);
      panel.cb.splice(pos, 1);
    }
  }

  build() {
    const panel = this;
    const elMain = panel.opt.elContainer.querySelector(`.button-panel--main`);

    if (!elMain) {
      panel.elMain = panel._el_main();
      panel.opt.elContainer.appendChild(panel.elMain);
    } else {
      panel.elMain = elMain;
    }

    panel.elContainer = el(
      'div',
      {
        class: [
          'button-panel--container',
          `button-panel--${panel.opt.position}`
        ],
        style: panel.opt.container_style
      },
      (panel.elBtnPanel = el(
        'div',
        {
          class: [
            'button-panel--btn',
            `button-panel--${panel.opt.position}`,
            'hint',
            `hint--${panel.opt.tooltip_position}`,
            'buttin-panel--sahdow'
          ],
          dataset: {
            lang_key: panel.opt.button_lang_key,
            lang_type: 'tooltip',
            button_panel_action: 'toggle'
          }
        },
        el('span', {
          class: ['button-panel--btn-icon'].concat(panel.opt.button_classes)
        }),
        (panel.elBtnFlag = el('span', {
          class: ['button-panel--btn-flag', 'button-panel--hidden']
        }))
      )),
      (panel.elPanel = el(
        'div',
        {
          class: [
            'button-panel--item',
            panel.opt.panelFull ? 'button-panel--item-full' : null
          ]
        },
        /**
         * Where the content will appear
         */
        (panel.elPanelContent = el('div', {
          class: ['button-panel--item-content','shadow','button-panel--shadow']
        })),
        /**
         * Handles / Buttons
         */
        (panel.elHandles = el(
          'div',
          {
            class: 'button-panel--item-handles'
          },

          /**
           * Top Left
           */
          panel._el_handles('top-left'),
          panel._el_handles('top-right'),
          panel._el_handles('bottom-right'),
          panel._el_handles('bottom-left')
        ))
      ))
    );
    panel.elMain.appendChild(panel.elContainer);
  }

  _el_main() {
    //const panel = this;
    return el(
      'div',
      {
        class: `button-panel--main`
      }
      /*el(*/
      //'div',
      //{
      //class: `button-panel--main-top`
      //},
      //(panel.elPanelMainTopLeft = el('div', {
      //class: `button-panel--main-top-left`
      //})),
      //(panel.elPanelMainTopRight = el('div', {
      //class: `button-panel--main-top-right`
      //}))
      //),
      //el(
      //'div',
      //{
      //class: `button-panel--main-bottom`
      //},
      //(panel.elPanelMainBottomLeft = el('div', {
      //class: `button-panel--main-bottom-left`
      //})),
      //(panel.elPanelMainBottomRight = el('div', {
      //class: `button-panel--main-bottom-right`
      /*}))*/
      //)
    );
  }

  _el_handles(pos) {
    const panel = this;
    if (pos === panel.opt.position) {
      return; // no handles near the button
    }
    const p = pos.split('-');
    const loc = p[0]; // top, bottom
    const side = p[1]; // left right
    const op = `${loc === 'top' ? 'bottom' : 'top'}-${
      side === 'left' ? 'right' : 'left'
    }`;
    const elResizes = panel._el_resize_btns(op);
    const elFree = panel._el_resize(pos);
    const cl = ['button-panel--item-handles-group', `button-panel--${pos}`];
    if (loc === 'top') {
      return el(
        'div',
        {
          class: cl
        },
        elFree,
        elResizes
      );
    } else {
      return el(
        'div',
        {
          class: cl
        },
        elResizes,
        elFree
      );
    }
  }

  _el_resize(pos) {
    return el('div', {
      class: ['button-panel--item-handle', 'fa', 'fa-circle'],
      dataset: {action: 'resize', type: 'free', corner: pos}
    });
  }

  _el_resize_btns(pos) {
    const panel = this;
    const add = panel.opt.position === pos;
    const elGroup = new DocumentFragment();
    if (add) {
      elGroup.appendChild(
        el('div', {
          class: [
            'button-panel--item-handle',
            'button-panel--item-handle-button'
          ],
          dataset: {action: 'resize', type: 'auto', id: 'half-width'}
        })
      );
      elGroup.appendChild(
        el('div', {
          class: [
            'button-panel--item-handle',
            'button-panel--item-handle-button'
          ],
          dataset: {action: 'resize', type: 'auto', id: 'half-height'}
        })
      );
      elGroup.appendChild(
        el('div', {
          class: [
            'button-panel--item-handle',
            'button-panel--item-handle-button'
          ],
          dataset: {action: 'resize', type: 'auto', id: 'full'}
        })
      );
    }
    return elGroup;
  }

  /*setTitle(txt) {*/
    //txt = txt || this.opt.title_text;
    //if (txt) {
      //if (txt instanceof Element) {
        //this.elTitle.innerHtml = '';
        //this.elTitle.appendChild(txt);
      //} else {
        //txtResolve(txt).then((t) => {
          //this.elTitle.innerHtml = t;
        //});
      //}
    //}
  /*}*/

  setButtonLabel(txt) {
    txt = txt || this.opt.button_text;
    txtResolve(txt).then((t) => {
      this.elBtnPanel.setAttribute('aria-label', t);
    });
  }

  showFlag() {
    const panel = this;
    if (!panel.isActive()) {
      this.elBtnFlag.classList.remove('button-panel--hidden');
    }
  }

  hideFlag() {
    this.elBtnFlag.classList.add('button-panel--hidden');
  }

  handleResize(e) {
    const panel = this;
    const target = e.target;

    if (target.dataset.action !== 'resize') {
      return;
    }

    if (target.dataset.type === 'auto') {
      panel.resizeAuto(target.dataset.id);
      return;
    }

    e.preventDefault();
    panel._resize = {
      rect: panel.elPanel.getBoundingClientRect(),
      x: e.clientX,
      y: e.clientY,
      corner: target.dataset.corner,
      position: panel.opt.position
    };

    panel.ls.addListener({
      target: window,
      bind: panel,
      callback: () => {
        panel.ls.removeListenerByGroup('resize');
        panel._rect = null;
      },
      group: 'resize',
      type: ['mouseup', 'mouseleave', 'contextmenu', 'dblclik']
    });

    panel.ls.addListener({
      target: window,
      bind: panel,
      callback: panel.resize,
      group: 'resize',
      type: 'mousemove',
      debounce: true,
      debouceTime: 100
    });
  }

  resize(e) {
    const panel = this;
    const orig = panel._resize;
    const a = posCornerResolver(orig.position, orig.corner);

    if (a.w_allow) {
      const dW = orig.x - e.clientX;
      const newW = orig.rect.width + (a.w_dir ? -dW : dW);
      panel.width = newW;
    }
    if (a.h_allow) {
      const dH = orig.y - e.clientY;
      const newH = orig.rect.height + (a.h_dir ? -dH : dH);
      panel.height = newH;
    }
  }

  get rectParent() {
    return this.elContainer.parentElement.getBoundingClientRect();
  }

  resizeAuto(type) {
    const panel = this;
    panel.elContainer.classList.add('button-panel--container-animate');

    /**
     * Remove animate class according to
     * animate rules in css
     */
    setTimeout(() => {
      panel.elContainer.classList.remove('button-panel--container-animate');
    }, 500);

    /**
     * Solve bug where the first animation did not work
     */
    panel.width = panel.width - 1;
    panel.height = panel.height - 1;

    /**
     * Animate
     */
    switch (type) {
      case 'half-width':
        panel.width = panel.rectParent.width / 2;
        panel.height = panel.rectParent.height;
        break;
      case 'half-height':
        panel.width = panel.rectParent.width;
        panel.height = panel.rectParent.height / 2;
        break;
      case 'full':
        panel.width = panel.rectParent.width;
        panel.height = panel.rectParent.height;
        break;
      default:
        console.warn(`Resize auto '${type}' not handled`);
    }

    panel.fire('resize-auto', type);
  }

  get width() {
    return this._width || this.elContainer.getBoundingClientRect().width;
  }
  get height() {
    return this._height || this.elContainer.getBoundingClientRect().height;
  }
  set width(w) {
    const panel = this;
    panel._width = Math.round(w / 10) * 10;
    panel.elContainer.style.width = panel.width + 'px';
    setTimeout(() => {
      panel.fire('resize');
    }, 500);
  }
  set height(h) {
    const panel = this;
    panel._height = Math.round(h / 10) * 10;
    panel.elContainer.style.height = panel.height + 'px';
    setTimeout(() => {
      panel.fire('resize');
    }, 500);
  }
  resetStyle() {
    const panel = this;
    panel.width = 10;
    panel.height = 10;
    for (var s in panel.opt.container_style) {
      panel.elContainer.style[s] = panel.opt.container_style[s];
    }
  }

  destroy() {
    const panel = this;
    panel.fire('destroy');
    panel.cb.length = 0;
    panel.elContainer.remove();
    panel.ls.destroy();
  }

  get _visible() {
    const panel = this;
    return !panel.elContainer.classList.contains('button-panel--hidden');
  }

  hide() {
    const panel = this;
    panel.elContainer.classList.add('button-panel--hidden');
    panel.fire('hide');
  }

  show() {
    const panel = this;
    panel.elContainer.classList.remove('button-panel--hidden');
    panel.fire('show');
  }

  isActive() {
    return this.elContainer.classList.contains('active');
  }

  open(skipFire) {
    const panel = this;
    if (!panel.isActive()) {
      panel.hideFlag();
      panel.elContainer.classList.add('active');
      if (!skipFire) {
        panel.fire('open');
      }
    }
  }
  close(skipFire) {
    const panel = this;
    if (panel.isActive()) {
      panel.elContainer.classList.remove('active');
      panel.resetStyle();
      if (!skipFire) {
        panel.fire('close');
      }
    }
  }
  toggle() {
    const panel = this;
    if (panel.isActive()) {
      panel.close();
    } else {
      panel.open();
    }
  }
  isEmpty() {
    return this.elPanelContent.childElementCount === 0;
  }
}

function txtResolve(txt) {
  return new Promise((resolve) => {
    if (txt instanceof Promise) {
      txt.then((t) => {
        resolve(t);
      });
    } else {
      resolve(txt);
    }
  });
}

export {ButtonPanel};

function posCornerResolver(position, corner) {
  const d = [
    {
      position: 'bottom-left',
      corner: 'bottom-right',
      h_allow: false,
      w_allow: true,
      w_dir: true,
      h_dir: false
    },
    {
      position: 'bottom-left',
      corner: 'top-left',
      h_allow: true,
      w_allow: false,
      w_dir: true,
      h_dir: false
    },
    {
      position: 'bottom-left',
      corner: 'top-right',
      h_allow: true,
      w_allow: true,
      w_dir: true,
      h_dir: false
    },
    {
      position: 'bottom-right',
      corner: 'bottom-left',
      h_allow: false,
      w_allow: true,
      w_dir: false,
      h_dir: false
    },
    {
      position: 'bottom-right',
      corner: 'top-left',
      h_allow: true,
      w_allow: true,
      w_dir: false,
      h_dir: false
    },
    {
      position: 'bottom-right',
      corner: 'top-right',
      h_allow: true,
      w_allow: false,
      w_dir: false,
      h_dir: false
    },
    {
      position: 'top-left',
      corner: 'bottom-left',
      h_allow: true,
      w_allow: false,
      w_dir: true,
      h_dir: true
    },
    {
      position: 'top-left',
      corner: 'bottom-right',
      h_allow: true,
      w_allow: true,
      w_dir: true,
      h_dir: true
    },
    {
      position: 'top-left',
      corner: 'top-right',
      h_allow: false,
      w_allow: true,
      w_dir: true,
      h_dir: true
    },
    {
      position: 'top-right',
      corner: 'bottom-right',
      h_allow: true,
      w_allow: false,
      w_dir: false,
      h_dir: true
    },
    {
      position: 'top-right',
      corner: 'bottom-left',
      h_allow: true,
      w_allow: true,
      w_dir: false,
      h_dir: true
    },
    {
      position: 'top-right',
      corner: 'top-left',
      h_allow: false,
      w_allow: true,
      w_dir: false,
      h_dir: true
    }
  ];
  return (
    d.reduce((a, x) => {
      return !a && x.position === position && x.corner === corner ? x : a;
    }, false) || {}
  );
}
