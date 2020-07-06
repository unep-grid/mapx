import {el} from '@fxi/el';
import {ListenerStore} from '../listener_store/index.js';
import './style.css';

const options = {
  elContainer: document.body,
  title_text: 'Title',
  title_lang_key: 'title',
  button_lang_key: 'button',
  button_text: 'Toggle',
  button_classes: ['fa', 'fa-list-ul'],
  position: 'top-right',
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
    panel.setTitle();
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
    this.el = el(
      'div',
      {
        class: ['button-panel-container', `button-panel--${this.opt.position}`],
        style: this.opt.container_style
      },
      (this.elBtnPanel = el(
        'div',
        {
          class: ['button-panel-btn', 'shadow'],
          dataset: {
            lang_key: this.opt.button_lang_key,
            lang_type: 'tooltip',
            button_panel_action: 'toggle'
          }
        },
        el('span', {
          class: ['button-panel-btn-icon'].concat(this.opt.button_classes)
        })
      )),
      (this.elPanel = el(
        'div',
        {
          class: [
            'button-panel',
            'shadow',
            this.opt.panelFull ? 'button-panel-full' : null
          ]
        },
        /**
         * Panel title
         */
        (this.elTitle = el('span', {
          class: 'button-panel-title',
          dataset: {
            lang_key: this.opt.title_lang_key
          }
        })),
        /**
         * Where the content will appear
         */
        (this.elPanelContent = el('div', {
          class: 'button-panel-content'
        }))
      )),
      /**
       * Handles / Buttons
       */
      (this.elHandles = el(
        'div',
        {
          class: 'button-panel--handles'
        },

        /**
         * Top Left
         */
        el(
          'div',
          {
            class: 'button-panel--handle-group-top-left'
          },
          el('div', {
            class: [
              'button-panel--handle',
              'button-panel--handle-resizer',
              'fa',
              'fa-circle'
            ],
            dataset: {action: 'resize', type: 'free', corner: 'top-left'}
          }),
          el('div', {
            class: ['button-panel--handle', 'button-panel--handle-button'],
            dataset: {action: 'resize', type: 'auto', id: 'half-width'}
          }),
          el('div', {
            class: ['button-panel--handle', 'button-panel--handle-button'],
            dataset: {action: 'resize', type: 'auto', id: 'half-height'}
          }),
          el('div', {
            class: ['button-panel--handle', 'button-panel--handle-button'],
            dataset: {action: 'resize', type: 'auto', id: 'full'}
          })
        ),
        /**
         * Top right
         */
        el(
          'div',
          {
            class: 'button-panel--handle-group-top-right'
          },
          el('div', {
            class: [
              'button-panel--handle',
              'button-panel--handle-resizer',
              'fa',
              'fa-circle'
            ],
            dataset: {action: 'resize', type: 'free', corner: 'top-right'}
          })
        ),
        /**
         * bottom right
         */
        el(
          'div',
          {
            class: 'button-panel--handle-group-bottom-right'
          },
          el('div', {
            class: [
              'button-panel--handle',
              'button-panel--handle-resizer',
              'fa',
              'fa-circle'
            ],
            dataset: {action: 'resize', type: 'free', corner: 'bottom-right'}
          })
        ),
        /**
         * Bottom left
         */
        el(
          'div',
          {
            class: 'button-panel--handle-group-bottom-left'
          },
          el('div', {
            class: [
              'button-panel--handle',
              'button-panel--handle-resizer',
              'fa',
              'fa-circle'
            ],
            dataset: {action: 'resize', type: 'free', corner: 'bottom-left'}
          })
        )
      ))
    );
  }

  setTitle(txt) {
    txt = txt || this.opt.title_text;
    if (txt) {
      txtResolve(txt).then((t) => {
        this.elTitle.innerText = t;
      });
    }
  }

  setButtonLabel(txt) {
    txt = txt || this.opt.button_text;
    txtResolve(txt).then((t) => {
      this.elBtnPanel.setAttribute('aria-label', t);
    });
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
    return this.el.parentElement.getBoundingClientRect();
  }

  resizeAuto(type) {
    const panel = this;
    panel.el.classList.add('animate');

    /**
     * Remove animate class according to
     * animate rules in css
     */
    setTimeout(() => {
      panel.el.classList.remove('animate');
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
        console.log(`Resize auto '${type}' not handled`);
    }

    panel.fire('resize-auto', type);
  }

  get width() {
    return this._width || this.el.getBoundingClientRect().width;
  }
  get height() {
    return this._height || this.el.getBoundingClientRect().height;
  }
  set width(w) {
    const panel = this;
    panel._width = Math.round(w / 10) * 10;
    panel.el.style.width = panel.width + 'px';
    setTimeout(() => {
      panel.fire('resize');
    }, 500);
  }
  set height(h) {
    const panel = this;
    panel._height = Math.round(h / 10) * 10;
    panel.el.style.height = panel.height + 'px';
    setTimeout(() => {
      panel.fire('resize');
    }, 500);
  }

  destroy() {
    const panel = this;
    panel.fire('destroy');
    panel.cb.length = 0;
    panel.el.remove();
    panel.ls.destroy();
  }
  hide() {
    const panel = this;
    panel.el.classList.add('button-panel--hidden');
    panel.fire('hide');
    panel._visible = false;
  }
  show() {
    const panel = this;
    panel.el.classList.remove('button-panel--hidden');
    const hasPanel = panel.opt.elContainer.contains(panel.el);
    if (!hasPanel) {
      panel.opt.elContainer.appendChild(panel.el);
    }
    panel.fire('show');
    panel._visible = true;
  }

  isActive() {
    return this.el.classList.contains('active');
  }

  open(skipFire) {
    const panel = this;
    if (!panel.isActive()) {
      panel.el.classList.add('active');
      if (!skipFire) {
        panel.fire('open');
      }
    }
  }
  close(skipFire) {
    const panel = this;
    if (panel.isActive()) {
      panel.el.classList.remove('active');
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
