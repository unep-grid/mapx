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
    const btn = this;
    btn.opt = Object.assign({}, options, opt);
    btn.ls = new ListenerStore();
    btn.init();
  }

  init() {
    const btn = this;
    btn.cb = [];
    btn.build();
    btn.setTitle();
    btn.setButtonLabel();
    btn.show();
    btn.ls.addListener({
      target: btn.elBtnPanel,
      bind: btn,
      callback: btn.toggle,
      group: 'base',
      type: 'click'
    });
    btn.ls.addListener({
      target: btn.elHandles,
      bind: btn,
      callback: btn.handleResize,
      group: 'base',
      type: 'mousedown'
    });
  }

  fire(type) {
    const btn = this;
    btn.cb.forEach((c) => {
      if (c.type === type) {
        c.cb(btn);
      }
    });
  }

  on(type, cb) {
    const btn = this;
    const item = btn.cb.reduce((a, c) => {
      return a || (c.type === type && c.cb === cb ? c : a);
    }, false);
    if (!item) {
      btn.cb.push({
        type: type,
        cb: cb
      });
    }
  }
  off(type, cb) {
    const btn = this;
    const item = btn.cb.reduce((a, c) => {
      return a || (c.type === type && c.cb === cb ? c : a);
    }, false);
    if (item) {
      const pos = btn.cb.indexOf(item);
      btn.cb.splice(pos, 1);
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
    const btn = this;
    const target = e.target;

    if (target.dataset.action !== 'resize') {
      return;
    }

    if (target.dataset.type === 'auto') {
      btn.resizeAuto(target.dataset.id);
      return;
    }

    e.preventDefault();
    btn._resize = {
      rect: btn.elPanel.getBoundingClientRect(),
      x: e.clientX,
      y: e.clientY,
      corner: target.dataset.corner,
      position: btn.opt.position
    };

    btn.ls.addListener({
      target: window,
      bind: btn,
      callback: () => {
        btn.ls.removeListenerByGroup('resize');
        btn._rect = null;
      },
      group: 'resize',
      type: ['mouseup', 'mouseleave', 'contextmenu', 'dblclik']
    });

    btn.ls.addListener({
      target: window,
      bind: btn,
      callback: btn.resize,
      group: 'resize',
      type: 'mousemove',
      debounce: true,
      debouceTime: 100
    });
  }

  resize(e) {
    const btn = this;
    const orig = btn._resize;
    const a = posCornerResolver(orig.position, orig.corner);

    if (a.w_allow) {
      const dW = orig.x - e.clientX;
      const newW = orig.rect.width + (a.w_dir ? -dW : dW);
      btn.width = newW;
    }
    if (a.h_allow) {
      const dH = orig.y - e.clientY;
      const newH = orig.rect.height + (a.h_dir ? -dH : dH);
      btn.height = newH;
    }
  }

  get rectParent() {
    return this.el.parentElement.getBoundingClientRect();
  }

  resizeAuto(type) {
    const btn = this;
    btn.el.classList.add('animate');

    /**
     * Remove animate class according to
     * animate rules in css
     */
    setTimeout(() => {
      btn.el.classList.remove('animate');
    }, 500);

    /**
     * Solve bug where the first animation did not work
     */
    btn.width = btn.width - 1;
    btn.height = btn.height - 1;

    /**
     * Animate
     */
    if (type === 'half-width') {
      btn.width = btn.rectParent.width / 2;
      btn.height = btn.rectParent.height;
    } else if (type === 'half-height') {
      btn.width = btn.rectParent.width;
      btn.height = btn.rectParent.height / 2;
    } else if (type === 'full') {
      btn.width = btn.rectParent.width;
      btn.height = btn.rectParent.height;
    }
  }

  get width() {
    return this._width || this.el.getBoundingClientRect().width;
  }
  get height() {
    return this._height || this.el.getBoundingClientRect().height;
  }
  set width(w) {
    const btn = this;
    btn._width = Math.round(w / 10) * 10;
    btn.el.style.width = btn.width + 'px';
    setTimeout(() => {
      btn.fire('resize');
    }, 500);
  }
  set height(h) {
    const btn = this;
    btn._height = Math.round(h / 10) * 10;
    btn.el.style.height = btn.height + 'px';
    setTimeout(() => {
      btn.fire('resize');
    }, 500);
  }

  destroy() {
    const btn = this;
    btn.fire('destroy');
    btn.cb.length = 0;
    btn.el.remove();
    btn.ls.destroy();
  }
  hide() {
    const btn = this;
    btn.el.classList.add('button-panel--hidden');
    btn.fire('hide');
    btn._visible = false;
  }
  show() {
    const btn = this;
    btn.el.classList.remove('button-panel--hidden');
    const hasPanel = btn.opt.elContainer.contains(btn.el);
    if (!hasPanel) {
      btn.opt.elContainer.appendChild(btn.el);
    }
    btn.fire('show');
    btn._visible = true;
  }

  isActive() {
    return this.el.classList.contains('active');
  }

  open(skipFire) {
    const btn = this;
    if (!btn.isActive()) {
      btn.el.classList.add('active');
      if (!skipFire) {
        btn.fire('open');
      }
    }
  }
  close(skipFire) {
    const btn = this;
    if (btn.isActive()) {
      btn.el.classList.remove('active');
      if (!skipFire) {
        btn.fire('close');
      }
    }
  }
  toggle() {
    const btn = this;
    if (btn.isActive()) {
      btn.close();
    } else {
      btn.open();
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
