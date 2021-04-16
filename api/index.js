/**
 * Import modules
 */

/**
 * Set local module path
 * ( to avoid require.main.require or ../../mess)
 */
const moduleAlias = require('module-alias');
moduleAlias.addAliases({
  '@mapx': __dirname + '/modules/',
  '@root': __dirname
});

const http = require('http');
const express = require('express');
const sock = require('socket.io');
const settings = require('@root/settings');
const view = require('@mapx/view');
const query = require('@mapx/query');
const source = require('@mapx/source');
const project = require('@mapx/project');
const upload = require('@mapx/upload');
const mirror = require('@mapx/mirror');
const mail = require('@mapx/mail');
const ip = require('@mapx/ip');
const tile = require('@mapx/tile');
const log = require('@mapx/log');
const {mwSetHeaders, mwGetConfigMap} = require('@mapx/helpers');
const {mwIoConnect} = require('@mapx/io');
const {mwNotify} = require('@mapx/notify');

/**
 * If port argument is set, use this instead
 * e.g. node inspect index.js port=3333
 * will replace the port by 3333
 */
let port = settings.api.port || 3030;
process.argv.forEach((val) => {
  val = val.split('=');
  if (val[0] === 'port') {
    port = val[1];
  }
});

/**
 * Init
 */
const app = express();
const server = http.createServer(app);
const io = sock(server, settings.socket_io);
app.use(mwSetHeaders);
app.set('trust proxy', true);
app.use('/download', express.static(settings.vector.path.download));

/**
 * Notification sytem with ws OR http write
 */
//app.use(mwNotify(io));

/**
 * IO routes
 */
io.on('connection', mwIoConnect(io));

/*
 * Express routes
 */
app.get('/get/view/item/:id', view.mwGet);
app.get('/get/view/metadata/:id', view.mwGetMetadata);
app.get('/get/views/list/project/', view.mwGetListByProject);
app.get('/get/views/list/global/public/', view.mwGetListPublic);
app.get('/get/tile/:x/:y/:z.:ext', tile.mwGet);
app.get('/get/query/', query.mwGet);
app.get('/get/sql/', query.mwGet);
app.get('/get/mirror/', mirror.mwGet);

app.get('/get/config/map', mwGetConfigMap);
app.get('/get/source/', [mwNotify(io), ...source.mwGet]);
app.get('/get/source/metadata/:id', source.mwGetMetadata);
app.get('/get/source/summary/', source.mwGetSummary);
app.get('/get/source/table/attribute/', source.mwGetAttributeTable);
app.get('/get/source/overlap/', source.mwGetOverlap); //countries=[]&layers=[]&='area';
app.get('/get/source/validate/geom', source.mwGetGeomValidate);
app.get('/get/projects/list/user/', project.mwGetListByUser);
app.get('/get/ip', ip.mwGet);

app.post('/upload/image/', upload.mwImage);
app.post('/upload/vector/', upload.mwVector);
app.post('/send/mail/', mail.mwSend);
app.post('/collect/logs/', log.mwCollect);

server.listen(port);
console.log('listen to ' + port);
