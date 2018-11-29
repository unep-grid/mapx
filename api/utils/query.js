const pgRead = require.main.require("./db").pgRead;
const settings = require.main.require("./settings");
const key =  settings.db.crypto.key;
const utils = require("./utils.js");


exports.get = function(req,res){
 
  var encryptedQuery = req.query.data;
  
  utils.decrypt( encryptedQuery )
  .then( data => {
   if( !data || !data.sql ) throw new Error('Empty query');
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

