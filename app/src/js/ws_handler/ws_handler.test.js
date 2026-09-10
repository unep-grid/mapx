import { beforeEach, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";
import { WsHandler } from "./ws_handler.js";
const sockets = vi.hoisted(() => []);
vi.mock("socket.io-client", () => ({
  Manager: class {
    socket(_namespace, { auth }) {
      const socket = new EventEmitter();
      socket.auth = auth;
      socket.disconnect = vi.fn(() => {
        socket.connected = false;
        socket.emit("disconnect");
      });
      sockets.push(socket);
      return socket;
    }
  },
}));
vi.mock("../settings", () => ({ settings: { maxTimeFetchQuick: 1000 } }));
beforeEach(() => {
  sockets.length = 0;
});
const flush = async () => {
  for (let i = 0; i < 8; i++) {
    await Promise.resolve();
  }
};
it("replaces the previous session and waits for connection using fresh project auth", async () => {
  let idProject = "A";
  const ws = new WsHandler({ auth: () => ({ idProject }), handlers: {} });
  await ws.connect();
  sockets[0].connected = true;
  idProject = "B";
  const done = vi.fn();
  const result = ws.connect({ waitForConnection: true }).then(done);
  await flush();
  expect(sockets[0].disconnect).toHaveBeenCalledOnce();
  expect(sockets[1].auth.idProject).toBe("B");
  expect(done).not.toHaveBeenCalled();
  sockets[1].connected = true;
  sockets[1].emit("connect");
  await result;
  expect(done).toHaveBeenCalledOnce();
  ws.destroy();
});
it("disposes a refused connection and propagates the error", async () => {
  const ws = new WsHandler({ handlers: {} });
  const result = ws.connect({ waitForConnection: true });
  const rejected = expect(result).rejects.toThrow("refused");
  await flush();
  sockets[0].emit("connect_error", new Error("refused"));
  await rejected;
  expect(sockets[0].disconnect).toHaveBeenCalledOnce();
  expect(ws.socket).toBeUndefined();
});
