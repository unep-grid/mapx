//var ogr2ogr = require("ogr2ogr");
var archiver = require('archiver');
var tar = require('tar');
var fs = require("fs");
var getColumnsNames = require('./db.js').getColumnsNames;
var sendMail= require("./mail.js").sendMail;
var spawn =  require('child_process').spawn;
var settings = require.main.require("./settings");
var cryptoKey =  settings.db.crypto.key;
var apiHostUrl = settings.api.host;
var apiPort = settings.api.port;
var emailAdmin = settings.mail.config.emailAdmin;
var template = require("../templates");
var utils = require("./utils.js");
var pgRead = require.main.require("./db").pgRead;
var fileFormat = {
  "GPKG" : {
    ext : 'gpkg'
  },
  "GML" : {
    ext : 'gml'
  },
  "KML" : {
    ext : 'kml'
  },
  "GPX" : {
    ext : 'gpx'
  },
  "GeoJSON" : {
    ext : 'geojson'
  },
  "ESRI Shapefile" : {
    ext : 'shp'
  },
  "CSV" : {
    ext : 'csv'
  }
};
var formatDefault = 'GPKG';
if( apiPort != 80 && apiPort != 443 ){
  apiHostUrl = apiHostUrl + ":" + apiPort;
}


/**
* Request handler / middleware
*/

exports.get =  function(req,res){
  var data = '';
  var query = '';
  res.setHeader('Content-Type', 'application/json');

  decrypt(req.query.data)
    .then( data => {
      
      if( !data ){
        res.status(403).send('Empty query');
        return;
      }

      return extractFromPostgres(data,{
        onMessage : function(msg,type){
          type =  type || 'message';
          res.write(JSON.stringify({
            type: type,
            msg: msg
          })+"\t\n");
        },
        onEnd : function(msg){
          res.write(JSON.stringify({
            type: 'end', 
            msg: msg
          })+"\t\n");
          res.end();
        }
      });

    })
    .catch( e => {
      console.log(e);
      res.write(JSON.stringify({
        type:'error', 
        msg: e
      })+"\t\n");
      res.end();
    });
};

/**
* Decrypt utility
* @param {String} str string to decrypt
*/
function decrypt(str){

  var sqlDecrypt = {
    text: `SELECT mx_decrypt($1, $2) AS data`,
    values: [str,cryptoKey]
  };

  return  pgRead.query(sqlDecrypt)
    .then(function(sqlRes){

      if( sqlRes && sqlRes.rows instanceof Array && sqlRes.rows[0] ){
        data = JSON.parse(sqlRes.rows[0].data);
      }else{
        data = null;
      }

      return data;
    });
}


/**
* Exportation script
*/
function extractFromPostgres(config,cb){
  var id = config.layer;
  var metadata = [];
  var email = config.email;
  var format = config.format;
  var epsgCode = config.epsgCode || 4326;
  var iso3codes = config.iso3codes;
  var filename = config.filename || id;
  var onMessage = cb.onMessage;
  var onEnd = cb.onEnd;
  var attributesPg ="";
  var attributes = [];
  var sqlOGR = "SELECT * from " + id;
  var ext = fileFormat[format].ext;
  var geom = 'geom';
  var layername = filename;
  /**
   * folder local path. eg. /shared/download/mx_dl_1234 and /shared/download/mx_dl_1234.zip
   */
  var folderPath = settings.vector.path.download;
  var folderName =  utils.randomString("mx_dl");
  folderPath = folderPath + '/' + folderName;
  var filePath =  folderPath + '/' + filename + "." +ext;
  var folderPathZip = folderPath + ".zip";
  /**
   * url lcoation. eg /download/mx_dl_1234.zip
   */
  var folderUrl =  settings.vector.path.download_url;
  var folderUrlZip = folderUrl + folderName + ".zip";

  if(!id){
    return Promise.reject('No id');
  }
  if(!email){
    return Promise.reject('No email');
  }

  if(typeof iso3codes  == "string"){
    iso3codes = [iso3codes];
  }

  if(!format || !fileFormat[format]){
    onMessage( 'Format "' + format + '" unknown or unset. Using default ( ' + formatDefault +' )');
    format = formatDefault;
  }

  return utils.getSourceMetadata(id)
    .then(m => {
      if(m.rows[0] && m.rows[0].metadata){
        metadata = m.rows[0].metadata;
      }
      return getColumnsNames(id);
    })
    .then( attr => {
      attributes = attr.filter( a => a != 'geom');
      attributesPg = utils.attrToPgCol(attributes);

      /**
       * If intersection, crop by country
       */
      if( iso3codes && iso3codes.constructor === Array && iso3codes.length > 0){
        iso3codes = "'"+iso3codes.join("','")+"'";

        sqlOGR = utils.parseTemplate(
          template.layerIntersectionCountry,
          { 
            idLayer : id,
            attributes : attributesPg,
            idLayerCountry : "mx_countries",
            idIso3 : iso3codes
          }
        );
      }
      /**
       * Create folder
       */
      if (!fs.existsSync(folderPath)){
        fs.mkdirSync(folderPath);
      }

      onMessage('An email will be sent to ' + email + ' at the end of the process. The expected path will be http://' + apiHostUrl + folderUrlZip ,'message');
      onMessage('Extration from the database and conversion to '+ format +'. This could take a while, please wait ...','message');


      /**
       *
       * Launch ogr spawn
       *
       */
      var args = [];

      args = args.concat([
        '-f',format,
        '-nln',layername,
        '-sql',sqlOGR,
        '-skipfailures',
        '-s_srs', 'EPSG:4326',
        '-t_srs', 'EPSG:'+ epsgCode,
        '-progress',
        '-overwrite',
        filePath,
        settings.db.stringRead
      ]);

      var cmd = 'ogr2ogr';
      var ogr =  spawn(cmd,args);
      var fakeProg = 0;
      var useFakeProg = false;

      ogr.stdout.on('data', function (data) {
        var isProg = false;
        data  = data.toString('utf8');

        if(!useFakeProg){
          useFakeProg = data.indexOf("Progress turned off")>-1;
        }
        if(useFakeProg){
          onMessage(fakeProg++,'progress');
        }else{
          isProg = stringToProgress(data,function(prog){
            onMessage(prog,"progress");
          });
        }

        if(!isProg){
          onMessage(data,'message');
        }

      });

      ogr.stderr.on('data', function (data) {
        data  = data.toString('utf8');
        onMessage(data,'error');
      });

      ogr.on('exit', function (code, signal) {

        var msg = "";
        if (code !== 0) {

          msg =  'The export function exited with code ' + code +  ' ( ' + signal + ' ) Please try another format or dataset';

          if(email){
            sendMail({
              to : [email,emailAdmin].join(','),
              text : msg,
              subject : 'MapX export error'
            });
          }

          onMessage(msg,'error');
          return;
        }

        /**
         * ZIP IT
         */
        var zipFile = fs.createWriteStream(folderPathZip);

        var archive = archiver('zip', {
          zlib: { level: 9 } // Sets the compression level.
        });

        // listen for all archive data to be written
        // 'close' event is fired only when a file descriptor is involved
        zipFile.on('close', function() {
          console.log(archive.pointer() + ' total bytes');
          console.log('archiver has been finalized and the output file descriptor has closed.');

          msg = "Export success. File available at ";

          if(email){
            sendMail({
              to : email,
              text : msg + "http://" + apiHostUrl + folderUrlZip,
              subject : 'MapX export success'
            });
          }

          onEnd({
            filepath : folderUrlZip,
            format : format,
            msg : msg
          });
        });

        // This event is fired when the data source is drained no matter what was the data source.
        // It is not part of this library but rather from the NodeJS Stream API.
        // @see: https://nodejs.org/api/stream.html#stream_event_end
        zipFile.on('end', function() {
          onMessage("zip on end",'message');
        });


        archive.on('progress',function(prog){
          var percent = ( prog.fs.processedBytes / prog.fs.totalBytes ) * 100 ;
          onMessage(percent,'progress');
        });


        // good practice to catch warnings (ie stat failures and other non-blocking errors)
        archive.on('warning', function(err) {
          if (err.code === 'ENOENT') {
            onMessage(err,'message');
          } else {
            onMessage(err,'error');
            throw err;
          }
        });

        // good practice to catch this error explicitly
        archive.on('error', function(err) {
          onMessage(err,'error');
          throw err;
        });

        // pipe archive data to the file
        archive.pipe(zipFile);

        // append a file from string
        archive.append('Dowloaded from MapX on ' + Date(), { name: 'info.txt' });
        archive.append(JSON.stringify(metadata), { name: 'metadata.json' });

        // append files from a sub-directory and naming it `new-subdir` within the archive
        archive.directory(folderPath, filename);

        // finalize the archive (ie we are done appending files but streams have to finish yet)
        // 'close', 'end' or 'finish' may be fired right after calling this method so register to them beforehand
        archive.finalize();

      });
    });

}

function stringToProgress(str,cb){ 
  var hasProg = false;
  var progressNums = str.split('.');
    progressNums.forEach(function(prog){
      prog = parseFloat(prog);
      if(!isNaN(prog) && isFinite(prog)){
        hasProg = true;
        cb(prog);
      }
    });
  return hasProg;
}
