/*jshint esversion: 6 */

import 'bootstrap/dist/css/bootstrap.css';
import 'font-awesome/css/font-awesome.min.css';
import 'hint.css';
import 'mapbox-gl/dist/mapbox-gl.css';

import '../css/mx_colors.css';
import '../css/mx_base.css';
import '../css/mx_modifiers.css';
import '../css/mx_mapbox.css';
import '../css/mx_tabs.css';
import '../css/mx_modal.css';
import '../css/mx_story.css';
import '../css/mx_project_list.css';
import '../css/mx_dashboard.css';
import '../css/mx_handsontable.css';

/*
 * polyfill all
 * https://github.com/zloirock/core-js#usage
*/
import "core-js";


import $ from 'jquery';
window.jQuery = $;
window.$ = $;

import * as mx from './mx.js';
window.mx = mx;


/**
* Init query parameters and clean temporary stuff
*/
mx.helpers.setQueryParametersInit();
mx.helpers.cleanTemporaryQueryParameters();
