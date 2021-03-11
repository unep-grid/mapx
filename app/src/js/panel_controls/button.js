//import {el} from '@fxi/el';
import {el} from '../el/src/index.js';
import {getDictItem} from './../mx_helpers.js';
import {ButtonCircle} from './../icon_flash/index.js';
import {bindAll} from './../bind_class_methods/index.js';
import {EventSimple} from '../listener_store/index.js';
import {shake} from '../elshake/index.js';

class Button extends EventSimple {
  constructor(opt) {
    super();
    const btn = this;
    const def = {
      action: () => {},
      classesButton: [],
      classesIcon: [],
      key: null,
      display: true
    };
    bindAll(btn);
    btn.opt = Object.assign({}, def, opt);
    btn.init();
    btn.build();
  }

  init() {
    const btn = this;
    const hasFun = btn.opt.action instanceof Function;
    if (!hasFun) {
      btn.opt.action = () => {};
    }
    btn.opt.action = btn.opt.action.bind(btn);
  }

  get rect() {
    const btn = this;
    if (!btn.elButton) {
      return {};
    }
    return btn.elButton.getBoundingClientRect();
  }

  build() {
    const btn = this;
    const opt = btn.opt;

    /**
     * Build button ui.
     */
    btn.elButton = el(
      'div',
      {
        on: {click: btn.action},
        class: [
          'btn-ctrl--item',
          'btn',
          'btn-circle',
          'btn-circle-medium',
          'hint--left',
          'shadow',
          ...opt.classesButton
        ],
        dataset: {
          lang_key: opt.key,
          lang_type: 'tooltip'
        },
        'aria-label': getDictItem(opt.key)
      },
      el('div', {
        class: opt.classesIcon
      })
    );
    if (opt.display === false) {
      btn.hide();
    }
    /**
     * Initial tooltip text.
     * NOTE: el can ingest promises as children.
     */
    getDictItem(btn.opt.key).then((txt) =>
      btn.elButton.setAttribute('aria-label', txt)
    );
  }

  shake() {
    shake(this.elButton); 
  }

  action(event) {
    const btn = this;
    new ButtonCircle({
      x: event.clientX,
      y: event.clientY
    });
    btn.opt.action(event);
  }

  flash(event) {
    h.iconFlash({
      icon: 'circle-thin',
      duration: 600,
      scaleStart: 0.3,
      scaleEnd: 0.6,
      opacityStart: 0.05,
      opacityEnd: 0,
      x: event.clientX,
      y: event.clientY
    });
  }

  show() {
    this.elButton.style.display = 'flex';
    this.fire('show');
  }

  hide() {
    this.elButton.style.display = 'none';
    this.fire('hide');
  }

  destroy() {
    this.elButton.remove();
    this.fire('destroy');
  }
  isSmall() {
    return this.isSmallHeight() || this.isSmallWidth();
  }
  isSmallHeight() {
    return window.innerHeight < 800;
  }
  isSmallWidth() {
    return window.innerWidth < 800;
  }
}

export {Button};
