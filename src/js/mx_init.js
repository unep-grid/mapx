/*jshint esversion: 6, node: true  */
'use strict';
import * as deps from "./mx_helper.js";

export let mapboxgl = {};
export let localforage = {};
export let templates = {};
export let helpers = deps;
export let maps = {};
export let data = {};
export let controls = {};
export let settings = {
    language : "en",
    separators : {
      sublayer : "_@_",
    },
    country:"",
    vtPort : "",
    maxByteUpload :  Math.pow(1024,2)*100, //100 MiB 
};

