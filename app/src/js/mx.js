import * as helpers from './mx_helpers.js';
import {version} from './../../package.json';
import localforage from 'localforage';
import mapboxgl from 'mapbox-gl';
import {settings} from './settings/index.js';
import {ListenerStore} from './listener_store';
import {EventSimple} from './event_simple';
import {HintHack} from './hint_hack/index.js';

const templates = {
  viewListLegend: require('../dot/view_list_legend_vt.dot.html'),
  viewListOptions: require('../dot/view_list_options.dot.html'),
  viewListControls: require('../dot/view_list_controls.dot.html'),
  viewListFilters: require('../dot/view_list_filters.dot.html')
};

const maps = {};
const data = {
  geojson: localforage.createInstance({
    name: 'geojson'
  }),
  draft: localforage.createInstance({
    name: 'draft'
  })
};
const initQueryParams = {}; // set in init_common.js
const listeners = new ListenerStore();
const events = new EventSimple();
const hinthack = new HintHack();
const selectize = {};
const editors = {};
const extend = {
  position: {},
  texteditor: {}
};
const info = {};
export {
  /// globally available library
  mapboxgl,
  localforage,
  // mapx helpers
  helpers,
  // listener manager / store
  listeners,
  events,
  // tooltip helper
  hinthack,
  // mapx storage
  initQueryParams,
  templates,
  maps,
  data,
  info,
  selectize,
  version,
  settings,
  editors,
  extend
};

console.log('INIT MX');
