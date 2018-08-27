/*jshint esversion: 6, node: true  */
'use strict';
import * as mx_helpers from "./mx_helpers.js";

console.log("INIT MX");
export let helpers = mx_helpers;
export let mapboxgl = require('mapbox-gl');
export let localforage = require('localforage');
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
export let controls = {};
export let listener = {};
export let settings = {
  language : 'en',
  languages : ['en','fr'],
  project : '',
  apiPort : '80',
  apiHost : 'api.mapx.localhost',
  apiProtocol : 'http',
  modeKiosk : false,
  idMapDefault : 'map_main',
  mapboxToken : '',
  paths : {
    sprites : 'sprites/sprite',
  },
  apiRoute : { 
    tiles : '/get/tile/{x}/{y}/{z}.mvt',
    views : '/get/view/',
    downloadSourceCreate : '/get/source?data=',
    downloadSourceGet : '',
    uploadImage : '/upload/image/',
    uploadVector : '/upload/vector/'
  },
  layerBefore : "mxlayers",
  separators : {
    sublayer : "_@_",
  },
  maxByteUpload : Math.pow(1024,2)*100, //100 MiB 
  maxByteJed : 100000, // 100 Kb  
  user : {}
};
export let editors = {};
export let extend = {
  position : {},
  texteditor : {}
};


