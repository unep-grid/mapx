/*jshint esversion: 6, node: true  */
'use strict';
window.$ = window.jQuery = require("jquery");
import * as deps from "./mx_helper_main.js";

export let mapboxgl = {};
export let localforage = {};
export let templates = {};
export let helpers = deps;
export let maps = {};
export let data = {};
export let controls = {};
export let listener = {};
export let settings = {
  layerBefore : "mxlayers",
  language : "en",
  separators : {
    sublayer : "_@_",
  },
  project : "",
  vtPort : "",
  maxByteUpload : Math.pow(1024,2)*100, //100 MiB 
  maxByteJed : 100000, // 100 Kb  
  user : {}
};
export let editors = {};
export let extend = {
  position : {},
  texteditor : {}
};



