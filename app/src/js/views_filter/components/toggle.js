import {el} from '@fxi/el';
import {onNextFrame} from '../../animation_frame/index.js';

let settings = {
  onDestroy: () => {},
  onBuild: () => {},
  id: Math.random().toString(32),
  type: '',
  label: 'label',
  count: 0,
  animate: true,
  animateType: 'seq_counter' // or 'class'
};

class Toggle {
  constructor(opt) {
    let tgl = this;
    tgl.opt = Object.assign({}, settings, opt);
    tgl.id = opt.id;
    tgl._label = opt.label;
    tgl._label_key = opt.label_key;
    tgl._order = opt.order;
    tgl._type = opt.type;
    tgl._is_animating = false;
    tgl._destroyed = false;
    tgl._count = opt.count;
    tgl._count_displayed = 0;
    tgl.build();
  }

  destroy() {
    let tgl = this;
    if (tgl._destroyed || !tgl.el.parentElement) {
      return;
    }
    tgl.el.parentElement.removeChild(tgl.el);
    tgl.opt.onDestroy.bind(tgl)();
    tgl._destroyed = true;
  }

  getCountDisplayed() {
    return this._count_displayed * 1 || 0;
  }

  getCount() {
    return this._count * 1 || 0;
  }

  setOrder(i) {
    this._order = i || 0;
    this.el.style.order = this._order;
  }

  setCount(n) {
    let tgl = this;
    let nD = tgl.getCountDisplayed();

    tgl._count = n || 0;
    if (n === nD) {
      return;
    }
    let animate = tgl.opt.animate;
    let animating = tgl._isAnimating();

    if (animating || !animate) {
      tgl._setCountLabel(n);
    } else {
      tgl._animateCountUpdate(n);
    }
  }

  _setCountLabel(n) {
    this._count_displayed = n;
    this.elLabelCount.dataset.count = n;
  }

  _animateCountUpdate() {
    let tgl = this;
    let animSeqCounter = tgl.opt.animateType === 'seq_counter';
    if (animSeqCounter) {
      tgl._animateCountProg();
    } else {
      tgl._animateCountClass();
    }
  }
  _isAnimating() {
    return this._is_animating;
  }
  _setAnimating(enable) {
    let tgl = this;
    enable = enable || false;
    tgl._is_animating = enable;
  }

  _animateCountClass() {
    let tgl = this;
    tgl._setAnimating(true);
    tgl.elLabelCount.classList.add('updating');
    setTimeout(() => {
      onNextFrame(() => {
        let count = tgl.getCount();
        tgl._setCountLabel(count);
        tgl._setAnimating(false);
        tgl.elLabelCount.classList.remove('updating');
      });
    }, 500);
  }

  _animateCountProg() {
    let tgl = this;
    let c = 0;
    let inc = 1;
    let delta = 0;
    let count = 0;
    init();
    next();
    function next() {
      delta = d();
      count = tgl.getCount();
      if (delta !== 0) {
        tgl._setAnimating(true);
        inc = Math.ceil(Math.abs(delta) / 10);
        if (up()) {
          c += inc;
          c = c > count ? count : c;
        } else {
          c -= inc;
          c = c < 0 ? 0 : c;
        }
        tgl._setCountLabel(Math.ceil(c));
        onNextFrame(next);
      } else {
        tgl._setAnimating(false);
      }
    }
    function d() {
      return tgl.getCount() - tgl.getCountDisplayed();
    }
    function up() {
      return d() > 0;
    }
    function init() {
      c = tgl.getCountDisplayed();
    }
  }
  setLabel(txt) {
    let tgl = this;
    if (txt instanceof Promise) {
      txt.then((t) => {
        set(t);
      });
    } else {
      set(txt);
    }
    function set(txt) {
      let curTxt = tgl.elLabelText.innerText;
      if (txt !== curTxt) {
        if (!txt) {
          txt = curTxt;
        }
        tgl._label = txt;
        tgl.elLabelText.innerText = txt;
      }
    }
  }
  setLabelKey(key) {
    let tgl = this;
    tgl._label_key = key;
    tgl.elLabelText.dataset.lang_key = tgl._label_key;
  }
  getLabelKey() {
    return this._label_key;
  }
  getLabel() {
    this.setLabel();
    return this._label;
  }
  getType() {
    return this._type;
  }
  getId() {
    return this.id;
  }
  setType(type) {
    this._type = type;
    this.elLabelText.innerText = txt;
  }

  setState(val) {
    this.elCheck.checked = val === true;
  }

  getState() {
    return this.elCheck.checked === true;
  }

  build() {
    buildToggle.bind(this)();
    this.opt.onBuild.bind(this)();
  }
}

export {Toggle};

function buildToggle() {
  let tgl = this;
  let elLabelText;
  let elLabelCount;
  let elCheck;

  let elCheckToggle = el(
    'div',
    {
      class: 'vf-check-toggle',
      style: {
        order: tgl._order
      }
    },
    (elCheck = el('input', {
      id: 'toggle_' + tgl.id,
      class: ['filter', 'vf-check-toggle-input'],
      dataset: {
        filter: tgl.id,
        type: tgl._type
      },
      type: 'checkbox'
    })),
    el(
      'label',
      {
        class: 'vf-check-toggle-label',
        for: 'toggle_' + tgl.id
      },
      (elLabelText = el('span', {
        class: 'vf-check-toggle-filter-text',
        land_key: tgl.id
      })),
      (elLabelCount = el('span', {
        class: 'vf-check-toggle-filter-count'
      }))
    )
  );

  tgl.el = elCheckToggle;
  tgl.el.toggle = tgl;
  tgl.elLabelText = elLabelText;
  tgl.elLabelCount = elLabelCount;
  tgl.elCheck = elCheck;

  tgl.setLabel(tgl._label);
  tgl.setLabelKey(tgl._label_key);
  tgl.setCount(tgl._count);
}
