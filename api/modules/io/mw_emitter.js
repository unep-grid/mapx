import { sendJSON, asyncDelay } from "#mapx/helpers";

export { ioMwEmit, mwEmit };

/**
 * mx_emit : similar interface from res and socket
 */
function ioMwEmit(socket, next) {
  if (!socket.emit) {
    console.warn("registering socket emitter : no socket");
    return;
  }
  /**
   * Generic to emit
   */
  socket.mx_emit_ws = async (type, msg) => {
    return emitSocket(socket, type, msg);
  };

  next();
}

function mwEmit(_, res, next) {
  if (!res?.write) {
    console.warn("registering http emitter : no res write");
    return;
  }
  /**
   * Partial write e.g. "{message:'xy'}\r\n" and wait for data to be sent
   * see http https://nodejs.org/api/http.html#responsewritechunk-encoding-callback
   */
  res.mx_emit_http = async (_, msg) => {
    return emitHttp(res, msg);
  };

  next();
}

function emitHttp(res, msg) {
  return new Promise((resolve) => {
    try {
      console.log("emit http", msg);
      sendJSON(res, msg, {
        toRes: true,
        end: false,
        write_cb: () => {
          resolve(true);
        },
      });
    } catch (e) {
      console.warn("Error in mx_emit (http):", e);
      resolve(false);
    }
  });
}

async function emitSocket(socket, type, msg) {
  try {
    console.log("emit ws", type, msg);
    socket.emit(type, msg);
    // async delay to match http version...
    await asyncDelay(1);
    return true;
  } catch (e) {
    console.trace("Error in mx_emit (ws) :", e);
    return false;
  }
}
