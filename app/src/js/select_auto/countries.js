import {el, elSpanTranslate} from '../el_mapx';

export const config = {
  valueField: 'id',
  searchField: ['id', 'en'],
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
        './../../data/dict/dict_countries.json'
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
      return el(
        'div',
        el('h4', elSpanTranslate(data.id)),
        el('small', `${escape(data.id)}`)
      );
    },
    item: (data, escape) => {
      return el(
        'div',
        el('span', elSpanTranslate(data.id)),
        el(
          'span',
          {class: ['text-muted', 'space-around']},
          ` ${escape(data.id)}`
        )
      );
    }
  }
};
