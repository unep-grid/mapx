/*jshint esversion: 6 */
(function() {
  var hasServiceWorker = 'serviceWorker' in navigator;
  if(  hasServiceWorker ) {
    navigator.serviceWorker.register('/service-worker.js');
  }
})();
import 'bootstrap/dist/css/bootstrap.css';
import 'font-awesome/css/font-awesome.min.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import 'selectize';
import 'selectize/dist/css/selectize.css';
import 'selectize/dist/css/selectize.bootstrap3.css';
import 'hint.css';
import '../css/mx.css';
import '../css/mx_codemirror.css';
import '../css/mx_flash.css';
import '../css/mx_content_tools.css';
import '../css/mx_loader.css';
import '../css/mx_view_toggle.css';
import '../css/mx_shiny.css';
import '../css/mx_legends.css';
import '../css/mx_jed.css';
import '../css/mx_story.css';
import '../css/mx_dashboard.css';
import '../css/mx_selectize.css';
import '../css/mx_colors.css';
import * as mx from './mx_init.js';
window.mx = mx;




