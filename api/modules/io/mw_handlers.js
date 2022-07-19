import { ioUpdateGeoserver } from "#mapx/geoserver";
import { ioDownloadSource, ioEditSource } from "#mapx/source";
import { ioEcho } from "./mw_echo.js";
import { ioGetTestJobSum, ioGetTestJobEcho } from "./test_job.js";

const handlers = {
  "/client/geoserver/update": ioUpdateGeoserver,
  "/client/source/download": ioDownloadSource,
  "/client/test/get/job/sum": ioGetTestJobSum,
  "/client/test/get/job/echo": ioGetTestJobEcho,
  "/client/edit_table/start": ioEditSource,
  echo: ioEcho,
};

export { ioMwHandlers };

function ioMwHandlers(socket, next) {
  for (const h in handlers) {
    socket.on(h, (request) => {
      console.log(h, "received");
      handlers[h](socket, request);
    });
  }
  next();
}
