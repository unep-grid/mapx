(function(){
  'use strict';

  if(typeof(mgl) == "undefined" || typeof(mgl.data.geojson) == "undefined") alert("mgl must be loaded first");

  var db = mgl.data.geojson;
  var util = mgl.helper;

  // handle read geojson
  // Update progress
  util.updateProgress = function(theFile) {
    return function(e) {
      // evt is an ProgressEvent. 100/2 as loading is ~ half the process
      if (e.lengthComputable) {
        var percentLoaded = Math.round((e.loaded / e.total) * 50);
        mx.util.progressScreen({
          enable : true,
          id : theFile.name,
          percent : percentLoaded,
          text : theFile.name + " loading (" + percentLoaded + "%)"
        });
      }
    };
  };

  // init progress bar
  util.startProgress = function(theFile) {
    return function(e) {
      mx.util.progressScreen({
        enable : true,
        id : theFile.name,
        percent : 0,
        text : theFile.name + " init .. "
      });
    };
  };

  // on error, set progress to 100 (remove it)
  util.errorProgress = function(theFile) {
    return function(e) {
      mx.util.progressScreen({
        enable : true,
        id : theFile.name,
        percent : 100,
        text : theFile.name + "stop .. "
      });
    };
  };

  // handle read json 

  // handle worker
  util.startWorker = function(theFile) {
    return function(e) {
      // Create a worker to handle this file
      var w = new Worker("mx/mapx/mgl_drop_worker.js");

      var o = {
        id : "map_main"
      };

      var map = mgl.maps[o.id].map;
      // parse file content before passing to worker.
      var gJson = JSON.parse(e.target.result);

      // Message to pass to the worker
      var res = {
        json: gJson,
        fileName: theFile.name
      };

      // handle message received
      w.onmessage = function(e) {
        var m = e.data;
        if ( m.progress ) {
          console.log(m.message);
          mx.util.progressScreen({
            enable : true,
            id :theFile.name,
            percent : m.progress,
            text : theFile.name + ": " + m.message
          });
        }

        // send alert for errors message
        if( m.errorMessage ){
          alert(m.errorMessage);
        }

        // If extent is received
        if (m.extent) {
          map.fitBounds(m.extent);
        }
        
        // If layer is valid and returned
        if (m.layer) {
          try {
            mx.util.progressScreen({
              enable : true,
              id : theFile.name,
              percent : 100,
              text : theFile.name + " done"
            });

            // mx default view
            var view = {
              id : m.id,
              type : "gj",
              country : mgl.settings.country,
              date_modified : (new Date()).toLocaleDateString(),
              data : {
                title : { en : theFile.name.split('.')[0] },             
                attributes : m.attributes,
                abstract : {en : theFile.name},
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
                  data: gJson
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

          }
          catch(err){
            alert(err);
          }
          // close worker
          w.terminate();
        }

      };

      // launch process
      try {
        w.postMessage(res);
      }catch(err){
        alert("An error occured, quick ! check the console !");
        console.log({
          res : res,
          err : err
        });
      }
    };
  };

  util.updateLayerList =  function(theFile) {
    return function(e) {};
  };

  // handle drop event
  util.handleDropGeojson =  function(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    var files = evt.dataTransfer.files;

    var nFiles = files.length;
    var incFile = 100 / nFiles;
    var progressBar = 0;

    // In case of multiple file, loop on them
    for (var i = 0; i < nFiles; i++) {
      
      var f = files[i];

      // Only process geojson files. Validate later.
      if (f.name.toLowerCase().indexOf(".geojson") == -1) {
        alert(f.name + " : filename not valid. Should be <filename>.geojson");
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
      reader.readAsText(f);
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
