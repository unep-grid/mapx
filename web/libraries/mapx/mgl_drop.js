(function(){
  'use strict';

  if(typeof(mgl) == "undefined" || typeof(mgl.data.geojson) == "undefined") alert("mgl must be loaded first");

  var db = mgl.data.geojson;
  var util = mgl.helper;

  // handle read geojson
  // Update progress
  util.updateProgress = function(f) {
    return function(e) {
    console.log("Update progress");
      // evt is an ProgressEvent. 100/2 as loading is ~ half the process
      if (e.lengthComputable) {
        var percentLoaded = Math.round((e.loaded / e.total) * 50);
        mx.util.progressScreen({
          enable : true,
          id : f.name,
          percent : percentLoaded,
          text : f.name + " loading (" + percentLoaded + "%)"
        });
      }
    };
  };

  // init progress bar
  util.startProgress = function(f) {
    return function(e) {
    console.log("Start progress");
      mx.util.progressScreen({
        enable : true,
        id : f.name,
        percent : 0,
        text : f.name + " init .. "
      });
    };
  };

  // on error, set progress to 100 (remove it)
  util.errorProgress = function(f) {
    return function(e) {
    console.log("Error progress");
      mx.util.progressScreen({
        enable : true,
        id : f.name,
        percent : 100,
        text : f.name + "stop .. "
      });
    };
  };

  // handle zip to geojson
  util.zipToGeojson = function(data){
    var gJson = {};
    var dat = JSZip.loadAsync(data)
      .then(function(files){
        var dbf, shp;
        var f = files.files;
        for(var dat in f){
          var ext = util.getExtension(dat);
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

      }).then(function(v){

        return shapefile
          .read(v[0],v[1])
          .then(function(gj){
            return(gj);
          });
      }).then(function(gj){
        return gj;
      });

  return dat;
};


  // handle worker
  util.startWorker = function(f) {
    return function(e) {

        // Test for size
      if(f && f.size && f.size > mgl.settings.maxByteUpload){
        var msg = "<p>The file size reached the current limit.</p>";
        msg = msg + "<p>The file size is " + f.size + " byte </p>";
        msg = msg + "<p>The limit is " + mgl.settings.maxByteUpload + " byte </p>";
        msg = msg + "<p> Registered users can upload big dataset in the toolbox section </p>";
        mx.util.modal({
          content:msg,
          title:"Max size reached"
        });
        mx.util.progressScreen({
          enable : false,
          id :f.name
        });
        return;
      }


        // Create a worker to handle this file
        var w = new Worker("mx/mapx/mgl_drop_worker.js");

        var o = {
          id : "map_main"
        };

        var map = mgl.maps[o.id].map; 
        var data = e.target.result;
        var gJson = {};

        


        if(f.fileType == 'kml') gJson =  toGeoJSON.kml((new DOMParser()).parseFromString(data, 'text/xml'));
        if(f.fileType == 'gpx') gJson =  toGeoJSON.gpx((new DOMParser()).parseFromString(data, 'text/xml'));
        if(f.fileType == 'geojson') gJson =  JSON.parse(data);
        if(f.fileType == 'zip') gJson = util.zipToGeojson(data);
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
            mx.util.progressScreen({
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

            var a = new mapboxgl.LngLatBounds(
              new mapboxgl.LngLat(m.extent[0],m.extent[1]),
              new mapboxgl.LngLat(m.extent[2],m.extent[3])
            );
            map.fitBounds(a);
          }

          // If layer is valid and returned
          if (m.layer) {

            mx.util.progressScreen({
              enable : true,
              id : f.name,
              percent : 100,
              text : f.name + " done"
            });

            // mx default view
            var view = {
              id : m.id,
              type : "gj",
              country : mgl.settings.country,
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
              util.setSourcesFromViews({
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
              util.errorProgress(f)();
              w.terminate();
            });

        }else{ 
          w.postMessage(res);
        }
    };
  };

  util.updateLayerList =  function(f) {
    return function(e) {};
  };

  util.getExtension =  function(str){
  return str.toLowerCase().match(/.[a-z0-9]+$/)[0];
  };
  // handle drop event
  util.handleUploadFileEvent =  function(evt) {
    evt.stopPropagation();
    evt.preventDefault();
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
      f.fileType = exts[util.getExtension(f.name)];

      // Only process geojson files. Validate later.
      if (!f.fileType) {
        alert(f.name + " : filename not valid. Should be .zip, .kml, .json, .geojson or .gpx");
        continue;
      }

      // get a new reader
      var reader = new FileReader();
      // handle events
      reader.onloadstart = (util.startProgress)(f);
      reader.onprogress = (util.updateProgress)(f);
      reader.onerror = (util.errorProgress)(f);

      reader.onload = (util.startWorker)(f);
      reader.onloadend = (util.updateLayerList)(f);

        // read the geojson
        if(f.fileType == "zip" ){
          reader.readAsArrayBuffer(f);
        }else{ 
          reader.readAsText(f);
        }
      
    }
  };

  util.handleDragOver = function(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
  };


  /** Worker function to handler 
   *
   *
   */
  util.handleReadGeojson = function(){
  };

})();
