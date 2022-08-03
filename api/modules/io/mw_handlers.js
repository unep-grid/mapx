import { ioUpdateGeoserver } from "#mapx/geoserver";
import { ioDownloadSource, ioEditSource, ioSourceListEdit } from "#mapx/source";
import { ioEcho } from "./mw_echo.js";
import { ioGetTestJobSum, ioGetTestJobEcho } from "./test_job.js";

const handlers = {
  "/client/geoserver/update": ioUpdateGeoserver,
  "/client/source/download": ioDownloadSource,
  "/client/test/get/job/sum": ioGetTestJobSum,
  "/client/test/get/job/echo": ioGetTestJobEcho,
  "/client/source/edit/table": ioEditSource,
  "/client/source/get/list/edit": ioSourceListEdit,
  echo: ioEcho,
};

export { ioMwHandlers };

function ioMwHandlers(socket, next) {
  for (const h in handlers) {
    socket.on(h, (request) => {
      handlers[h](socket, request);
    });
  }
  next();
}
