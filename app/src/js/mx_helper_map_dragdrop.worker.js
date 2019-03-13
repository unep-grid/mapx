/* jshint esversion : 6*/

import * as geojsonhint from 'geojsonhint';
import {featureEach, propEach} from '@turf/meta';
import bbox from '@turf/bbox';
import * as stat from './mx_helper_stat.js';
import * as color from './mx_helper_colors.js';

// geojson type to mapbox gl type
var typeSwitcher = {
  Point: 'circle',
  MultiPoint: 'circle',
  LineString: 'line',
  MultiLineString: 'line',
  Polygon: 'fill',
  MultiPolygon: 'fill',
  GeometryCollection: 'fill'
};

// Inital message
postMessage({
  progress: 0,
  message: 'start'
});

// handle message send from the main thread
onmessage = function(e) {
  try {
    /**
     * Initialisation : set local helper and variables
     */

    // init variables
    var errorMsg = '';
    var warningMsg = '';
    var dat = e.data;
    var gJson = dat.data;
    var fileName = dat.fileName;
    var id = dat.id;
    var idSource = id + '-SRC';

    // set basic timing function
    var timerVal = 0;

    // start timer
    var timerStart = function() {
      timerVal = new Date();
    };

    // give intermediate time, reset timer
    var timerLap = function() {
      var lap = new Date() - timerVal;
      return lap;
    };

    // printable version of timerLaè
    var timerLapString = function() {
      return ' ' + timerLap() + ' ms ';
    };

    // start timer
    timerStart();

    /**
     * validation : geojson validation with geojsonhint
     */
    var messages = geojsonhint.hint(gJson);

    var errors = messages.filter(function(x) {
      return x.level === 'error';
    });

    var warnings = messages.filter(function(x) {
      return x.level === 'message';
    });

    // send message
    postMessage({
      progress: 60,
      message: 'Validation done in ' + timerLapString()
    });

    // validation : warnings
    if (warnings.length > 0) {
      warningMsg =
        warnings.length +
        ' warning message(s) found. Check the console for more info';

      postMessage({
        progress: 75,
        message: warnings.length + ' warnings found. Please check the console.'
      });

      warnings.forEach(function(x) {
        console.log({file: fileName, warnings: JSON.stringify(x)});
      });
    }
    // varlidation: errors
    if (errors.length > 0) {
      errorMsg = errors.length + ' errors found. Please check the console.';

      postMessage({
        progress: 100,
        message: errorMsg,
        errorMessage: errorMsg
      });

      errors.forEach(function(x) {
        console.log({file: fileName, errors: x});
      });

      return;
    }

    /**
     * Avoid multi type : we don't handle them for now
     */
    var geomTypes = [];
    if (gJson.features) {
      // array of types in data
      geomTypes = gJson.features
        .map(function(x) {
          if (x.geometry && x.geometry.type) {
            return x.geometry.type;
          } else {
            return undefined;
          }
        })
        .filter(function(v, i, s) {
          return s.indexOf(v) === i && v !== undefined;
        });
    } else {
      geomTypes = [gJson.geometry.type];
    }

    postMessage({
      progress: 90,
      message: 'Geometry type found in ' + timerLapString()
    });

    /**
     * Remove features without geom
     * hack related to https://github.com/Turfjs/turf/issues/853
     * Delete this block.
     */

    featureEach(gJson, function(f) {
      if (f.geometry === null) {
        f.geometry = {
          type: geomTypes[0],
          coordinates: []
        };
      }
    });

    /**
     * Get table of all attributes.
     */
    var attributes = {};
    var p;
    attributes.tmp = {};
    attributes.init = false;
    propEach(gJson, function(prop) {
      // init attributes with empty array
      if (!attributes.init) {
        for (p in prop) {
          attributes.tmp[p] = [];
        }
        attributes.init = true;
      }
      //
      for (p in prop) {
        if (attributes.tmp[p] && prop[p]) {
          attributes.tmp[p].push(prop[p]);
        }
      }
    });

    for (p in attributes.tmp) {
      attributes[p] = stat.getArrayStat({
        arr: attributes.tmp[p],
        stat: 'distinct'
      });
    }

    delete attributes.tmp;
    delete attributes.init;

    /**
     * Get extent : get extent using a Turf bbox
     */
    var extent = bbox(gJson);

    // Quick extent validation
    if (
      Math.round(extent[0]) > 180 ||
      Math.round(extent[0]) < -180 ||
      Math.round(extent[1]) > 90 ||
      Math.round(extent[1]) < -90 ||
      Math.round(extent[2]) > 180 ||
      Math.round(extent[2]) < -180 ||
      Math.round(extent[3]) > 90 ||
      Math.round(extent[3]) < -90
    ) {
      errorMsg = fileName + ' : extent seems to be out of range: ' + extent;

      postMessage({
        progress: 100,
        msssage: errorMsg,
        errorMessage: errorMsg
      });

      console.log({
        errors: errorMsg
      });
      return;
    }

    postMessage({
      progress: 80,
      message: 'extent found in ' + timerLapString()
    });
    /**
     * Avoid multi type : we don't handle them for now
     */

    if (gJson.features) {
      // array of types in data
      geomTypes = gJson.features
        .map(function(x) {
          return typeSwitcher[x.geometry.type];
        })
        .filter(function(v, i, s) {
          return s.indexOf(v) === i;
        });
    } else {
      geomTypes = [typeSwitcher[gJson.geometry.type]];
    }

    postMessage({
      progress: 90,
      message: 'Geom type is ' + geomTypes + '. Found in ' + timerLapString()
    });

    // if more than one type, return an error
    if (geomTypes.length > 1) {
      var msg = 'Support for mixed geometry types not yet implemented';

      postMessage({
        progress: 100,
        msssage: msg,
        errorMessage: fileName + ': ' + msg
      });

      console.log({
        errors: fileName + ': ' + msg + '.(' + geomTypes + ')'
      });
      return;
    }

    /**
     * Set default for a new layer
     */

    // Set random id for source and layer
        // Set random color
    var ran = Math.random();
    var colA = color.randomHsl(0.3, ran);
    var colB = color.randomHsl(0.9, ran);

    // Set default type from geojson type
    var typ = geomTypes[0];

    // Set up default style
    var dummyStyle = {
      circle: {
        id: id,
        source: idSource,
        type: typ,
        paint: {
          'circle-color': colA,
          'circle-radius': 10,
          'circle-stroke-width': 1,
          'circle-stroke-color': colB
        }
      },
      fill: {
        id: id,
        source: idSource,
        type: typ,
        paint: {
          'fill-color': colA,
          'fill-outline-color': colB
        }
      },
      line: {
        id: id,
        source: idSource,
        type: typ,
        paint: {
          'line-color': colA,
          'line-width': 10
        },
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        }
      }
    };

    postMessage({
      progress: 99,
      message: 'Worker job done in ' + timerLapString(),
      id: id,
      extent: extent,
      attributes: attributes,
      layer: dummyStyle[typ],
      geojson: gJson
    });
  } catch (err) {
    console.log(err);
    postMessage({
      progress: 100,
      errorMessage: 'An error occured, check the console'
    });
  }
};
