//var ogr2ogr = require("ogr2ogr");
const archiver = require('archiver');
const fs = require('fs');
const getColumnsNames = require('./db.js').getColumnsNames;
const sendMail = require('./mail.js').sendMail;
const spawn = require('child_process').spawn;
const settings = require.main.require('./settings');
const emailAdmin = settings.mail.config.emailAdmin;
const template = require('../templates');
const utils = require('./utils.js');
const auth = require('./authentication.js');
const isLayerValid = require('./db.js').isLayerValid;
const getSourceMetadata = require('./getSourceMetadata.js').getSourceMetadata;
const apiPort = settings.api.port_public;
const apiHost = settings.api.host_public;
let apiHostUrl = '';
if (apiPort === 443) {
  apiHostUrl = 'https://' + apiHost;
} else if (apiPort === 80) {
  apiHostUrl = 'http://' + apiHost;
} else {
  apiHostUrl = 'http://' + apiHost + ':' + apiPort;
}

var fileFormat = {
  GPKG: {
    ext: 'gpkg'
  },
  GML: {
    ext: 'gml'
  },
  KML: {
    ext: 'kml'
  },
  GPX: {
    ext: 'gpx'
  },
  GeoJSON: {
    ext: 'geojson'
  },
  'ESRI Shapefile': {
    ext: 'shp'
  },
  CSV: {
    ext: 'csv'
  },
  DXF: {
    ext: 'dxf'
  },
  SQLite: {
    ext: 'sqlite'
  }
};

var formatDefault = 'GPKG';
/**
 * Request handler / middleware
 */
module.exports.get = [auth.validateTokenHandler, exportHandler];

function exportHandler(req, res) {
  var config = req.query;
  res.setHeader('Content-Type', 'application/json');

  return extractFromPostgres(config, {
    onMessage: function(msg, type) {
      type = type || 'message';
      res.write(
        JSON.stringify({
          type: type,
          msg: msg
        }) + '\t\n'
      );
    },
    onEnd: function(msg) {
      res.write(
        JSON.stringify({
          type: 'end',
          msg: msg
        }) + '\t\n'
      );
      res.end();
    }
  }).catch((e) => {
    res.write(
      JSON.stringify({
        type: 'error',
        msg: e
      }) + '\t\n'
    );
    res.end();
  });
}

/**
 * Exportation script
 */
function extractFromPostgres(config, cb) {
  var id = config.layer || config.idSource;
  var metadata = [];
  var email = config.email;
  var format = config.format;
  var epsgCode = config.epsgCode || 4326;
  var iso3codes = config.iso3codes;
  var filename = config.filename || id;
  var onMessage = cb.onMessage;
  var onEnd = cb.onEnd;
  var sqlOGR = 'SELECT * from ' + id;
  var ext = fileFormat[format].ext;
  var layername = filename;
  /**
   * folder local path. eg. /shared/download/mx_dl_1234 and /shared/download/mx_dl_1234.zip
   */
  var folderPath = settings.vector.path.download;
  var folderName = utils.randomString('mx_dl');
  folderPath = folderPath + '/' + folderName;
  var filePath = folderPath + '/' + filename + '.' + ext;
  var folderPathZip = folderPath + '.zip';
  /**
   * url lcoation. eg /download/mx_dl_1234.zip
   */
  var folderUrl = settings.vector.path.download_url;
  var folderUrlZip = folderUrl + folderName + '.zip';
  var dataUrl = apiHostUrl + folderUrlZip;

  if (!id) {
    return Promise.reject('No id');
  }
  if (!email) {
    return Promise.reject('No email');
  }

  if (typeof iso3codes === 'string') {
    iso3codes = iso3codes.split(',');
  }
  if (iso3codes && iso3codes instanceof Array) {
    iso3codes = iso3codes.filter((i) => {
      return i && i.length === 3;
    });
  }

  if (!format || !fileFormat[format]) {
    onMessage(
      'Format "' +
        format +
        '" unknown or unset. Using default ( ' +
        formatDefault +
        ' )'
    );
    format = formatDefault;
  }

  return getSourceMetadata({id: id})
    .then((m) => {
      metadata = m;
      onMessage('Extracted metadata');
      return getColumnsNames(id);
    })
    .then((attr) => {
      var hasCountryClip =
        iso3codes && iso3codes.constructor === Array && iso3codes.length > 0;

      /**
       * If intersection, crop by country
       */
      if (!hasCountryClip) {
        onMessage('Request without country clipping, continue');
        return Promise.resolve({valid: true});
      } else {
        /**
         * Validity check
         */
        onMessage('Request with country clipping, test for invalid geometry');
        return isLayerValid(id, true, false).then((test) => {
          if (test.valid === true) {
            /**
             * Test seems to be ok
             */
            onMessage('Geometry seems valid, continue');
            sqlOGR = getSqlClip(id, iso3codes, attr);
          } else {
            /**
             * Test failed. at least one feature presented bad geometry
             */
            var err = `Layer ${test.id} (${
              test.title
            }) has invalid geometry and cannot be clipped by country. Please correct the layer then try again. `;
            onMessage(err, 'error');

            throw new Error('Invalid geometry found');
          }
          return test;
        });
      }
    })
    .then((test) => {
      if (!test || !test.valid) {
        throw new Error('Issue with geometry validation, unknown state');
      }

      /**
       * Create folder
       */
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
      }

      onMessage(
        `An email will be sent to ${email} at the end of the process. The expected path will be ${dataUrl}`
      );

      onMessage(
        `Extration from the database and conversion to ${format}. This could take a while, plase wait`
      );

      /**
       *
       * Launch ogr spawn
       *
       */
      var args = [];

      args = args.concat([
        '-f',
        format,
        '-nln',
        layername,
        '-sql',
        sqlOGR,
        '-skipfailures',
        '-s_srs',
        'EPSG:4326',
        '-t_srs',
        'EPSG:' + epsgCode,
        '-progress',
        '-overwrite',
        filePath,
        settings.db.stringRead
      ]);

      var cmd = 'ogr2ogr';
      var ogr = spawn(cmd, args);
      var fakeProg = 0;
      var useFakeProg = false;

      ogr.stdout.on('data', function(data) {
        var isProg = false;
        data = data.toString('utf8');

        if (!useFakeProg) {
          useFakeProg = data.indexOf('Progress turned off') > -1;
        }
        if (useFakeProg) {
          onMessage(fakeProg++, 'progress');
        } else {
          isProg = stringToProgress(data, function(prog) {
            onMessage(prog, 'progress');
          });
        }

        if (!isProg) {
          onMessage(data, 'message');
        }
      });

      ogr.stderr.on('data', function(data) {
        data = data.toString('utf8');
        onMessage(data, 'warning');
      });

      ogr.on('exit', function(code, signal) {
        var msg = '';
        if (code !== 0) {
          msg = `The export function exited with code ${code} : ${signal}. Please try another format`;

          if (email) {
            sendMail({
              to: [email, emailAdmin].join(','),
              text: msg,
              subject: 'MapX export error'
            });
          }

          onMessage(msg, 'error');
          return;
        }

        /**
         * ZIP IT
         */
        var zipFile = fs.createWriteStream(folderPathZip);

        var archive = archiver('zip', {
          zlib: {level: 9} // Sets the compression level.
        });

        // listen for all archive data to be written
        // 'close' event is fired only when a file descriptor is involved
        zipFile.on('close', function() {
          msg = 'Export success. File available here: ';

          if (email) {
            sendMail({
              to: email,
              text: `${msg} ${dataUrl}`,
              subject: 'MapX export success'
            });
          }

          onEnd({
            filepath: folderUrlZip,
            format: format,
            msg: msg
          });
        });

        // This event is fired when the data source is drained no matter what was the data source.
        // It is not part of this library but rather from the NodeJS Stream API.
        // @see: https://nodejs.org/api/stream.html#stream_event_end
        zipFile.on('end', function() {
          onMessage('zip on end', 'message');
        });

        archive.on('progress', function(prog) {
          var percent = (prog.fs.processedBytes / prog.fs.totalBytes) * 100;
          onMessage(percent, 'progress');
        });

        archive.on('warning', function(err) {
          if (err.code === 'ENOENT') {
            onMessage(err, 'warning');
          } else {
            onMessage(err, 'error');
            throw err;
          }
        });

        archive.on('error', function(err) {
          onMessage(err, 'error');
          throw err;
        });

        // pipe archive data to the file
        archive.pipe(zipFile);

        // append a file from string
        archive.append('Dowloaded from MapX on ' + Date(), {name: 'info.txt'});
        archive.append(JSON.stringify(metadata), {name: 'metadata.json'});

        // append files from a sub-directory and naming it `new-subdir` within the archive
        archive.directory(folderPath, filename);

        // finalize the archive (ie we are done appending files but streams have to finish yet)
        // 'close', 'end' or 'finish' may be fired right after calling this method so register to them beforehand
        archive.finalize();
      });
    });
}

function getSqlClip(idSource, iso3codes, attributes) {
  attributes = attributes.filter((a) => a !== 'geom');
  attributesPg = utils.attrToPgCol(attributes);

  iso3codes = "'" + iso3codes.join("','") + "'";

  var sql = utils.parseTemplate(template.layerIntersectionCountry, {
    idLayer: idSource,
    attributes: attributesPg,
    idLayerCountry: 'mx_countries',
    idIso3: iso3codes
  });

  return sql;
}

function stringToProgress(str, cb) {
  var hasProg = false;
  var progressNums = str.split('.');
  progressNums.forEach(function(prog) {
    prog = parseFloat(prog);
    if (!isNaN(prog) && isFinite(prog)) {
      hasProg = true;
      cb(prog);
    }
  });
  return hasProg;
}
