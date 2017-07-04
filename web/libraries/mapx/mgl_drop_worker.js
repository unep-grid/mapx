// Importation of helpers
importScripts(
  "../geojsonhint/geojsonhint.js",
  //"../shapefile/shapefile.js",
  //"../toGeoJSON/togeojson.js",
  //"../jszip/jszip.min.js",
  "../turf/turf_mx.min.js",
  "mx.js"
);

// geojson type to mapbox gl type
var typeSwitcher = {
  "Point": "circle",
  "MultiPoint": "line",
  "LineString": "line",
  "MultiLineString": "line",
  "Polygon": "fill",
  "MultiPolygon": "fill",
  "GeometryCollection": "fill"
};


// Inital message
postMessage({
  progress: 0,
  message: "start"
});


// handle message send from the main thread
onmessage = function(e) {
  try {

    /**
     * Initialisation : set local helper and variables
     */

    // init variables
    var errorMsg = "";
    var warningMsg = "";
    var gJson = {};
    var dat = e.data;
    var data = dat.data;
    var gJson = dat.data;
    var fileName = dat.fileName;
    var fileType = dat.fileType;

    // set basic timing function
    timerVal = 0;

    // start timer
    var timerStart = function() {
      timerVal = new Date();
    };

    // give intermediate time, reset timer
    var timerLap = function() {
      var lap = new Date() - timerVal;
      timerStart();
      return lap;
    };

    // printable version of timerLaè
    var timerLapString = function() {
      return " " + timerLap() + " ms ";
    };

    // start timer
    timerStart();


    /**
    * Convert if not geojson
    */

    //if(fileType == 'kml') gJson =  toGeoJSON.kml(gJson);
    //if(fileType == 'gpx') gJson =  toGeoJSON.gpx(gJson);
    //if(fileType == 'geojson') gJson =  JSON.parse(gJson);

    /**
     * validation : geojson validation with geojsonhint
     */

    // Validation. Is that a valid geojson ?
    var messages = geojsonhint.hint(gJson);
    // extract errors
    var errors = messages.filter(function(x){
      return x.level == "error";
    });
    // extract message
    var warnings = messages.filter(function(x){
      return x.level == "message";
    });

    // set a message with summary
    var logMessage = " geojson validation " +
      " n errors = " + errors.length +
      " n warnings = " + warnings.length + " done in" +
      timerLapString();

    console.log(fileName + " summary :  " + logMessage);

    // send message
    postMessage({
      progress: 60,
      message: logMessage
    });

    // validation : warnings
    if (warnings.length > 0) {
      warningMsg = warnings.length + " warning message(s) found. Check the console for more info";
      postMessage({
        progress: 75,
        msssage: warningMsg
      });
      warnings.forEach(function(x) {
        console.log({file:fileName,warnings:JSON.stringify(x)});
      });
    }
    // varlidation: errors
    if (errors.length > 0) {
      errorMsg = errors.length + " errors found. check the console for more info";
      postMessage({
        progress: 100,
        msssage: errorMsg,
        errorMessage: errorMsg
      });

      errors.forEach(function(x) {
        console.log({file:fileName,errors:x});
      });

      return;
    }

    /**
    * Get table of all attributes. 
    */
    var attributes = {};
    var p;
    attributes.tmp = {};
    attributes.init = false;
    turf.meta.propEach(gJson,
      function(prop){
        // init attributes with empty array
        if(!attributes.init){
          for(p in prop){
            attributes.tmp[p] = [];
          }
          attributes.init = true;
        }
        // 
        for(p in prop){
          if(attributes.tmp[p] && prop[p]){
            attributes.tmp[p].push(prop[p]);
          }
        }
      }
    );
      
    for(p in attributes.tmp){
      attributes[p] = mx.util.getArrayStat({
        arr : attributes.tmp[p],
        stat : "distinct"
      });
    }
    
    delete attributes.tmp;
    delete attributes.init;


    /**
     * Get extent : get extent using a Turf bbox
     */

    var extent = turf.bbox(gJson);

    // Quick extent validation 
    if (
        extent[0] > 180 || extent[0] < -180 ||
        extent[1] > 90 || extent[1] < -90 ||
        extent[2] > 180 || extent[2] < -180 ||
        extent[3] > 90 || extent[3] < -90
       ) {
      
      errorMsg = fileName + " : extent seems to be out of range: " + extent;

      postMessage({
        progress: 100,
        msssage: errorMsg,
        errorMessage: errorMsg
      });

      console.log({
        "errors": errorMsg
      });
      return;
    }

    postMessage({
      progress: 80,
      message: " extent (" + extent +") found in " + timerLapString()
    });
    /**
     * Avoid multi type : we don't handle them for now
     */

    var geomType = [];
    if( gJson.features ){
      // array of types in data
      geomTypes  = gJson.features
        .map(function(x){
          return typeSwitcher[x.geometry.type];
        })
      .filter(function(v,i,s){
        return s.indexOf(v) === i;
      });
    }else{
      geomTypes = [typeSwitcher[gJson.geometry.type]];
    }

    postMessage({
      progress: 90,
      message: "Geom type is " + geomTypes + ". Found in " + timerLapString()
    });

    // if more than one type, return an error
    if ( geomTypes.length>1 ) {
      var msg = "Multi geometry not yet implemented";

      postMessage({
        progress: 100,
        msssage: msg,
        errorMessage: fileName + ": " + msg
      });

      console.log({
        "errors": fileName + ": " + msg + ".(" + geomTypes + ")"
      });
      return;
    }


    /**
     * Set default for a new layer
     */

    // Set random id for source and layer
    var id = "MX-DROP-" + fileName ;
    var idSource = id + "-SRC";
    // Set random color
    var ran = Math.random();
    var colA = mx.util.randomHsl(0.3, ran);
    var colB = mx.util.randomHsl(0.9, ran);

    // Set default type from geojson type
    var typ = geomTypes[0];

    // Set up default style
    var dummyStyle = {
      "circle": {
        "id": id,
        "source": idSource,
        "type": typ,
        "paint": {
          "circle-color": colA,
          "circle-radius":10,
          "circle-stroke-width":1,
          "circle-stroke-color":colB
        }
      },
      "fill": {
        "id": id,
        "source": idSource,
        "type": typ,
        "paint": {
          "fill-color": colA,
          "fill-outline-color": colB
        }
      },
      "line": {
        "id": id,
        "source": idSource,
        "type": typ,
        "paint": {
          "line-color": colA,
          "line-width": 10
        }
      }
    };


    postMessage({
      progress: 99,
      message: "Add layer",
      id: id,
      extent: extent,
      attributes : attributes,
      layer: dummyStyle[typ],
      geojson : gJson
    });
  }

  catch(err) {
    console.log(err);
    postMessage({
      progress: 100,
      errorMessage : "An error occured, check the console"
    });
  }
};

