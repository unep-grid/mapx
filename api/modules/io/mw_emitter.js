import { toRes, asyncDelay } from "#mapx/helpers";

export { ioMwEmit, mwEmit };

/**
 * mx_emit : similar interface from res and socket
 */
function ioMwEmit(socket, next) {
  /**
   * Generic to emit
   */
  socket.mx_emit = async (type, msg) => {
    try {
      socket.emit(type, msg);
      // async delay to match http version...
      await asyncDelay(1);
      return true;
    } catch (e) {
      console.warn("Error in mx_emit (ws) :", e);
      return false;
    }
  };

  next();
}

function mwEmit(req, res, next) {
  /**
   * Partial write e.g. "{message:'xy'}\r\n" and wait for data to be sent
   * see http https://nodejs.org/api/http.html#responsewritechunk-encoding-callback
   */
  res.mx_emit = async (_, msg) => {
    return new Promise((resolve) => {
      try {
        req.write(toRes(msg), "utf8", () => {
          resolve(true);
        });
      } catch (e) {
        console.warn("Error in mx_emit (http):", e);
        resolve(false);
      }
    });
  };

  next();
}
