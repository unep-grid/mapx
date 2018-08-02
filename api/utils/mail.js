var nodemailer = require('nodemailer');
var settings = require.main.require("./settings");
var bodyParser = require('body-parser');
var auth = require("./authentification.js");
var key =  settings.db.crypto.key;
var mailAdmin = settings.mail.config.admin;
var clientPgRead = require.main.require("./db").pgRead;

module.exports.sendMailApi = [
  bodyParser.urlencoded({ extended: false }),
  bodyParser.json(),
  sendMailApi
];

module.exports.sendMail = sendMail;

/**
* helpers
*
*/

function sendMailApi(req,res){

  var dat = req.body;
  /*
   * Decrypt the message
   */
  var sql = 'SELECT mx_decrypt(\'' + dat.msg + '\',\'' + key + '\') msg';
  clientPgRead.query(sql, function(err, result) {
    /**
     * Set the config object
     */
    var issues = "";
    var idKeys = ["from","validUntil","subject","to","text","html"];
    var conf = {};
    if( !err && result && result.rows instanceof Array ){
      conf = JSON.parse(result.rows[0].msg);
    }else{
      issues = err ;
    }
    /**
     * Test
     */
    Object.keys(conf).forEach(function(k){
      if( idKeys.indexOf(k) == -1 ){
        issues = issues + " key " + k + " not valid; ";
      }
    });

    if(!issues){
      var d = new Date();
      var dNow = new Date(d.getFullYear() + "-" + (d.getMonth()+1) + "-" + (d.getDate()));
      var dValid = new Date(conf.validUntil);
      var dateIsValid = dNow && dValid && dValid > dNow;
      if( !dateIsValid ){
        issues = issues + " invalide date";
      }
    }

    if(issues){
      res.status(500).send(issues);
    }else{
      /**
       * Send mail
       */
      sendMail({
        subject : conf.subject,
        to : conf.to || mailAdmin,
        text : conf.text,
        html : conf.html
      }).then(function(msg){
        res.send(msg);
      }).catch(function(er){
        console.error(er);
        res.status(500).send(er);
      });
    }
  });

}

/**
* Send a mail, use default from settings if needed
* @param {Object} opt options
* @param {String} opt.to Recipient message email
* @param {String} opt.text Email body text version
* @param {String} opt.html Email body html version
* @param {String} opt.subject Subject
*/
function  sendMail(opt){


  return new Promise(function(resolve,reject){
    
    var transporter = nodemailer.createTransport(settings.mail.config);
    var def = settings.mail.options;
    var options = {};
    var msg = "";
    options.subject = opt.subject || def.subject ;
    options.text = opt.text || def.text;
    options.html = opt.html || null;
    options.to = opt.to || def.from;
    options.from = opt.from || def.from;


    transporter.sendMail(options, function(error, info){

      if(error){
        reject(error);
      }else{
        resolve(info);
      }

    });
  });

}



