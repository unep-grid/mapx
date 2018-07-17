/*jshint esversion: 6 , node: true */
'use strict';
import * as mx from './mx_init.js';

//var Image, Node,escape,unescape,$,postMessage,Shiny,self,Blob,URL,Worker,XMLHttpRequest, window, document, System;

const diacTable =  require("../data/table_diacritics.json");

/**
 * Remove diacritics
 * @note https://jsperf.com/diacritics/47
 * @param {string} Character string to convert
 * @return promise
 */
export function cleanDiacritic(str){
  return str.replace(/[À-ž]/g, function(ch) {
    return diacTable[ch.charCodeAt(0)] || ch;
  });
}


