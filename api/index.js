const settings = require.main.require("./settings");
const express = require("express");
const app = express();
const appDev = express();
const utils = require('./utils');
const pg = require("./db").pgRead;

let port = 3030;
process.argv.forEach(function (val, index, array) {
  val = val.split("=");
  if(val[0]=='port'){
    port = val[1];
  }
});
//const port = 3333;

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

/* static */
app.use('/download', express.static(settings.vector.path.download));

/* Define route for get method */
app.get('/get/view/:id', utils.view.get);
app.get('/get/tile/:x/:y/:z.:ext', utils.view.getTile);
app.get('/get/query/', utils.query.get );
app.get('/get/mirror/', utils.mirror.get );
app.get('/get/source/', utils.source.get);
app.get('/get/source/metadata/:id', utils.sourceMetadata.get);
app.get('/get/source/overlap/',utils.sourceOverlap.get);//countries=[]&layers=[]&='area';
app.get('/get/ip',utils.ip.get);

app.post('/upload/image/', utils.image.upload);  
app.post('/upload/vector/', utils.vector.upload);  
app.post('/send/mail/', utils.mail.sendMailApi);

console.log("listen to " + port);
app.listen(port);




