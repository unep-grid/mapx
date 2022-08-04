import {el, elSpanTranslate} from '../../el_mapx';
import {getLanguagesAll} from '../../language';

const langs = getLanguagesAll();


export const config = {
  valueField: 'id',
  searchField: ['id', ...langs],
  allowEmptyOption: true,
  options: null,
  create: false,
  closeAfterSelect: true,
  sortField: {field: 'en'},
  dropdownParent: 'body',
  maxItems: 10,
  plugins: ['remove_button'],
  load: async function (_, callback) {
    const tom = this;
    try {
      if (tom.loading > 1) {
        callback();
        return;
      }
      const {default: countries} = await import(
        './../../../data/dict/dict_countries.json'
      );
      callback(countries);
      tom.settings.load = null;
    } catch (e) {
      console.error(e);
      callback();
    }
  },
  render: {
    option: (data, escape) => {
      const id = escape(data.id);
      return el(
        'div',
        el('h4', elSpanTranslate(id)),
        el('small', `${id}`)
      );
    },
    item: (data, escape) => {
      const id = escape(data.id);
      return el(
        'div',
        el('span', elSpanTranslate(id)),
        el(
          'span',
          {class: ['text-muted', 'space-around']},
          ` ${id}`
        )
      );
    }
  }
};
