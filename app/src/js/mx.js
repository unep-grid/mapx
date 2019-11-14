/*jshint esversion: 6, node: true  */
import * as helpers from './mx_helpers.js';
import * as info from './../../package.json';
import localforage from 'localforage';
import mapboxgl from 'mapbox-gl';
import {settings} from './mx_settings_default.js';
import {ListenerStore, EventStore} from './listener_store/index.js';

const templates = {
  viewListLegend: require('../dot/view_list_legend.dot'),
  viewListOptions: require('../dot/view_list_options.dot')
};
const maps = {};
const data = {
  geojson: localforage.createInstance({
    name: 'geojson'
  }),
  images: localforage.createInstance({
    name: 'images'
  }),
  stories: localforage.createInstance({
    name: 'stories'
  }),
  views: localforage.createInstance({
    name: 'views'
  }),
  config: localforage.createInstance({
    name: 'config'
  }),
  draft: localforage.createInstance({
    name: 'draft'
  }),
  draw: localforage.createInstance({
    name: 'draw'
  })
};
const initQueryParams = {}; // set in init_common.js
const listenerStore = new ListenerStore();
const events = new EventStore();
const selectize = {};
const queue = [];
const widgets = [];
const controls = {};
const dashboards = [];
const editors = {};
const extend = {
  position: {},
  texteditor: {}
};

export {
  /// globally available library
  mapboxgl,
  localforage,
  // mapx helpers
  helpers,
  // listener manager / store
  listenerStore,
  events,
  // mapx storage
  initQueryParams,
  templates,
  maps,
  data,
  selectize,
  queue,
  widgets,
  controls,
  info,
  settings,
  dashboards,
  editors,
  extend
};

console.log('INIT MX');
