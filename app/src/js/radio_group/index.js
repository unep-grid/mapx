import {el} from '@fxi/el';

/**
 * Example:
 *const items = '123456789'.split('').map(i=>{
 *  return {
 *    value : `test_${i}`,
 *    content:el('img',{src:'https://placekitten.com/50/50'})
 *  }
 *})
 *
 *const qs= new RadioGroup({
 *  items: items,
 *  builder: (item => {
 *    return el('div', item.content)
 *  }),
 *  configForm : {
 *    style : {
 *       maxHeight : '200px',
 *       overflowY : 'auto',
 *       border : '1px solid black'
 *    }
 *  }
 *})
 */

const settings = {
  items: [],
  builder: (item) => {
    return el('div', item.content);
  },
  onUpdate: (value) => {
    console.log(value);
  },
  configForm: {}
};

class RadioGroup {
  constructor(opt) {
    const qs = this;
    qs.opt = Object.assign({}, settings, opt);
    qs.build();
    qs.update();
  }

  build() {
    const qs = this;
    if (qs._built) {
      qs.destroy();
    }
    const group = Math.random().toString(32);
    qs.el = el(
      'form',
      qs.opt.configForm,
      qs.opt.items.map((it, i) => {
        const id = `${group}_${i}`;
        let elInput;
        const elItem = el(
          'div',
          {
            style: {display: 'flex', alignItems: 'baseline'}
          },
          (elInput = el('input', {
            id: id,
            type: 'radio',
            name: group,
            value: it.value
          })),
          el(
            'label',
            {
              style: {
                width: '100%',
                display: 'block'
              },
              for: id
            },
            qs.opt.builder(it)
          )
        );
        if (i === 0) {
          elInput.setAttribute('checked', true);
        }

        return elItem;
      })
    );
    qs._listener = qs.update.bind(qs);
    qs.el.addEventListener('change', qs._listener);
    qs._built = true;
  }

  destroy() {
    const qs = this;
    qs.el.removeEventListener('change', qs._listener);
    qs.el.remove();
  }

  update() {
    const qs = this;
    const data = new FormData(qs.el);
    for (const entry of data) {
      qs.value = entry[1];
    }
    qs.opt.onUpdate(qs.value);
  }
}

export {RadioGroup};
