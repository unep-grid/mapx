import { afterEach, describe, expect, it, vi } from "vitest";
import { FrameManager } from "./frameManager.js";
import { Manager } from "./index.js";
import { MapxSdkError } from "./sdk_error.js";

const managers = [];

function createManager(options = {}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const manager = new FrameManager({
    container,
    url: "https://mapx.example.test",
    ...options,
  });
  managers.push(manager);
  return manager;
}

function sendWorkerMessage(manager, message) {
  manager._handleMessageWorker({
    data: JSON.stringify({
      sdkToken: manager._sdkToken,
      ...message,
    }),
  });
}

afterEach(() => {
  for (const manager of managers.splice(0)) {
    if (!manager._destroyed) {
      manager.destroy();
    }
  }
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("FrameManager request contract", () => {
  it("applies the default timeout through the public Manager", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const manager = new Manager({
      container,
      url: "https://mapx.example.test",
    });
    managers.push(manager);

    expect(manager.opt.requestTimeoutMs).toBe(120000);
  });

  it("resolves a request and removes it from the pending queue", async () => {
    const manager = createManager();
    const post = vi.spyOn(manager, "_post");
    const response = manager.ask("echo", { value: 7 });
    const request = post.mock.calls[0][0];

    expect(request).toMatchObject({
      idRequest: 0,
      idResolver: "echo",
      value: { value: 7 },
    });
    expect(manager._req).toHaveLength(1);

    sendWorkerMessage(manager, {
      type: "response",
      idRequest: request.idRequest,
      success: true,
      value: "done",
    });

    await expect(response).resolves.toBe("done");
    expect(manager._req).toHaveLength(0);
  });

  it("rejects a failed resolver with a structured error", async () => {
    const manager = createManager();
    vi.spyOn(manager, "_post");
    const response = manager.ask("explode");

    sendWorkerMessage(manager, {
      type: "response",
      idRequest: 0,
      success: false,
      error: {
        code: "err_resolver_failed",
        message: "Resolver exploded",
        idResolver: "explode",
        detail: { reason: "test" },
      },
    });

    await expect(response).rejects.toMatchObject({
      name: "MapxSdkError",
      code: "err_resolver_failed",
      message: "Resolver exploded",
      idRequest: 0,
      idResolver: "explode",
      detail: { reason: "test" },
    });
    expect(manager._req).toHaveLength(0);
  });

  it("ignores responses carrying another SDK token", async () => {
    const manager = createManager();
    const response = manager.ask("echo");

    manager._handleMessageWorker({
      data: JSON.stringify({
        sdkToken: "another-manager",
        type: "response",
        idRequest: 0,
        success: true,
        value: "wrong",
      }),
    });
    expect(manager._req).toHaveLength(1);

    sendWorkerMessage(manager, {
      type: "response",
      idRequest: 0,
      success: true,
      value: "right",
    });
    await expect(response).resolves.toBe("right");
  });

  it("forwards worker events", () => {
    const manager = createManager();
    const listener = vi.fn();
    manager.on("view_added", listener);

    sendWorkerMessage(manager, {
      type: "event",
      value: {
        type: "view_added",
        data: { idView: "MX-TEST" },
      },
    });

    expect(listener).toHaveBeenCalledWith({ idView: "MX-TEST" });
  });

  it("rejects and does not post requests above the concurrency limit", async () => {
    const manager = createManager({ maxSimultaneousRequest: 1 });
    const post = vi.spyOn(manager, "_post");
    const first = manager.ask("first");
    const second = manager.ask("second");

    await expect(second).rejects.toMatchObject({
      code: "too_many_requests",
      idResolver: "second",
    });
    expect(post).toHaveBeenCalledOnce();
    expect(manager._req).toHaveLength(1);

    sendWorkerMessage(manager, {
      type: "response",
      idRequest: 0,
      success: true,
      value: true,
    });
    await expect(first).resolves.toBe(true);
  });

  it("rejects and removes requests that time out", async () => {
    vi.useFakeTimers();
    const manager = createManager({ requestTimeoutMs: 25 });
    const response = manager.ask("slow");
    const rejection = expect(response).rejects.toMatchObject({
      code: "request_timeout",
      idResolver: "slow",
    });

    await vi.advanceTimersByTimeAsync(25);

    await rejection;
    expect(manager._req).toHaveLength(0);
  });

  it("allows request timeouts to be disabled", async () => {
    vi.useFakeTimers();
    const manager = createManager({ requestTimeoutMs: 0 });
    const response = manager.ask("slow");

    await vi.advanceTimersByTimeAsync(120000);
    expect(manager._req).toHaveLength(1);

    sendWorkerMessage(manager, {
      type: "response",
      idRequest: 0,
      success: true,
      value: "done",
    });
    await expect(response).resolves.toBe("done");
  });

  it("rejects pending and future requests after destruction", async () => {
    const manager = createManager();
    const pending = manager.ask("pending");

    manager.destroy();

    await expect(pending).rejects.toMatchObject({
      code: "manager_destroyed",
      idResolver: "pending",
    });
    await expect(manager.ask("future")).rejects.toBeInstanceOf(MapxSdkError);
    expect(manager._req).toHaveLength(0);
  });
});
