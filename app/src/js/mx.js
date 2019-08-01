/*jshint esversion: 6, node: true  */

import * as helpers from './mx_helpers.js';
import * as info from './../../package.json';
import * as styleDefault from './../data/style_mapx.json';
import localforage from 'localforage';
import mapboxgl from 'mapbox-gl';
import {settings} from './mx_settings_default.js';
import {ListenerStore} from './listener_store/index.js';

let templates = {
  //viewList: require('../built/view_list.dot'), NOTE: replaced by view_builder
  viewListLegend: require('../built/view_list_legend.dot'),
  viewListOptions: require('../built/view_list_options.dot')
};
let maps = {};
let data = {
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
let style = styleDefault.default;
let listenerStore = new ListenerStore();
let selectize = {};
let queue = [];
let widgets = [];
let events = {};
let controls = {};
let dashboards = [];
let editors = {};
let extend = {
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
  // mapx storage
  templates,
  maps,
  data,
  selectize,
  queue,
  widgets,
  events,
  controls,
  info,
  settings,
  style,
  dashboards,
  editors,
  extend
};

console.log('INIT MX');
