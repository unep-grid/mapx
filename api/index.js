import {settings}  from '#root/settings' ;
import http  from 'http' ;
import express  from 'express' ;
import {Server as SocketServer}  from 'socket.io' ;
import view  from '#mapx/view' ;
import query  from '#mapx/query' ;
import source  from '#mapx/source' ;
import project  from '#mapx/project' ;
import upload  from '#mapx/upload' ;
import mirror  from '#mapx/mirror' ;
import mail  from '#mapx/mail' ;
import ip from '#mapx/ip' ;
import tile  from '#mapx/tile' ;
import log  from '#mapx/log' ;
import {mwSetHeaders, mwGetConfigMap}  from '#mapx/helpers' ;
import {mwIoConnect}  from '#mapx/io' ;
import {mwNotify}  from '#mapx/notify' ;
import {mwGemetSearchText, mwGemetSearchConcept}  from '#mapx/gemet' ;
import {mwGetSearchKey}  from '#mapx/search' ;
import {mwGetBbox}  from '#mapx/bbox' ;


/**
 * If port argument is set, use this instead
 * e.g. node inspect index.js port=3333
 * will replace the port by 3333
 */
let {
 port = 3030
} = settings.api;

for (const val of process.argv) {
  const v = val.split('=');
  if (v[0] === 'port') {
    [, port] = v;
  }
}

/**
 * Init
 */
const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, settings.socket_io);
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
app.get('/get/ip', ip.mwGet);
app.get('/get/search/key', mwGetSearchKey);
app.get('/get/gemet/search', mwGemetSearchText);
app.get('/get/gemet/concept', mwGemetSearchConcept);
app.get('/get/bbox/',mwGetBbox);
app.get('/get/projects/list/user/', project.mwGetListByUser);
app.get('/get/project/search',project.mwProjectSearchText);

app.post('/upload/image/', upload.mwImage);
app.post('/upload/vector/', upload.mwVector);
app.post('/send/mail/', mail.mwSend);
app.post('/collect/logs/', log.mwCollect);

server.listen(port);
console.log('listen to ' + port);
