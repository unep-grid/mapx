import {el} from '@fxi/el';
import {ListenerStore} from './../listener_store/index.js';
import './switch.css';

let settings = {
  labelLeft: 'on',
  labelRight: 'off',
  onChange: (s) => {
    console.log(s);
  }
};

class Switch {
  constructor(el, opt) {
    opt = opt || {};
    let sw = this;
    sw.elContainer = el;
    sw.state = false;
    sw.opt = Object.assign({}, settings, opt);
    sw.id = Math.random().toString(32);
    sw.init();
  }

  build() {
    var sw = this;
    var elInput;
    var elSwitch = el(
      'div',
      {class: 'switch'},
      el('span', sw.opt.labelLeft),
      (elInput = el('input', {
        class: 'switch-input',
        type: 'checkbox',
        id: sw.id
      })),
      el(
        'label',
        {
          for: sw.id,
          class: 'switch-label'
        },
        el(
          'div',
          {class: 'switch-container'},
          el('div', {class: 'switch-handle'})
        )
      ),
      el('span', sw.opt.labelRight)
    );
    sw.elSwitch = elSwitch;
    sw.elInput = elInput;
    sw.elContainer.innerHTML = '';
    sw.elContainer.appendChild(sw.elSwitch);
  }

  init() {
    let sw = this;
    sw.build();
    sw.lStore = new ListenerStore();
    sw.lStore.addListener({
      type: 'input',
      target: sw.elInput,
      callback: sw.handleChange,
      bind: sw
    });
  }

  handleChange(e) {
    let sw = this;
    let isInput = e.target.id === sw.id;
    if (!isInput) {
      return;
    }
    sw.state = e.target.checked;
    sw.opt.onChange(sw.state);
  }

  destroy() {
    this.elContainer.removeChild(this.elSwitch);
    this.lStore.destroy();
  }

  setState(state) {
    this.state = state === true;
    this.updateInput();
  }
  enable() {
    this.setState(true);
  }
  disable() {
    this.setState(false);
  }

  toggle() {
    let sw = this;
    if (sw.state) {
      sw.disable();
    } else {
      sw.enable();
    }
  }

  updateInput() {
    const sw = this;
    sw.elInput.checked = this.state;
    sw.opt.onChange(sw.state);
  }
}
export {Switch};
