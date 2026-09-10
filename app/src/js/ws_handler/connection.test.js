import { afterEach, expect, it, vi } from "vitest";
import { EventEmitter } from "node:events";
import { WsHandler } from "./ws_handler.js";
const ws = new WsHandler({ handlers: {} });

afterEach(() => vi.useRealTimers());
it("waits for connect and removes its listeners", async () => {
  const socket = new EventEmitter();
  const done = vi.fn();
  const result = ws.waitForConnection(socket).then(done);
  await Promise.resolve();
  expect(done).not.toHaveBeenCalled();
  socket.emit("connect");
  await result;
  expect(socket.eventNames()).toEqual([]);
});
it("accepts an already connected socket", async () => {
  await expect(
    ws.waitForConnection({ connected: true }),
  ).resolves.toBeUndefined();
});
it.each(["connect_error", "disconnect", "timeout"])(
  "cleans up after %s",
  async (type) => {
    vi.useFakeTimers();
    const socket = new EventEmitter();
    const result = ws.waitForConnection(socket);
    const rejected = expect(result).rejects.toBeInstanceOf(Error);
    if (type === "timeout") {
      await vi.advanceTimersByTimeAsync(30000);
    } else {
      socket.emit(type, new Error("failed"));
    }
    await rejected;
    expect(socket.eventNames()).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  },
);
