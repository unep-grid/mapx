/**
 * Helpers
 */
var settings = require.main.require("./settings");
var pgWrite = require.main.require("./db").pgWrite;
var u = require("./utils.js");

/**
* Exports
*/
exports.authenticateHandler = authenticate;

/**
* Validate / authenticate user
*/
function authenticate(req, res, next){

  var msgTitle = "MapX authentication: ";
  var idUser = req.body.idUser;
  var userToken = req.body.token;
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

/*var t = require("../templates");*/

//function validateUserToken(id,token,onValidated){

  //var sql = u.parseTemplate(
    //t.userValidation,
    //{ 
      //id : +id,
      //token : token,
      //key :  settings.db.crypto.key
    //}
  //);

  //clientPgRead.query(sql, function(err, result) {
    //var out = false;
    //if( !err && result && result.rows instanceof Array ){
      //out = result.rows[0].valid === true;
    //}
    //onValidated(out);
  //});
//}


//exports.validateUserToken = function(req, res, next){

  //var id = req.body.idUser;
  //var token  = req.body.token;

  //validateUserToken(id,token,function(valid){

    //if(valid){
      //next();
    //}else{
      //res.status(401).send("Unable to authenticate user " + id + ".");
    //}
  //});
//};


