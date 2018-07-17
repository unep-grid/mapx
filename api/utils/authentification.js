/**
 * Helpers
 */
var settings = require.main.require("./settings");
var clientPgRead = require.main.require("./db").pgRead;
var u = require("./utils.js");
var t = require("../templates");

function validateUserToken(id,token,onValidated){

  var sql = u.parseTemplate(
    t.userValidation,
    { 
      id : +id,
      token : token,
      key :  settings.pg.con.key
    }
  );

  clientPgRead.query(sql, function(err, result) {
    var out = false;
    if( !err && result && result.rows instanceof Array ){
      out = result.rows[0].valid === true;
    }
    onValidated(out);
  });
}


exports.validateUserToken = function(req, res, next){

  var id = req.body.idUser;
  var token  = req.body.token;

  validateUserToken(id,token,function(valid){

    if(valid){
      next();
    }else{
      res.status(401).send("Unable to authenticate user " + id + ".");
    }
  });
};
