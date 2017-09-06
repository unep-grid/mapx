/*jshint esversion: 6 */
import 'bootstrap/dist/css/bootstrap.css';
import selectize from 'selectize';
import 'selectize/dist/css/selectize.css';
import 'selectize/dist/css/selectize.bootstrap3.css';
import 'font-awesome/css/font-awesome.min.css';
import './mx_shiny.min.js';
import '../css/mx.css';
import '../css/mx_shiny.css';
import '../css/mx_legends.css';
import '../css/mx_story.css';
import '../css/mx_colors.css';
import './mx_binding_helper.js';
import './mx_binding_jed.js';
import './mx_binding_pwd.js';
import * as mx from './mx_init.js';

var jed = {
  editors : {},
  helpers : Object.assign( 
    require("./mx_helper_jed.js")
  ),
  extend : {
    position : {},
    texteditor : {}
  }
};


window.mx = mx;
window.jed = jed;




