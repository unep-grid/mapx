var settings = require("./../settings");
var multer  = require('multer');
var fs = require('fs');
var path = require('path');
var sendMail= require("./mail.js").sendMail;
var spawn =  require('child_process').spawn;
var pgWrite = require.main.require("./db").pgWrite;
var emailAdmin = settings.mail.config.emailAdmin;
var template = require("../templates");
var utils = require("./utils.js");

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    var pathTemp = settings.vector.path.temporary; 
    cb(null, pathTemp);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "_" + file.originalname );
  }
});

var uploadHandler = multer({ storage: storage }).single('vector');



/**
* Upload's middleware
*/
module.exports.upload = [
  uploadHandler,
  validateUserHandler,
  convertOgrHandler,
  addSourceHandler
];



/**
* Handlers 
*/


/**
* Validate User
*/
function validateUserHandler(req, res, next){

  var msgTitle = "MapX authentication: ";
  var idUser =  req.body.idUser;
  var userToken =  req.body.token;
  var idProject = req.body.project;
  var msg = msgTitle + ' user ' + idUser + ' authentification in project ' + idProject + ' ';
  var sqlUser = 'SELECT id, email' +
    ' FROM mx_users '+
    ' WHERE' +
    ' id = $1::integer AND' +
    ' key = $2::text';

  var sqlProject = 'SELECT id' +
    ' FROM mx_projects' +
    ' WHERE' + 
    ' id = $1::text AND (' +
    ' admins @> $2::jsonb OR ' +
    ' publishers @> $2::jsonb ' +
    ' )';

  var validation = {};

  pgWrite.query(sqlUser,[idUser,userToken])
    .then(function(result){


      console.log(result.rows[0]);
      if ( result && result.rows && result.rows[0] ) {
        validation.user = true;
        if(!req.body.email) req.body.email = result.rows[0].email;
      }

      return  pgWrite.query(sqlProject,[idProject,idUser]);

    })
    .then(function(result){

      var v = validation ;

      if (v.user && result && result.rows && result.rows[0]) {
        validation.project = true;
      }

      if(v.project && v.user){
        res.write(JSON.stringify({type:'message', msg:msg+' : ok.'})+'\t\n');
        next();
      }else{
        res.write(JSON.stringify({type:'message', msg:msg+' : failed.'})+'\t\n');
        res.status("403").end();
      }
    })
    .catch(function(err){
      res.write(JSON.stringify({type:'message',msg : msg + ' : error(.' + err + ')'})+'\t\n');
      res.status("403").end();
    });
}

/**
* Convert data
*/
function convertOgrHandler(req,res,next){
  msg = "";
  var email = req.body.email || '';

  fileToPostgres(
    fileName = req.file.filename,
    idUser = req.body.idUser,
    sourceSrs = req.body.sourceSrs,
    onMessage = function(data){
      if(data.msg){
        res.write(JSON.stringify({ type:data.type, msg :data.msg })+'\t\n');
      }      
    },
    onError = function(data){

      sendMail({
        to : [email,emailAdmin].join(','),
        text : data.msg,
        subject : 'MapX import error'
      });

      res.status(500).end();
    },
    onSuccess = function(idSource){
      req.body.idSource = idSource;
      next();
    }
  );


}
/**
* Handler for adding reccord in source table
*/
function addSourceHandler(req,res,next){

  var title = req.body.title;
  var email = req.body.email;
  var idProject = req.body.project;
  var idUser = req.body.idUser*1;
  var idSource = req.body.idSource;
  var fileToRemove = req.file.path;
  var msg = "";

  var sqlAddSource = 'INSERT INTO mx_sources (' +
    ' id, editor, readers, editors, date_modified, type, project, data '+
    ') VALUES (' + 
    ' $1::text,' +
    ' $2::integer,' +
    ' \'["publishers"]\',' +
    ' \'["publishers"]\',' +
    ' now(),' +
    ' \'vector\','+ 
    ' $3::text,'+
    ' \'{"meta":{"text":{"title":{"en":"'+ title +'"}}}}\' '+
    ')';

  pgWrite.query(sqlAddSource,[idSource, idUser, idProject])
    .then(function(result){
      /**
      * Final step : send a message
      */
      cleanFile();
      msg = 'Added new entry ' + title + ' ( id:' + idSource + ' ) in project ' + idProject;       
      res.write(JSON.stringify({type:'message',msg:msg})+'\t\n');


      if(email){
        var mailConf = {
          to : [email],
          text : msg,
          subject : 'MapX import success for source ' + title
        };

        sendMail(mailConf);
      }
      res.status(200).end();
    })
    .catch(function(err){

      cleanAll()
        .then(function(){

          /**
          * In case of error, send maio 
          */
          msg = 'Failed to create a new entry ( ' + err + ' )';
          res.write(JSON.stringify({type:'message',msg:msg})+'\t\n');
         
          sendMail({
            to : [email,emailAdmin].join(','),
            text : msg,
            subject : 'MapX import error'
          });

          res.status('403').end();
        })
        .catch(function(err){
          res.write(msgTitle + err);
          res.status("403").end();
        });
    });

  /**
   * If importeed file exists, remove it
   */
  function cleanFile(){
    if(fs.exists(fileToRemove)){
      fs.unlink(fileToRemove);
    }
    var msgClean =  'Removed temporary files';
    res.write(JSON.stringify({type:'message',msg:msgClean})+'\t\n');
  }

  /**
   * In case of faillure, clean the db : remove added entry and table
   */
  function cleanAll(){
    cleanFile();  
    var msgCleanAll = "";
    return new Promise(function(){
      pgWrite.query('DROP TABLE IF EXISTS %s',[idSource])
        .then(function(){ 
          pgWrite.query('DELETE FROM mx_sources WHERE id = \'%s\'',[idSource]);
          msgCleanAll = 'New entry and table were removed, if needed.'; 
          res.write(JSON.stringify({type:'message',msg:msgCleanAll})+'\t\n');
        })
        .catch(function(err){
          msgCleanAll = 'Error during importation cleaning (' + err + ')';
          res.write(JSON.stringify({type:'message',msg:msgCleanAll})+'\t\n');
        });
    });
  }

}


/**
* Helper to write file in postgres
*/
function fileToPostgres(fileName,idUser,sourceSrs, onMessage, onError, onSuccess ){

  onMessage = onMessage || function(data){console.log(data.type +" : "+ data.msg );};
  onError = onError || function(data){};
  onSuccess = onSuccess|| function(data){console.log(JSON.stringify(data));};

  var idSource = utils.randomString("mx_vector", 4, 5).toLowerCase() + "_u_" + idUser;
  process.chdir(settings.vector.path.temporary);

  var isZip = fileName.search(/.zip$|.gz$/) !== -1;

  if(isZip){
    fileName = '/vsizip/'+fileName;
  }

  onMessage({msg:'Conversion using ogr2ogr : please wait ...',type:'message'});

  var args = [
    '-f', 'PostgreSQL',
    '-nln', idSource,
    '-nlt', 'PROMOTE_TO_MULTI',
    '-geomfield', 'geom',
    '-lco', 'GEOMETRY_NAME=geom',
    '-lco', 'SCHEMA=public',
    '-lco', 'OVERWRITE=YES',
    '-lco', 'FID=gid',
    '-skipfailures',
    '-progress',
    '-overwrite',
    '-t_srs', 'EPSG:4326'
  ];

  if(sourceSrs){
    args = argBase.concat([
      '-s_srs', sourceSrc
    ]);
  }

  args = args.concat([
    settings.db.stringWrite,
    fileName
  ]);

  var cmd = 'ogr2ogr';

  var ogr =  spawn(cmd,args);

  ogr.stdout.on('data', function (data) {
    data  = data.toString('utf8');
    var progressNums = data.split('.');
    var hasProg = false;
    progressNums.forEach(function(prog){
      prog = parseFloat(prog);
      if(!isNaN(prog) && isFinite(prog)){
        hasProg = true;
        onMessage({
          msg : prog,
          type : 'progress'
        });
      }
    });
    if(!hasProg){

      onMessage({
        msg : data,
        type : 'message'
      });
    }
  });

  ogr.stderr.on('data', function (data) {
    data  = data.toString('utf8');
    onMessage({
      msg : data,
      type : 'issue'
    });
  });

  ogr.on('exit', function (code, signal) {

    //console.log(code +"\n");

    var msg = "";
    if (code !== 0) {

      msg =  'The import function exited with code ' + code +  ' ( ' + signal + ' ) Please try again.';

      onError({
        code : code,
        msg  : msg
      });
      return;
    }

    msg =  'The import was successful';

    onMessage({
      msg : msg,
      type : 'message'
    });

    onSuccess(idSource);

  });
}


