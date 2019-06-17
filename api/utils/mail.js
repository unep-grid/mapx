var nodemailer = require('nodemailer');
var settings = require.main.require("./settings");
var bodyParser = require('body-parser');
//var auth = require("./authentification.js");
var mailAdmin = settings.mail.config.admin;
var decrypt = require("./db.js").decrypt;
var htmlToText = require("html-to-text");

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
  decrypt(dat.msg)
    .then( conf => {
      /**
       * Set the config object
       */
      var issues = "";
      var idKeys = ["from","validUntil","subject","to","text","html"];
      var str = "";
      /**
       * Test
       */
      Object.keys(conf).forEach(function(k){
        if( idKeys.indexOf(k) === -1 ){
          issues = issues + " key " + k + " not valid; ";
        }else{
          str = conf[k];
          if(typeof str !== "string"){
            conf[k] = null;
          }
        }
      });


      if(!conf.text && conf.html){
         conf.text =  htmlToText.fromString(conf.html);
      }

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
        throw new Error(issues);
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
          res.status(500).send(er);
        });
      }
    }).catch(function(err){
      res.status(403).send("Bad request " + err);
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



