/*jshint esversion: 6 */

function handleProgressUpdate(f) {
  var helper = mx.helpers;
  return function(e) {
    if (e.lengthComputable) {
      var percentLoaded = Math.round((e.loaded / e.total) * 50);
      helper.progressScreen({
        enable: true,
        id: f.name,
        percent: percentLoaded,
        text: f.name + ' loading (' + percentLoaded + '%)'
      });
    }
  };
}

function handleProgressInit(f) {
  var helper = mx.helpers;
  return function() {
    helper.progressScreen({
      enable: true,
      id: f.name,
      percent: 0,
      text: f.name + ' init .. '
    });
  };
}

function handleProgressError(f) {
  var helper = mx.helpers;
  return function() {
    helper.progressScreen({
      enable: true,
      id: f.name,
      percent: 100,
      text: f.name + 'stop .. '
    });
  };
}

// handle zip to geojson
export function zipToGeojson(data) {
  var shp,
    dbf,
    prj,
    err = '';
  var projOrig,
    projDest =
      '+title=WGS 84 (long/lat) +proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees';
  var helper = this;
  var shapefile, JSZip, turf, proj4;

  return Promise.all([
    import('jszip'),
    import('shapefile'),
    import('proj4'),
    import('@turf/meta')
  ])
    .then(function(m) {
      JSZip = m[0];
      shapefile = m[1];
      proj4 = m[2].default || m[2];
      turf = m[3];
      return JSZip.loadAsync(data);
    })
    .then(function(files) {
      var fileData = files.files;

      for (var f in fileData) {
        var ext = mx.helpers.getExtension(f);
        if (ext === '.dbf') {
          dbf = fileData[f];
        }
        if (ext === '.shp') {
          shp = fileData[f];
        }
        if (ext === '.prj') {
          prj = fileData[f];
        }
      }

      if (!shp) {
        err = err + ' No shp file found in archive, abord.';
      }
      if (!dbf) {
        err = err + ' No dbf file found in archive, abord.';
      }
      if (!prj) {
        err = err + ' No prj file found in archive, abord.';
      }

      var rShp = shp.async('Uint8Array');
      var rDbf = dbf.async('Uint8Array');
      var rPrj = prj.async('text');

      return Promise.all([rShp, rDbf, rPrj]);
    })
    .then(function(v) {
      projOrig = v[2];

      return shapefile.read(v[0], v[1]);
    })
    .then(function(gj) {
      var newCoord = [];

      return new Promise(function(resolve) {
        turf.coordEach(gj, function(coord) {
          newCoord = proj4(projOrig, projDest, coord);
          coord[0] = newCoord[0];
          coord[1] = newCoord[1];
        });

        resolve(gj);
      });
    })
    .catch(function(e) {
      helper.modal({
        content: e + ' / ' + err,
        title: 'Error while reading shapefile'
      });
    });
}

/**
 * Convert data to geojson
 * @param {String} data data to parse
 * @param {String} Data type. Eg. kml, gpx, geojson
 */

export function parseDataToGeojson(data, fileType) {
  var out;
  switch (fileType) {
    case 'kml':
      out = import('togeojson').then(function(toGeoJSON) {
        return toGeoJSON.kml(new DOMParser().parseFromString(data, 'text/xml'));
      });
      break;
    case 'gpx':
      out = import('togeojson').then(function(toGeoJSON) {
        return toGeoJSON.gpx(new DOMParser().parseFromString(data, 'text/xml'));
      });
      break;
    case 'zip':
      out = mx.helpers.zipToGeojson(data);
      break;
    case 'geojson':
      out = new Promise(function(resolve) {
        if (mx.helpers.isString(data)) {
          resolve(JSON.parse(data));
        } else {
          resolve(data);
        }
      });
      break;
    default:
      out = new Promise(function() {
        console.log("Can't read data in " + format + ' format');
      });
      break;
  }

  return out;
}

// handle worker
function handleFileParser(f) {
  var helper = mx.helpers;

  return function handler(e) {
    /**
     * Test for size
     */
    if (f && f.size && f.size > mx.settings.maxByteUpload) {
      var msg = '<p>The file size reached the current limit.</p>';
      msg = msg + '<p>The file size is ' + f.size + ' byte </p>';
      msg = msg + '<p>The limit is ' + mx.settings.maxByteUpload + ' byte </p>';
      msg =
        msg +
        '<p> Registered users can upload big dataset in the toolbox section </p>';
      helper.modal({
        content: msg,
        title: 'Max size reached'
      });
      helper.progressScreen({
        enable: false,
        id: f.name
      });
      return;
    }

    saveSpatialDataAsView({
      fileName: f.name,
      fileType: f.fileType,
      data: e.target.result
    });
  };
}

export function saveSpatialDataAsView(opt) {
  var helper = mx.helpers;

  /**
   * Init
   */
  var c = {
    worker: null,
    data: opt.data,
    map: helper.getMap(),
    gj: {},
    fileType: opt.fileType,
    fileName: opt.fileName,
    title : opt.title || opt.fileName.split('.')[0]
  };

  return mx.helpers
    .moduleLoad('mx-drag-drop-worker')
    .then((geojsonWorker) => {
      c.worker = new geojsonWorker();
      /**
       * Parse data according to filetype
       */
      return helper.parseDataToGeojson(c.data, c.fileType);
    })
    .then(function(gJson) {
      /*
       * handle message received
       */
      c.worker.onmessage = function(e) {
        var m = e.data;

        if (m.progress) {
          helper.progressScreen({
            enable: true,
            id: c.fileName,
            percent: m.progress,
            text: c.fileName + ': ' + m.message
          });
        }

        /*
         * Errors
         */
        if (m.errorMessage) {
          alert(m.errorMessage);
        }

        /*
         * Extent
         */
        if (m.extent) {
          // bug with extent +/- 90. See https://github.com/mapbox/mapbox-gl-js/issues/3474
          if (m.extent[0] < -179) {
            m.extent[0] = -179;
          }
          if (m.extent[1] < -85) {
            m.extent[1] = -85;
          }
          if (m.extent[2] > 179) {
            m.extent[2] = 179;
          }
          if (m.extent[3] > 85) {
            m.extent[3] = 85;
          }

          var a = new mx.mapboxgl.LngLatBounds(
            new mx.mapboxgl.LngLat(m.extent[0], m.extent[1]),
            new mx.mapboxgl.LngLat(m.extent[2], m.extent[3])
          );
          c.map.fitBounds(a);
        }

        // If layer is valid and returned
        if (m.layer) {
          helper.progressScreen({
            enable: true,
            id: c.fileName,
            percent: 100,
            text: c.fileName + ' done'
          });

          // mx default view
          var view = {
            id: m.id,
            type: 'gj',
            project: mx.settings.project,
            date_modified: new Date().toLocaleDateString(),
            data: {
              title: { 
                en: c.title
              }, 
              attributes: m.attributes,
              abstract: {
                en: c.title 
              },
              geometry: {
                extent: {
                  lng1: m.extent[0],
                  lat1: m.extent[1],
                  lng2: m.extent[2],
                  lat2: m.extent[3]
                }
              },
              layer: m.layer,
              source: {
                type: 'geojson',
                data: m.geojson
              }
            }
          };

          saveInLocalDb({
            view: view
          });

          mx.helpers.renderViewsList({
            views: view,
            add: true,
            open: true
          });

          c.worker.terminate();
        }
      };

      /*
       * Message to pass to the worker
       */
      c.worker.postMessage({
        data: gJson,
        fileName: c.fileName,
        fileType: c.fileType,
        id: 'MX-GJ-' + mx.helpers.makeId(10)
      });
    });
}

function saveInLocalDb(opt) {
  mx.data.geojson
    .setItem(opt.view.id, {
      view: opt.view
    })
    .then(() => {
      console.log(
        'Data saved and registered as geojson source. Id = ' + opt.view.id
      );
    })
    .catch((e) => console.warn(e));
}

// handle drop event
export function handleUploadFileEvent(evt) {
  evt.stopPropagation();
  evt.preventDefault();
  var helper = mx.helpers;
  var files = evt.dataTransfer.files;

  var nFiles = files.length;
  var exts = {
    '.json': 'geojson',
    '.geojson': 'geojson',
    '.kml': 'kml',
    '.gpx': 'gpx',
    '.zip': 'zip'
  };

  // In case of multiple file, loop on them
  for (var i = 0; i < nFiles; i++) {
    var f = files[i];
    f.fileType = exts[helper.getExtension(f.name)];

    // Only process geojson files. Validate later.
    if (!f.fileType) {
      alert(
        f.name +
          ' : filename not valid. Supported files – based on file extension – are ' +
          JSON.stringify(Object.keys(exts))
      );
      continue;
    }

    // get a new reader
    var reader = new FileReader();
    // handle events
    reader.onloadstart = handleProgressInit(f);
    reader.onprogress = handleProgressUpdate(f);
    reader.onerror = handleProgressError(f);
    reader.onload = handleFileParser(f);

    /*
     * read the data
     */
    if (f.fileType === 'zip') {
      reader.readAsArrayBuffer(f);
    } else {
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
export function handleReadGeojson() {}
