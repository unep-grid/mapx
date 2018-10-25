/*jshint esversion: 6 , node: true */
//'use strict';

import * as mx from './mx_init.js';
//var Image, Node,escape,unescape,$,postMessage,Shiny,self,Blob,URL,Worker,XMLHttpRequest, window, document, System;

export function toggleFullScreen(id) {

  return Promise.all([
    import("screenfull")]
  ).then(m => {

    debugger;
    var el = document.body;
    var btn;

    btn = document.getElementById(id).querySelector(".fa");

    if(screenfull.enabled){
      if(!screenfull.isFullscreen){
        if(btn){
          btn.classList.add("fa-compress");
          btn.classList.remove("fa-expand");
        }
        screenfull.request();
      }else{
        if(btn){
          btn.classList.remove("fa-compress");
          btn.classList.add("fa-expand");
        }
        screenfull.exit();
      }
    }else{
      alert("Fullscreen not enabled, sorry");
    }
  });
}




