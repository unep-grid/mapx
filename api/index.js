const settings = require.main.require('./settings');
const express = require('express');
const app = express();
const utils = require('./utils');
let port = settings.api.port || 3030;

/**
 * If port argument is set, use this instead
 * e.g. node inspect index.js port=3333
 * will replace the port by 3333
 */
process.argv.forEach(function(val) {
  val = val.split('=');
  if (val[0] === 'port') {
    port = val[1];
  }
});

/**
 * Options
 */
app.set('trust proxy', true); // see https://expressjs.com/en/guide/behind-proxies.html
app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Expose-Headers', 'Content-Length');
  res.header('Access-Control-Expose-Headers', 'Mapx-Content-Length');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  next();
});
app.use('/download', express.static(settings.vector.path.download));

/*
 * Define routes for get method
 */
app.get('/get/view/item/:id', utils.view.get);
app.get('/get/view/metadata/:id', utils.viewMetadata.get);
app.get('/get/views/list/project/', utils.views.get);
app.get('/get/views/list/global/public/', utils.viewsPublic.get);
app.get('/get/tile/:x/:y/:z.:ext', utils.view.getTile);
app.get('/get/query/', utils.query.get);
app.get('/get/sql/', utils.query.get);
app.get('/get/mirror/', utils.mirror.get);
app.get('/get/config/map', utils.config.map.get);
app.get('/get/source/', utils.source.get);
app.get('/get/source/metadata/:id', utils.sourceMetadata.get);
app.get('/get/source/stat/:idSource/:idAttr?', utils.sourceStat.get);
app.get('/get/source/table/attribute/', utils.sourceTableAttribute.get);
app.get('/get/source/overlap/', utils.sourceOverlap.get); //countries=[]&layers=[]&='area';
app.get('/get/source/validate/geom', utils.sourceValidityGeom.get);
app.get('/get/ip', utils.ip.get);
app.post('/upload/image/', utils.image.upload);
app.post('/upload/vector/', utils.vector.upload);
app.post('/send/mail/', utils.mail.sendMailApi);
app.post('/collect/logs/', utils.logs.collect);
app.get('/get/projects/list/user/', utils.projects.getByUser);

/**
 * Start
 */
console.log('listen to ' + port);
app.listen(port);

module.exports = app;
