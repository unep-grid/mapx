import { sendJSON, asyncDelay } from "#mapx/helpers";
import { settings } from "#root/settings";

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
   * Generic emit
   */
  socket.mx_emit_ws = async (type, msg) => {
    return emitSocket(socket, type, msg);
  };

  /**
   * Broadcast
   */
  socket.mx_emit_ws_broadcast = async (type, msg) => {
    return emitSocketBroadcast(socket, type, msg);
  };

  /**
   * Broadcast
   */
  socket.mx_emit_ws_global = async (type, msg) => {
    return emitGlobal(socket, type, msg);
  };

  /**
   * Emit and expect response
   */
  socket.mx_emit_ws_response = async (type, msg, timeout) => {
    return emitSocketResponse(socket, type, msg, timeout);
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
    socket.emit(type, msg);
    // async delay to match http version...
    await asyncDelay(1);
    return true;
  } catch (e) {
    console.trace("Error in mx_emit_ws (ws) :", e);
    return false;
  }
}

async function emitSocketBroadcast(socket, type, msg) {
  try {
    socket.broadcast.emit(type, msg);
    // async delay to match http version...
    await asyncDelay(1);
    return true;
  } catch (e) {
    console.trace("Error in mx_emit_ws_broadcast (ws) :", e);
    return false;
  }
}

async function emitGlobal(socket, type, msg) {
  try {
    socket.broadcast.emit(type, msg);
    socket.emit(type, msg);
    // async delay to match http version...
    await asyncDelay(1);
    return true;
  } catch (e) {
    console.trace("Error in mx_emit_ws_global (ws) :", e);
    return false;
  }
}

async function emitSocketResponse(socket, type, data, timeout) {
  return new Promise((resolve, reject) => {
    const maxTime = timeout || settings.socket_io.emitTimeout;
    if (maxTime > 0) {
      setTimeout(() => {
        return reject(`emitSocketReponse timeout ${maxTime} on ${type}`);
      }, maxTime);
    }
    socket.emit(type, data, (response) => {
      return resolve(response);
    });
  });
}
