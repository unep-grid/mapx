/*jshint esversion: 6 */

import 'selectize/dist/css/selectize.css';
import 'selectize/dist/css/selectize.bootstrap3.css';
import '../css/mx_selectize.css';
import 'bootstrap/dist/css/bootstrap.css';
import 'font-awesome/css/font-awesome.min.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import 'hint.css';
import '../css/mx.css';
import '../css/mx_modal.css';
import '../css/mx_story.css';
import '../css/mx_table.css';
import '../css/mx_dashboard.css';
import '../css/mx_colors.css';

import 'promise-polyfill/src/polyfill';

import $ from 'jquery';
window.jQuery = $;
window.$ = $;
import Selectize from 'selectize';
window.Selectize = Selectize;

import * as mx from './mx.js';
window.mx = mx;

