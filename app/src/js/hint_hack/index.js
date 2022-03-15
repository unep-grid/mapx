import {isTouchDevice} from '../is_touch_device/index.js';
import {getDictItem} from '../language';

const def = {
  style: {
    width: '1px',
    height: '1px',
    position: 'absolute',
    overflow: 'visible',
    top: 0,
    left: 0,
    display: 'none',
    pointerEvents: 'none'
  },
  options: {
    delay: 1000
  }
};

class HintHack {
  constructor(opt) {
    const hh = this;
    hh.show = hh.show.bind(hh);
    hh.update = hh.update.bind(hh);
    hh.cancel = hh.cancel.bind(hh);
    hh.reset = hh.reset.bind(hh);
    hh.init(opt);
  }

  init(opt) {
    const hh = this;
    if (hh._init) {
      return;
    }
    hh.opt = Object.assign({}, def.options, opt);
    hh._el = document.createElement('span');
    hh._el_style = document.createElement('style');
    hh._el_style.innerText = `
    [class*="hint--"]:not(.hint--always)::after,
    [class*="hint--"]:not(.hint--always)::before {
      display: none;
    }`;
    hh._el_head = document.querySelector(`HEAD`);
    hh._el_head.appendChild(hh._el_style);
    if (isTouchDevice()) {
      return;
    }
    document.addEventListener('mouseenter', hh.update, true);
    document.addEventListener('mouseleave', hh.cancel, true);
    document.addEventListener('mousedown', hh.cancel, true);
    document.addEventListener('wheel', hh.cancel, true);
  }
  async update(e) {
    const hh = this;
    try {
      if (!e.target || !e.target.getAttribute || !e.target.className || !e.target.className.match) {
        return;
      }
      if (hh._target && hh._target.contains(e.target)) {
        return;
      }
      const isHint = !!e.target.className.match('hint--');
      
      if(!isHint){
        return;
      }

      let label = e.target.getAttribute('aria-label');
      let keyLabel = e.target.dataset.lang_key;
      if (!label) {
        label = await getDictItem(keyLabel);
      }
      if (label && isHint) {
        hh.cancel();
        hh._target = e.target;
        hh._label = label;
        hh._timeout_show = setTimeout(hh.show, hh.opt.delay);
      }
    } catch (e) {
      console.error(e);
      hh.cancel();
    }
  }
  reset() {
    const hh = this;
    hh._el.remove();
    hh._el.className = '';
    hh._target = null;
    hh._el.setAttribute('aria-label', '');
    hh.applyStyle(def.style);
  }
  applyStyle(style) {
    const hh = this;
    for (let p in style) {
      hh._el.style[p] = style[p];
    }
  }
  show() {
    const hh = this;
    if (hh._target) {
      const cls = hh._target.classList.entries();
      const pos = hh._target.getBoundingClientRect();
      for (let cl of cls) {
        let clName = cl[1];
        if (!!clName.match(/^hint--/)) {
          hh._el.classList.add(clName);
        }
      }
      hh._el.setAttribute('aria-label', hh._label);
      hh._el.classList.add('hint--always');

      hh.applyStyle({
        top: `${pos.top}px`,
        left: `${pos.left}px`,
        width: `${pos.width}px`,
        height: `${pos.height}px`,
        display: 'block'
      });
      document.body.appendChild(this._el);
    }
  }
  cancel() {
    const hh = this;
    clearTimeout(this._timeout_show);
    hh.reset();
  }
  destroy() {
    const hh = this;
    hh.reset();
    document.removeEventListener('mouseenter', hh.update);
    document.removeEventListener('mouse', hh.cancel);
    hh._el_style.remove();
  }
}

export {HintHack};
