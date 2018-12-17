const pgRead = require.main.require("./db").pgRead;
const settings = require.main.require("./settings");
const decrypt = require("./db.js").decrypt;


/**
* Get a custom request
* data : {"type":"query","validUntil":{},"data":{"sql":"select count(*) from mx_uga_vector_9sfi1_5ol25_dtgas"}}
*/
exports.get = function(req,res){
  var encryptedQuery = req.query.data;
  decrypt( encryptedQuery )
  .then( result => {
    var data = result.data;
   if( !data || !data.sql ) throw new Error('Empty query');
    return pgRead.query(data.sql);
    })
  .then(function(sqlRes){
    res.send(sqlRes.rows);
  }).catch(function(err){
    res.status(403).send("Bad request " + err);
  });
};

