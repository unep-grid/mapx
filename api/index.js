import { settings } from "#root/settings";
import http from "http";
import express from "express";
import { Server as SocketServer } from "socket.io";
import query from "#mapx/query";
import * as project from "#mapx/project";
import mirror from "#mapx/mirror";
import { mwSendMail } from "#mapx/mail";
import ip from "#mapx/ip";
import tile from "#mapx/tile";
import log from "#mapx/log";
import * as upload from "#mapx/upload";
import * as view from "#mapx/view";
import * as source from "#mapx/source";
import { mwHealth } from "#mapx/health";
import { mwGemetSearchText, mwGemetSearchConcept } from "#mapx/gemet";
import { mwGetSearchKey } from "#mapx/search";
import { mwGetBbox } from "#mapx/bbox";
import { mwGetFormatsList } from "#mapx/file_formats";
import { mwGetEpsgCodesFull } from "#mapx/epsg";
import { ioMwAuthenticate } from "#mapx/authentication";
import { ioUpdateGeoserver } from "#mapx/geoserver";
import { ioEcho } from "#mapx/io";
import { ioTestSum, ioTestEcho } from "#mapx/io";
import { ioUploadSource } from "#mapx/upload";
import { ioIssueReport } from "#mapx/issue_reporter";
import {
  mwSetHeaders,
  mwGetConfigMap,
  mwGetConfigGeoServer,
} from "#mapx/helpers";
import {
  ioViewPin,
  ioViewSourceMetaGet,
  ioViewMetaGet,
  ioViewStatsGet,
} from "#mapx/view";
import {
  ioDownloadSource,
  ioEditSource,
  ioSourceList,
  ioSourceListColumns,
  ioSourceJoin,
  ioSourceServices,
  ioSourceMetadata,
  ioSourceAttributesAlias,
} from "#mapx/source";
import { ioProjectNameValidate, ioProjectCreate } from "#mapx/project";
import { ioKeywordsSearch } from "#mapx/keywords";
import {
  ioCreateAdapter,
  ioConnect,
  ioMwEmit,
  ioMwNotify,
  mwEmit,
  mwNotify,
  use,
} from "#mapx/io";

import events from "events";
events.EventEmitter.defaultMaxListeners = 100;

/**
 * If port argument is set, use this instead
 * e.g. node inspect index.js port=3333
 * will replace the port by 3333
 */
let { port = 3030 } = settings.api;

for (const val of process.argv) {
  const v = val.split("=");
  if (v[0] === "port") {
    [, port] = v;
  }
}

/**
 * Express
 */
const app = express();
const server = http.createServer(app);
const mwDownload = express.static(settings.vector.path.download);
const mwUserData = express.static(settings.image.path.permanent);
app.use(mwSetHeaders);
app.use(mwEmit);
app.use(mwNotify);
app.set("trust proxy", true);
app.use("/download", mwDownload);
app.use("/userdata", mwUserData);

/**
 * Socket io
 */
const io = new SocketServer(server, settings.socket_io);
const ioRedisAdapter = ioCreateAdapter();
io.adapter(ioRedisAdapter);
io.use(ioMwAuthenticate); // Add socket.session
io.use(ioMwEmit); // Add emit wrapper
io.use(ioMwNotify); // Add notify system
io.on("connection", ioConnect); // emit 'authentication', with roles

/**
 * Socket io routes / event id
 * -> some event are handled in modules, ex. ioEditSource
 * -> "use()" wrapper = convert (request,cb) to (socket,request,cb)
 */
io.use((socket, next) => {
  socket.on("/client/geoserver/update", use(ioUpdateGeoserver));
  socket.on("/client/source/download", use(ioDownloadSource));
  socket.on("/client/source/upload", use(ioUploadSource));
  socket.on("/client/source/edit/table", use(ioEditSource));
  socket.on("/client/source/get/list", use(ioSourceList));
  socket.on("/client/source/get/list/columns", use(ioSourceListColumns));
  socket.on("/client/source/get/services", use(ioSourceServices));
  socket.on("/client/source/get/metadata", use(ioSourceMetadata));
  socket.on("/client/source/join", use(ioSourceJoin));
  socket.on("/client/view/pin", use(ioViewPin));
  socket.on("/client/view/source/get/metadata", use(ioViewSourceMetaGet));
  socket.on("/client/view/get/metadata", use(ioViewMetaGet));
  socket.on("/client/view/get/stats", use(ioViewStatsGet));
  socket.on("/client/project/validate/name", use(ioProjectNameValidate));
  socket.on("/client/project/create", use(ioProjectCreate));
  socket.on("/client/issue/report", use(ioIssueReport));
  socket.on(
    "/client/source/get/attributes/alias",
    use(ioSourceAttributesAlias)
  );
  socket.on("/client/metadata/keywords/search", use(ioKeywordsSearch));

  // tests
  socket.on("echo", use(ioEcho));
  socket.on("/client/test/sum", use(ioTestSum));
  socket.on("/client/test/echo", use(ioTestEcho));
  next();
});

/*
 * Express routes
 */
app.get("/health", mwHealth);
app.get("/get/view/item/:id", view.mwGet);
app.get("/get/views/list/project/", view.mwGetListByProject);
app.get("/get/views/list/global/public/", view.mwGetListPublic);
app.get("/get/tile/:x/:y/:z.:ext", tile.mwGet);
app.get("/get/query/", query.mwGet);
app.get("/get/sql/", query.mwGet);
app.get("/get/mirror/", mirror.mwGet);

app.get("/get/config/map", mwGetConfigMap);
app.get("/get/config/geoserver", mwGetConfigGeoServer);
app.get("/get/epsg/codes/full", mwGetEpsgCodesFull);
app.get("/get/file/formats/list", mwGetFormatsList);
app.get("/get/source/summary/", source.mwGetSummary);
app.get("/get/source/table/attribute/", source.mwGetAttributeTable);
app.get("/get/source/overlap/", source.mwGetOverlap); //countries=[]&layers=[]&='area';
app.get("/get/source/validate/geom", source.mwGetGeomValidate);
app.get("/get/sources/list/user", source.mwGetSourcesList);
app.get("/get/ip", ip.mwGet);
app.get("/get/search/key", mwGetSearchKey);
app.get("/get/gemet/search", mwGemetSearchText);
app.get("/get/gemet/concept", mwGemetSearchConcept);
app.get("/get/bbox/", mwGetBbox);
app.get("/get/projects/list/user/", project.mwGetListByUser);
app.get("/get/project/search", project.mwProjectSearchText);

app.post("/upload/image/", upload.mwImage);
app.post("/send/mail/", mwSendMail);
app.post("/collect/logs/", log.mwCollect);

server.listen(port);
console.log("listen to " + port);
