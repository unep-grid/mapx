/*jshint esversion: 6 , node: true */
'use strict';
import * as mx from './mx_init.js';

//var Image, Node,escape,unescape,$,postMessage,Shiny,self,Blob,URL,Worker,XMLHttpRequest, window, document, System;



/**
* Remove diacritics
* @note https://jsperf.com/diacritics/47
* @param {string} Character string to convert
* @return promise
*/
export function cleanDiacritic(str){
  return System.import("../data/table_diacritics.json")
    .then(function(d){
      return str.replace(/[À-ž]/g, function(ch) {
        return d[ch.charCodeAt(0)] || ch;
    }); 
  });
}


