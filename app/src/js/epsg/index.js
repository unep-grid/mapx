import {modal} from './../mx_helper_modal.js';
import {el} from './../el/src/index.js';
import {moduleLoad} from './../modules_loader_async/index.js';

export class ModalEpsg {
  constructor() {
    const me = this;
    me.init().catch(console.error);
    me.destroy = me.destroy.bind(me);
  }

  async init() {
    const me = this;
    await me.build();
  }

  destroy() {
    const me = this;
    if (me._destroyed) {
      return;
    }
    me._destroyed = true;
    me._ts.destroy();
    me._modal.close();
  }

  async build() {
    const me = this;
    const TomSelect = await moduleLoad('tom-select');
    const {default: data} = await import('./epsg_codes.json');
    const elSelect = el('select');
    const elContent = el('div', elSelect);

    me._modal = modal({
      title: 'EPSG',
      content: elContent,
      onClose: me.destroy
    });

    me._ts = new TomSelect(elSelect, {
      options: data,
      valueField: 'srid',
      searchField: ['srid', 'name', 'region'],
      allowEmptyOption: true,
      create: false,
      sortField: {field: 'srid'},
      items: [4326],
      dropdownParent: 'body',
      render: {
        option: (data, escape) => {
          return el(
            'div',
            el('h4', escape(data.name)),
            el('small', `EPSG:${escape(data.srid)} – ${escape(data.region)}`)
          );
        },
        item: (data, escape) => {
          return el(
            'div',
            el('span', escape(data.name)),
            el('span', {class: 'text-muted'}, ` EPSG:${escape(data.srid)} `)
          );
        }
      }
    });
  }
}
