/*jshint esversion: 6, node: true  */

import * as helpers from './mx_helpers.js';
import * as info  from './../../package.json';
import * as style from './../data/style_mapx.json';
import localforage from 'localforage';
import mapboxgl from 'mapbox-gl';
import { settings } from './mx_settings_default.js';

let templates = {
  viewList: require('../built/view_list.dot'),
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
let listener = {};
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
  mapboxgl,
  localforage,
  helpers,
  templates,
  maps,
  data,
  listener,
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
