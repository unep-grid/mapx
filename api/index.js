import { settings } from "#root/settings";
import http from "http";
import express from "express";
import { Server as SocketServer } from "socket.io";
import query from "#mapx/query";
import project from "#mapx/project";
import upload from "#mapx/upload";
import mirror from "#mapx/mirror";
import mail from "#mapx/mail";
import ip from "#mapx/ip";
import tile from "#mapx/tile";
import log from "#mapx/log";
import * as view from "#mapx/view";
import * as source from "#mapx/source";
//import { mwGeoserverRebuild } from "#mapx/geoserver";
import { mwSetHeaders, mwGetConfigMap } from "#mapx/helpers";
import { mwGemetSearchText, mwGemetSearchConcept } from "#mapx/gemet";
import { mwGetSearchKey } from "#mapx/search";
import { mwGetBbox } from "#mapx/bbox";
import { mwGetFormatsList } from "#mapx/file_formats";
import { mwGetEpsgCodesFull } from "#mapx/epsg";
import { ioMwAuthenticate } from "#mapx/authentication";
import {
  ioCreateAdapter,
  ioConnect,
  ioMwEmit,
  ioMwNotify,
  ioMwHandlers,
  mwEmit,
  mwNotify,
} from "#mapx/io";

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
app.use(mwSetHeaders);
app.use(mwEmit);
app.use(mwNotify);
app.set("trust proxy", true);
app.use("/download", mwDownload);

/**
 * Socket io
 */
const io = new SocketServer(server, settings.socket_io);
const ioRedisAdapter = ioCreateAdapter();
io.adapter(ioRedisAdapter);
io.use(ioMwAuthenticate);
io.use(ioMwEmit);
io.use(ioMwNotify);
io.use(ioMwHandlers);
io.on("connection", ioConnect);

/*
 * Express routes
 */
app.get("/get/view/item/:id", view.mwGet);
app.get("/get/view/metadata/:id", view.mwGetMetadata);
app.get("/get/views/list/project/", view.mwGetListByProject);
app.get("/get/views/list/global/public/", view.mwGetListPublic);
app.get("/get/tile/:x/:y/:z.:ext", tile.mwGet);
app.get("/get/query/", query.mwGet);
app.get("/get/sql/", query.mwGet);
app.get("/get/mirror/", mirror.mwGet);

app.get("/get/config/map", mwGetConfigMap);
app.get("/get/epsg/codes/full", mwGetEpsgCodesFull);
app.get("/get/file/formats/list", mwGetFormatsList);
//app.get("/get/source/", source.mwGet);
app.get("/get/source/metadata/:id", source.mwGetMetadata);
app.get("/get/source/summary/", source.mwGetSummary);
app.get("/get/source/table/attribute/", source.mwGetAttributeTable);
app.get("/get/source/overlap/", source.mwGetOverlap); //countries=[]&layers=[]&='area';
app.get("/get/source/validate/geom", source.mwGetGeomValidate);
app.get("/get/ip", ip.mwGet);
app.get("/get/search/key", mwGetSearchKey);
app.get("/get/gemet/search", mwGemetSearchText);
app.get("/get/gemet/concept", mwGemetSearchConcept);
app.get("/get/bbox/", mwGetBbox);
app.get("/get/projects/list/user/", project.mwGetListByUser);
app.get("/get/project/search", project.mwProjectSearchText);
//app.get("/get/io/test/job", mwIoFetchTest);
//app.get("/get/geoserver/rebuild", mwGeoserverRebuild);

app.post("/upload/image/", upload.mwImage);
app.post("/upload/vector/", upload.mwVector);
app.post("/send/mail/", mail.mwSend);
app.post("/collect/logs/", log.mwCollect);

server.listen(port);
console.log("listen to " + port);
