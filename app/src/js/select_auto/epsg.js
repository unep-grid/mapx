import {getApiUrl} from './../api_routes';
import {el} from '../el_mapx';

export const config = {
  valueField: 'srid',
  searchField: ['srid', 'name', 'region'],
  allowEmptyOption: true,
  options: null,
  load: async function (_, callback) {
    const tom = this;
    try {
      if (tom.loading > 1) {
        callback();
        return;
      }
      const url = getApiUrl('getEpsgCodesFull');
      const epsgCodeResp = await fetch(url);
      const epsgCodes = await epsgCodeResp.json();
      callback(epsgCodes);
      tom.settings.load = null;
    } catch (e) {
      console.error(e);
      callback();
    }
  },
  create: false,
  sortField: {field: 'srid'},
  onInitialize: async function () {
    const tom = this;
    await tom.load();
  },
  onLoad: function () {
    const tom = this;
    tom.setValue(4326);
  },
  dropdownParent: 'body',
  render: {
    option: (data, escape) => {
      return el(
        'div',
        el('h4', escape(data.name)),
        el('small', `EPSG:${escape(data.srid)} | ${escape(data.region)}`)
      );
    },
    item: (data, escape) => {
      return el(
        'div',
        el('span', escape(data.name)),
        el('span', {class: ['text-muted','space-around']}, `EPSG:${escape(data.srid)}`)
      );
    }
  }
};
