import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getMap: vi.fn(),
  getView: vi.fn(),
}));

vi.mock("../../../map_helpers/index.js", () => ({
  getMap: mocks.getMap,
  getView: mocks.getView,
  getViewRandom: vi.fn(),
  getViewJson: vi.fn(),
}));

vi.mock("../../../map_helpers/view_filters.js", () => ({
  viewFilterToolsInit: vi.fn(),
}));

import { ResolversBase } from "./base.js";

function createMap() {
  const listeners = new Map();
  return {
    stop: vi.fn(),
    once: vi.fn((type, cb) => listeners.set(type, cb)),
    off: vi.fn((type, cb) => {
      if (listeners.get(type) === cb) {
        listeners.delete(type);
      }
    }),
    emit(type) {
      const cb = listeners.get(type);
      listeners.delete(type);
      cb?.();
    },
    listeners,
  };
}

describe("ResolversBase map move promise", () => {
  let map;
  let rslv;

  beforeEach(() => {
    vi.useFakeTimers();
    map = createMap();
    mocks.getMap.mockReturnValue(map);
    rslv = new ResolversBase();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("waits for a move longer than the former fixed 10 s limit", async () => {
    const opt = { duration: 12000 };
    let settled = false;
    const done = rslv
      ._map_resolve_when("moveend", vi.fn(), opt)
      .finally(() => (settled = true));

    await vi.advanceTimersByTimeAsync(12000);
    expect(settled).toBe(false);

    map.emit("moveend");
    await expect(done).resolves.toBe(opt);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rejects after the duration plus margin and removes its listener", async () => {
    const done = rslv._map_resolve_when("moveend", vi.fn(), {
      duration: 1000,
    });
    const rejection = expect(done).rejects.toThrow("moveend");

    await vi.advanceTimersByTimeAsync(5999);
    expect(map.listeners.has("moveend")).toBe(true);

    await vi.advanceTimersByTimeAsync(1);
    await rejection;
    expect(map.listeners.has("moveend")).toBe(false);
  });

  it("resolves a synchronous move triggered by the callback", async () => {
    const opt = { zoom: 3 };
    const done = rslv._map_resolve_when(
      "moveend",
      () => map.emit("moveend"),
      opt,
    );

    await expect(done).resolves.toBe(opt);
    expect(map.stop).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("ResolversBase errors", () => {
  it("fails the request with the error key", () => {
    const rslv = new ResolversBase();

    expect(() => rslv._err("err_view_invalid", { idView: "MX-X" })).toThrow(
      expect.objectContaining({
        level: "error",
        key: "err_view_invalid",
        vars: { idView: "MX-X" },
      }),
    );
  });

  it("can report an error without failing the request", () => {
    const rslv = new ResolversBase();
    const postMessage = vi.fn();
    rslv._bind({ postMessage });

    rslv._post_error("err_tool_roles_not_match", { idTool: "t" });

    expect(postMessage).toHaveBeenCalledWith({
      level: "error",
      key: "err_tool_roles_not_match",
      vars: { idTool: "t" },
    });
  });
});

describe("ResolversBase view style attribute", () => {
  const rslv = new ResolversBase();

  beforeEach(() => {
    mocks.getView.mockReturnValue({
      data: { attribute: { name: "cfr_label" } },
    });
  });

  it("accepts an empty or the styled attribute", () => {
    expect(rslv._is_view_style_attribute({ idView: "MX-TEST" })).toBe(true);
    expect(
      rslv._is_view_style_attribute({
        idView: "MX-TEST",
        attribute: "cfr_label",
      }),
    ).toBe(true);
  });

  it("rejects another attribute", () => {
    expect(
      rslv._is_view_style_attribute({ idView: "MX-TEST", attribute: "other" }),
    ).toBe(false);
  });
});
