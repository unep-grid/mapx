/*jshint esversion: 6 , node: true */

/*
* Async load does not work : browser think the user did not press the button hersef
*/
var screenfull = require('screenfull');

export function toggleFullScreen(id) {

  var el = document.body;
  var btn;

  btn = document.getElementById(id).querySelector(".fa");

  var isEnabled = btn.classList.contains('fa-compress');

  if(screenfull.enabled){
    if(!isEnabled){
      btn.classList.add("fa-compress");
      btn.classList.remove("fa-expand");
      screenfull.request();
    }else{
      btn.classList.remove("fa-compress");
      btn.classList.add("fa-expand");
      screenfull.exit();
    }
  }else{
    alert("Fullscreen not enabled, sorry");
  }
}




