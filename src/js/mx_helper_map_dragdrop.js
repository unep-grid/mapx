/*jshint esversion: 6 */



// handle read geojson
// Update progress
export function updateProgress (f) {
  var helper = this;
  return function(e) {
    if (e.lengthComputable) {
      var percentLoaded = Math.round((e.loaded / e.total) * 50);
      helper.progressScreen({
        enable : true,
        id : f.name,
        percent : percentLoaded,
        text : f.name + " loading (" + percentLoaded + "%)"
      });
    }
  };
}

// init progress bar
export function startProgress(f) {
  var helper = this;
  return function(e) {
    helper.progressScreen({
      enable : true,
      id : f.name,
      percent : 0,
      text : f.name + " init .. "
    });
  };
}

// on error, set progress to 100 (remove it)
export function errorProgress(f) {
  var helper = this;
  return function(e) {
    helper.progressScreen({
      enable : true,
      id : f.name,
      percent : 100,
      text : f.name + "stop .. "
    });
  };
}

// handle zip to geojson
export function zipToGeojson(data){

  var helper = this;
  var shapefile,JSZip, shp, dbf;

  Promise.all([
    System.import("jszip"),
    System.import("shapefile")
  ])
    .then(function(m){
      JSZip = m[0];
      shapefile = m[1];
      return JSZip.loadAsync(data);
    })
    .then(function(files){
      var f = files.files;
      for(var dat in f){
        var ext = helper.getExtension(dat);
        if(ext == ".dbf") dbf = f[dat];
        if(ext == ".shp") shp = f[dat]; 
      }

      if(!shp){
        throw new Error('No shp file found in archive, abord.');
      }
      if(!dbf){
        throw new Error('No dbf file found in archive, abord.');
      }

      var rShp = shp.async("Uint8Array");
      var rDbf = dbf.async("Uint8Array");

      return Promise.all([rShp,rDbf]);

    })
    .then(function(v){
      return shapefile
        .read(v[0],v[1]);
    })
    .then(function(gj){
      return(gj);
    });  
  return dat;
}


// handle worker
export function startWorker(f) {
  var helper = this;

  return function(e) {

    var workerPath = "src/js/mx_handler_dragdrop_worker.js";
    // Test for size
    if(f && f.size && f.size > mx.settings.maxByteUpload){
      var msg = "<p>The file size reached the current limit.</p>";
      msg = msg + "<p>The file size is " + f.size + " byte </p>";
      msg = msg + "<p>The limit is " + mx.settings.maxByteUpload + " byte </p>";
      msg = msg + "<p> Registered users can upload big dataset in the toolbox section </p>";
      helper.modal({
        content:msg,
        title:"Max size reached"
      });
      helper.progressScreen({
        enable : false,
        id :f.name
      });
      return;
    }


    // Create a worker to handle this file
    var w = new Worker(workerPath);

    var o = {
      id : "map_main"
    };

    var map = mx.maps[o.id].map; 
    var data = e.target.result;
    var gJson = {};
    var db = mx.data.geojson;




    if(f.fileType == 'kml') gJson =  toGeoJSON.kml((new DOMParser()).parseFromString(data, 'text/xml'));
    if(f.fileType == 'gpx') gJson =  toGeoJSON.gpx((new DOMParser()).parseFromString(data, 'text/xml'));
    if(f.fileType == 'geojson') gJson =  JSON.parse(data);
    if(f.fileType == 'zip') gJson = helper.zipToGeojson(data);
    // Message to pass to the worker
    var res = {
      data : gJson,
      fileName: f.name,
      fileType: f.fileType
    };

    // handle message received
    w.onmessage = function(e) {
      var m = e.data;
      if ( m.progress ) {
        console.log(m.message);
        helper.progressScreen({
          enable : true,
          id :f.name,
          percent : m.progress,
          text : f.name + ": " + m.message
        });
      }

      // send alert for errors message
      if( m.errorMessage ){
        alert(m.errorMessage);
      }

      // If extent is received
      if (m.extent) {
        // bug with extent +/- 90. See https://github.com/mapbox/mapbox-gl-js/issues/3474
        // here, quick hack
        if(m.extent[0] < -179) m.extent[0] = -179;
        if(m.extent[1] < -85) m.extent[1] = -85;
        if(m.extent[2] > 179) m.extent[2] = 179;
        if(m.extent[3] > 85) m.extent[3] = 85;

        var a = new mx.mapboxgl.LngLatBounds(
          new mx.mapboxgl.LngLat(m.extent[0],m.extent[1]),
          new mx.mapboxgl.LngLat(m.extent[2],m.extent[3])
        );
        map.fitBounds(a);
      }

      // If layer is valid and returned
      if (m.layer) {

        helper.progressScreen({
          enable : true,
          id : f.name,
          percent : 100,
          text : f.name + " done"
        });

        // mx default view
        var view = {
          id : m.id,
          type : "gj",
          country : mx.settings.country,
          date_modified : (new Date()).toLocaleDateString(),
          data : {
            title : { en : f.name.split('.')[0] },             
            attributes : m.attributes,
            abstract : {en : f.name},
            geometry : {
              extent : {
                lng1 : m.extent[0],
                lat1 : m.extent[1],
                lng2 : m.extent[2],
                lat2 : m.extent[3],
              }
            },
            layer : m.layer,
            source : {
              type:"geojson",
              data: m.geojson
            }
          }
        };


        // save geojson in database
        db.setItem(m.id,{
          view : view
        }).then(function(){

          // Add source from view
          helper.setSourcesFromViews({
            id : o.id,
            viewsList : view
          });

        });

        // close worker
        w.terminate();
      }

    };

    // launch process
    if(res.data.then){
      res
        .data
        .then(function(gJson){
          res.data = gJson;
          w.postMessage(res);
        })
        .catch(function(err){
          alert(err);
          helper.errorProgress(f)();
          w.terminate();
        });

    }else{ 
      w.postMessage(res);
    }
  };
}

export function updateLayerList(f) {
  return function(e) {};
}

export function getExtension(str){
  return str.toLowerCase().match(/.[a-z0-9]+$/)[0];
}
// handle drop event
export function handleUploadFileEvent(evt) {

  evt.stopPropagation();
  evt.preventDefault();
  var helper = this;
  var files = evt.dataTransfer.files;

  var nFiles = files.length;
  var incFile = 100 / nFiles;
  var progressBar = 0;
  var exts = {
    ".json":"geojson",
    ".geojson":"geojson",
    ".kml":"kml",
    ".gpx":"gpx",
    ".zip":"zip"
  };

  // In case of multiple file, loop on them
  for (var i = 0; i < nFiles; i++) {

    var f = files[i];
    f.fileType = exts[helper.getExtension(f.name)];

    // Only process geojson files. Validate later.
    if (!f.fileType) {
      alert(f.name + " : filename not valid. Should be .zip, .kml, .json, .geojson or .gpx");
      continue;
    }

    // get a new reader
    var reader = new FileReader();
    // handle events
    reader.onloadstart = (helper.startProgress)(f);
    reader.onprogress = (helper.updateProgress)(f);
    reader.onerror = (helper.errorProgress)(f);

    reader.onload = (helper.startWorker)(f);
    reader.onloadend = (helper.updateLayerList)(f);

    // read the geojson
    if(f.fileType == "zip" ){
      reader.readAsArrayBuffer(f);
    }else{ 
      reader.readAsText(f);
    }

  }
}

export function handleDragOver(evt) {
  evt.stopPropagation();
  evt.preventDefault();
  evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
}


/** Worker function to handler 
 *
 *
 */
export function handleReadGeojson(){
}

