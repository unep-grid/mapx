/*jshint esversion: 6, node: true  */
import * as helpers from "./mx_helpers.js";

import mapboxgl from 'mapbox-gl';
import localforage  from 'localforage';

export { mapboxgl, localforage, helpers };
export let templates = {
  viewList : require('../built/view_list.dot'),
  viewListLegend : require('../built/view_list_legend.dot'),
  viewListOptions : require('../built/view_list_options.dot')
};

export let maps = {};

export let data = {
  geojson : localforage.createInstance({
    name:  "geojson"
  }),
  images : localforage.createInstance({
    name : "images"
  }),
  stories : localforage.createInstance({
    name : "stories"
  }),
  views : localforage.createInstance({
    name : "views"
  }),
  config : localforage.createInstance({
    name : "config"
  })
};

export let listener = {}; // global listener, not map related. Modals can store listener here.
export let queue = [];
export let events = {};
export let controls = {};
export let info = require('../../package.json');
export let settings = {
  devicePixelRatio : 0, // updated by getPixelRatio()
  language : 'en',
  languages : ['en','fr'],
  project : '',
  apiPort : '80',
  apiHost : 'api.mapx.localhost',
  apiProtocol : 'http:',
  modeKiosk : false,
  idMapDefault : 'map_main',
  idDashboardsPanel : 'mxDashboardsPanel',
  idDashboards : 'mxDashboards',
  mapboxToken : '',
  paths : {
    sprites : 'sprites/sprite',
  },
  style : require("../data/style_mapx.json"),
  apiRoute : { 
    tiles : '/get/tile/{x}/{y}/{z}.mvt',
    views : '/get/view/',
    sourceMetadata : '/get/source/metadata/',
    sourceOverlap : '/get/source/overlap/',
    downloadSourceCreate : '/get/source/',
    downloadSourceGet : '',
    uploadImage : '/upload/image/',
    uploadVector : '/upload/vector/'
  },
  layerBefore : "mxlayers",
  separators : {
    sublayer : "_@_",
  },
  clickIgnoreWidgets : [],
  maxByteUpload : Math.pow(1024,2)*100, //100 MiB 
  maxByteJed : 100000, // 100 Kb  
  user : {}
};
//export let pixop = {};
export let dashboards = [];
export let editors = {};
export let extend = {
  position : {},
  texteditor : {}
};

console.log("INIT MX");
