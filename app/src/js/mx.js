/*jshint esversion: 6, node: true  */

import * as helpers from "./mx_helpers.js";

import localforage  from 'localforage';

export { localforage, helpers };
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
  }),
  draft : localforage.createInstance({
    name : "draft"
  })
};

export let listener = {};
export let selectize = {};
export let queue = [];
export let events = {};
export let controls = {};
export let info = require('../../package.json');
export let settings = {
  dbLogLevels : ['ERROR'],
  dbLogLevelsAll : ["ERROR","WARNING","MESSAGE","LOG","USER_ACTION"],
  devicePixelRatio : 0, // updated by getPixelRatio()
  language : 'en',
  languages : ['en','fr'],
  highlightedCountries : [],
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
    sourceValidateGeom : '/get/source/validate/geom',
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
