//var ogr2ogr = require("ogr2ogr");
var archiver = require('archiver');
var tar = require('tar');
var fs = require("fs");
var sendMail= require("./mail.js").sendMail;
var spawn =  require('child_process').spawn;
var clientPgRead = require.main.require("./db").pgRead;
var settings = require.main.require("./settings");
var apiHostUrl = settings.api.host;
var apiPort = settings.api.port;
var emailAdmin = settings.mail.config.emailAdmin;
var template = require("../templates");
var utils = require("./utils.js");
var pgRead = require.main.require("./db").pgRead;
var cryptoKey =  settings.db.crypto.key;
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
  var sqlDecrypt = 'SELECT mx_decrypt(\'' + req.query.data + '\',\'' + cryptoKey + '\') as data ;';
  var data = '';
  var query = '';
  res.setHeader('Content-Type', 'application/json');

  pgRead.query(sqlDecrypt)
    .then(function(sqlRes){

      if( sqlRes && sqlRes.rows instanceof Array && sqlRes.rows[0] ){
        data = JSON.parse(sqlRes.rows[0].data);
      }else{
        data = null;
      }

      if( !data ){
        res.status(403).send('Empty query');
        return;
      }

      extractFromPostgres(data,{
        onStop : function(msg){
          res.write(JSON.stringify({type:'error',msg:msg})+"\t\n");
          res.end();
        },
        onMessage : function(msg,type){
          type =  type || 'message';
          res.write(JSON.stringify({type:type,msg:msg})+"\t\n");
        },
        onEnd : function(msg){
          res.write(JSON.stringify({type:'end',msg:msg})+"\t\n");
          res.end();
        }
      }
      );
    });

};

/**
* Exportation script
*/
function extractFromPostgres(config,cb){
  var id = config.layer;
  var email = config.email;
  var format = config.format;
  var iso3codes = config.iso3codes;
  var filename = config.filename || id;
  var onStop = cb.onStop;
  var onMessage = cb.onMessage;
  var onEnd = cb.onEnd;


  if(!id){
    onStop("No Id");
    return;
  }
  if(!email){
    onStop("No email."); 
    return;
  }
  if(typeof iso3codes  == "string"){
    iso3codes = [iso3codes];
  }

  if(!format || !fileFormat[format]){
    onMessage( 'Format "' + format + '" unknown or unset. Using default ( ' + formatDefault +' )');
    format = formatDefault;
  }

  var sql = 'SELECT * from ' + id;

  if( iso3codes && iso3codes.constructor === Array && iso3codes.length > 0){
    iso3codes = "'"+iso3codes.join("','")+"'";

    sql = utils.parseTemplate(
      template.layerIntersectsCountry,
      { 
        idLayer : id,
        idLayerCountry : "mx_countries",
        idIso3 : iso3codes 
      }
    );
  }
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

  if (!fs.existsSync(folderPath)){
    fs.mkdirSync(folderPath);
  }

  onMessage('An email will be sent to ' + email + ' at the end of the process. The expected path will be http://' + apiHostUrl + folderUrlZip ,'message');
  onMessage('Extration from the database and conversion to '+ format +'. This could take a while, please wait ...','message');
  //'-lco','GEOMETRY_NAME=geom',

  var args = [];

  args = args.concat([
    '-f',format,
    '-nln',layername,
    '-sql',sql,
    '-skipfailures',
    '-s_srs', 'EPSG:4326',
    '-t_srs', 'EPSG:4326',
    '-progress',
    '-overwrite',
    filePath,
    settings.db.stringRead
  ]);

  var cmd = 'ogr2ogr';

  var ogr =  spawn(cmd,args);

  /* Initial progress. To show something if */
  var fakeProg = 0;
  var useFakeProg = false;

  ogr.stdout.on('data', function (data) {
    var isProg = false;
    data  = data.toString('utf8');
    console.log(data);
    console.log(data.indexOf("Progress turned off")>-1);

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
      onStop(msg);
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

    // append files from a sub-directory and naming it `new-subdir` within the archive
    archive.directory(folderPath, filename);

    // finalize the archive (ie we are done appending files but streams have to finish yet)
    // 'close', 'end' or 'finish' may be fired right after calling this method so register to them beforehand
    archive.finalize();

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
