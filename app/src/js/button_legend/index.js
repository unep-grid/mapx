import {el} from '@fxi/el';
import {getDictItem} from '../mx_helper_language.js';
import {ListenerStore} from '../listener_store/index.js';
import './style.css';

const options = {
  elContainer: document.body
};

class ButtonLegend {
  constructor(opt) {
    this.opt = Object.assign({}, options, opt);
    this.ls = new ListenerStore();
    this.init();
  }
  build() {
    this.el = el(
      'div',
      {class: ['mx-button-legend-container']},
      (this.elBtnLegend = el('div', {
        class: ['mx-button-legend-btn', 'fa', 'fa-list-ul', 'shadow'],
        dataset: {
          lang_key: 'button_legend_btn',
          lang_type: 'tooltip',
          button_legend_action: 'toggle'
        }
      })),
      (this.elLegend = el(
        'div',
        {
          class: ['mx-button-legend']
        },
        el(
          'span',
          {
            class: 'mx-button-legend-title'
          },
          getDictItem('button_legend_title')
        ),
        /**
         * Where the legend will appear
         */
        (this.elLegendContent = el('div', {
          class: 'mx-button-legend-content'
        }))
      ))
    );
  }

  init() {
    this.build();
    this.opt.elContainer.appendChild(this.el);
    this.ls.addListener({
      target: this.el,
      bind: this,
      callback: this.toggle,
      group: 'base',
      type: 'click'
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

export {ButtonLegend};
