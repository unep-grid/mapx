import { ioUpdateGeoserver } from "#mapx/geoserver";
import { ioDownloadSource } from "#mapx/source";
import { ioEcho } from "./mw_echo.js";
import { ioGetTestJobSum, ioGetTestJobEcho } from "./test_job.js";

const handlers = {
  "/ws/update/geoserver": ioUpdateGeoserver,
  "/ws/download/source": ioDownloadSource,
  "/ws/get/test/job/sum": ioGetTestJobSum,
  "/ws/get/test/job/echo": ioGetTestJobEcho,
  "echo": ioEcho 
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
