import { ioUpdateGeoserver } from "#mapx/geoserver";
import { ioDownloadSource, ioEditSource, ioSourceListEdit } from "#mapx/source";
import { ioEcho } from "./mw_echo.js";
import { ioGetTestJobSum, ioGetTestJobEcho } from "./test_job.js";

const routes = {
  "/client/geoserver/update": ioUpdateGeoserver,
  "/client/source/download": ioDownloadSource,
  "/client/test/get/job/sum": ioGetTestJobSum,
  "/client/test/get/job/echo": ioGetTestJobEcho,
  "/client/source/edit/table": ioEditSource,
  "/client/source/get/list/edit": ioSourceListEdit,
  echo: ioEcho,
};

export function ioMwRoutes(socket, next) {
  for (const route in routes) {
    socket.on(route, (request) => {
      routes[route](socket, request);
    });
  }
  next();
}
