import { describe, expect, it, vi } from "vitest";
import { FrameWorker } from "./frameWorker.js";

function createWorker(resolvers) {
  const worker = Object.create(FrameWorker.prototype);
  worker.opt = { resolvers };
  worker.postResponse = vi.fn();
  worker._post = vi.fn();
  return worker;
}

function request(idResolver, value) {
  return {
    data: JSON.stringify({
      idRequest: 4,
      idResolver,
      value,
    }),
  };
}

describe("FrameWorker request contract", () => {
  it("returns an awaited resolver result", async () => {
    const worker = createWorker({
      echo: vi.fn(async (value) => ({ ...value, done: true })),
    });

    await worker.handleMessageManager(request("echo", { value: 7 }));

    expect(worker.opt.resolvers.echo).toHaveBeenCalledWith({ value: 7 });
    expect(worker.postResponse).toHaveBeenCalledWith({
      idRequest: 4,
      value: { value: 7, done: true },
      success: true,
    });
  });

  it("returns a structured error for an unknown resolver", async () => {
    const worker = createWorker({});

    await worker.handleMessageManager(request("missing"));

    expect(worker.postResponse).toHaveBeenCalledWith({
      idRequest: 4,
      success: false,
      error: expect.objectContaining({
        code: "err_resolver_not_found",
        idRequest: 4,
        idResolver: "missing",
      }),
    });
    expect(worker._post).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "message",
        key: "err_resolver_not_found",
      }),
    );
  });

  it("returns a structured error when a resolver rejects", async () => {
    const worker = createWorker({
      explode: vi.fn(async () => {
        throw new Error("boom");
      }),
    });

    await worker.handleMessageManager(request("explode"));

    expect(worker.postResponse).toHaveBeenCalledWith({
      idRequest: 4,
      success: false,
      error: expect.objectContaining({
        code: "err_resolver_failed",
        message: expect.stringContaining("boom"),
        idRequest: 4,
        idResolver: "explode",
        detail: {
          name: "Error",
          message: "boom",
        },
      }),
    });
    expect(worker._post).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "message",
        key: "err_resolver_failed",
      }),
    );
  });
});
