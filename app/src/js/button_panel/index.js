import {el} from '@fxi/el';
//import {getDictItem} from '../mx_helper_language.js';
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
  container_style: {
    maxHeight: '50%',
    maxWidth: '50%'
  }
};

class ButtonPanel {
  constructor(opt) {
    this.opt = Object.assign({}, options, opt);
    this.ls = new ListenerStore();
    this.init();
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
          class: ['button-panel']
        },
        (this.elTitle = el('span', {
          class: 'button-panel-title',
          dataset: {
            lang_key: this.opt.title_lang_key
          }
        })),
        /**
         * Where the panel will appear
         */
        (this.elPanelContent = el('div', {
          class: 'button-panel-content'
        }))
      ))
    );
    this.setTitle();
    this.setButtonLabel();
  }

  init() {
    this.build();
    this.opt.elContainer.appendChild(this.el);
    this.ls.addListener({
      target: this.elBtnPanel,
      bind: this,
      callback: this.toggle,
      group: 'base',
      type: 'click'
    });
  }

  setTitle(txt) {
    txt = txt || this.opt.title_text;
    txtResolve(txt).then((t) => {
      this.elTitle.innerText = t;
    });
  }

  setButtonLabel(txt) {
    txt = txt || this.opt.button_text;
    txtResolve(txt).then((t) => {
      this.elButton.setAttribute('aria-label', t);
    });
  }

  destroy() {
    this.el.remove();
    this.ls.destroy();
  }

  isActive() {
    return this.el.classList.contains('active');
  }

  open() {
    if (!this.isActive()) {
      this.el.classList.add('active');
    }
  }
  close() {
    if (this.isActive()) {
      this.el.classList.remove('active');
    }
  }
  toggle() {
    if (this.isActive()) {
      this.close();
    } else {
      this.open();
    }
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
