import 'bootstrap/dist/css/bootstrap.css';
import 'font-awesome/css/font-awesome.min.css';
import 'hint.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import 'flag-icons/css/flag-icons.min.css';

import '../css/mx_variables.css';
import '../css/mx_base.css';
import '../css/mx_ace_editor.css';
import '../css/mx_modifiers.css';
import '../css/mx_mapbox.css';
import '../css/mx_tabs.css';
import '../css/mx_table.css';
import '../css/mx_modal.css';
import '../css/mx_project_list.css';
import '../css/mx_legends.css';
import '../css/mx_icons.css';

import * as mx from './mx.js';
window.mx = mx;
/**
* Mapbox gl preload workers as soon as possible
*/
mx.mapboxgl.prewarm();
