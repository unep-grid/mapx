import {el} from '@fxi/el';

let settings = {
  onDestroy: () => {},
  onBuild: () => {},
  id: Math.random().toString(32),
  type: '',
  label: 'label',
  count: 0
};

class Toggle {
  constructor(opt) {
    let tgl = this;
    tgl.opt = Object.assign({}, settings, opt);
    tgl.id = opt.id;
    tgl.label = opt.label;
    tgl.label_key = opt.label_key;
    tgl.count = opt.count;
    tgl.type = opt.type;
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

  setCount(n) {
    let tgl = this;
    let delay = n !== this.count ? 500 : 0;
    tgl.elLabelCount.classList.remove('updated');
    tgl.count = n;
    tgl.elLabelCount.innerText = tgl.count;
    if (delay > 0) {
      setTimeout(add, 500);
    } else {
      add();
    }
    function add() {
      tgl.elLabelCount.classList.add('updated');
    }
  }

  setLabel(txt) {
    let tgl = this;
    tgl.label = txt;
    tgl.elLabelText.innerText = tgl.label;
  }
  setLabelKey(key) {
    let tgl = this;
    tgl.label_key = key;
    tgl.elLabelText.dataset.lang_key = tgl.label_key;
  }

  getType() {
    return this.type;
  }
  getId() {
    return this.id;
  }
  setType(type) {
    this.type = type;
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
      class: 'vf-check-toggle'
    },
    (elCheck = el('input', {
      id: 'toggle_' + tgl.id,
      class: ['filter', 'vf-check-toggle-input'],
      dataset: {
        filter: tgl.id,
        type: tgl.type
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

  tgl.setLabel(tgl.label || tgl.label_key);
  tgl.setLabelKey(tgl.label_key);
  tgl.setCount(tgl.count);
}
