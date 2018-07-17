const pgRead = require.main.require("./db").pgRead;
const pgWrite = require.main.require("./db").pgWrite;
const settings = require.main.require("./settings");
const key =  settings.db.crypto.key;

exports.get = function(req,res){
  var sqlDecrypt = 'SELECT mx_decrypt(\'' + req.query.data + '\',\'' + key + '\') query';
  var data = '';
  var query = '';

  pgRead.query(sqlDecrypt)
    .then(function(sqlRes){
    if( sqlRes && sqlRes.rows instanceof Array && sqlRes.rows[0] ){
      data = JSON.parse(sqlRes.rows[0].query).data;
    }else{
      data = null;
    }
   if(!data) throw new Error('Empty query');

  return pgRead.query(data.sql);

    })
  .then(function(sqlRes){
    console.log(sqlRes.rows);
    /* Return result set */
    res.send(sqlRes.rows);
  }).catch(function(err){
    res.status(403).send("Bad request " + err);
  });
};

//exports.crypto = function(req,res){
  //var sqlDecrypt = 'SELECT mx_decrypt(\'' + req.query.data + '\',\'' + key + '\') query';
  //var data = '';
  //var query = '';

  //pgRead.query(sqlDecrypt)
    //.then(function(sqlRes){
    //if( sqlRes && sqlRes.rows instanceof Array && sqlRes.rows[0] ){
      //data = JSON.parse(sqlRes.rows[0].query).data;
    //}else{
      //data = null;
    //}
   //if(!data) throw new Error('Empty query');



  //return pgRead.query(data.sql);

    //})
  //.then(function(sqlRes){
    //console.log(sqlRes.rows);
    //[> Return result set <]
    //res.send(sqlRes.rows);
  //}).catch(function(err){
    //res.status(403).send("Bad request " + err);
  //});
//};

