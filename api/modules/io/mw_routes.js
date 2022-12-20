import { ioUpdateGeoserver } from "#mapx/geoserver";
import { ioEcho } from "./mw_echo.js";
import { ioGetTestJobSum, ioGetTestJobEcho } from "./test_job.js";
import { ioUploadSource } from "#mapx/upload";
import { ioDownloadSource, ioEditSource, ioSourceListEdit } from "#mapx/source";

const routes = {
  "/client/geoserver/update": ioUpdateGeoserver,
  "/client/source/download": ioDownloadSource,
  "/client/source/upload": ioUploadSource,
  "/client/test/get/job/sum": ioGetTestJobSum,
  "/client/test/get/job/echo": ioGetTestJobEcho,
  "/client/source/edit/table": ioEditSource,
  "/client/source/get/list/edit": ioSourceListEdit,
  echo: ioEcho,
};

export function ioMwRoutes(socket, next) {
  for (const route in routes) {
    socket.on(route, (request, callback) => {
      routes[route](socket, request, callback);
    });
  }
  next();
}
