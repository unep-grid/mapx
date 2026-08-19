import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  fetch: vi.fn(),
  setViewTilesUrl: vi.fn(),
  setViewRasterConfig: vi.fn(),
}));

vi.mock("#mapx/db", () => ({
  pgRead: { query: mocks.query },
  pgWrite: { query: mocks.query },
}));
// #mapx/view is the full view-module barrel (metadata, source permissions,
// etc.) and pulls in settings/filesystem setup that isn't available in this
// test environment; mock the single export this module actually uses.
vi.mock("#mapx/view", () => ({
  setViewTilesUrl: mocks.setViewTilesUrl,
  setViewRasterConfig: mocks.setViewRasterConfig,
}));
vi.mock("#mapx/authentication", () => ({
  isAdmin: (socket) =>
    socket?.session?.user_authenticated === true &&
      socket?.session?.user_roles?.admin === true,
  isPublisher: (socket) =>
    socket?.session?.user_authenticated === true &&
    socket?.session?.user_roles?.publisher === true,
}));
vi.mock("node-fetch", () => ({ default: mocks.fetch }));

import {
  ioViewTilesUrlTest,
  ioViewTilesUrlSave,
  ioViewRasterConfigTest,
  ioViewRasterConfigSave,
} from "./tiles_check.js";

function fakeResponse() {
  return {
    ok: true,
    status: 200,
    headers: { get: (name) => (name === "content-type" ? "image/png" : null) },
    body: {
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from(
          Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        );
      },
    },
  };
}

function fakeSocket(overrides = {}) {
  return {
    session: {
      user_authenticated: true,
      user_roles: { admin: true },
      project_id: "P1",
      ...overrides,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.query.mockResolvedValue({ rows: [] });
  mocks.fetch.mockResolvedValue(fakeResponse());
});

describe("ioViewTilesUrlTest", () => {
  it("rejects non-admin callers", async () => {
    const data = { url: "https://a/{z}/{x}/{y}.png" };
    await new Promise((resolve) =>
      ioViewTilesUrlTest(
        fakeSocket({ user_roles: { admin: false } }),
        data,
        resolve,
      ),
    );
    expect(data.error).toBeTruthy();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it("tests a URL without touching the database", async () => {
    const data = { url: "https://a/{z}/{x}/{y}.png" };
    await new Promise((resolve) =>
      ioViewTilesUrlTest(fakeSocket(), data, resolve),
    );
    expect(data.success).toBe(true);
    expect(data.result.valid).toBe(true);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("reports no_tile_template for an empty URL", async () => {
    const data = { url: "" };
    await new Promise((resolve) =>
      ioViewTilesUrlTest(fakeSocket(), data, resolve),
    );
    expect(data.result).toEqual({
      valid: false,
      detail: "no_tile_template",
      tested_url: null,
    });
  });
});

describe("ioViewTilesUrlSave", () => {
  it("rejects non-admin callers", async () => {
    const data = { idView: "MX-AAAAA-AAAAA-AAAAA", url: "https://a/{z}/{x}/{y}.png" };
    await new Promise((resolve) =>
      ioViewTilesUrlSave(
        fakeSocket({ user_roles: { admin: false } }),
        data,
        resolve,
      ),
    );
    expect(data.error).toBeTruthy();
    expect(mocks.setViewTilesUrl).not.toHaveBeenCalled();
  });

  it("writes the URL scoped to the caller's session project, ignoring any client-supplied project", async () => {
    const data = {
      idView: "MX-AAAAA-AAAAA-AAAAA",
      url: "https://a/{z}/{x}/{y}.png",
      idProject: "P-spoofed",
    };
    await new Promise((resolve) =>
      ioViewTilesUrlSave(fakeSocket({ project_id: "P1" }), data, resolve),
    );
    expect(mocks.setViewTilesUrl).toHaveBeenCalledWith(
      "MX-AAAAA-AAAAA-AAAAA",
      "https://a/{z}/{x}/{y}.png",
      "P1",
    );
  });

  it("saves then immediately re-checks the new URL, returning the fresh row", async () => {
    const data = { idView: "MX-AAAAA-AAAAA-AAAAA", url: "https://a/{z}/{x}/{y}.png" };
    await new Promise((resolve) =>
      ioViewTilesUrlSave(fakeSocket(), data, resolve),
    );
    expect(data.success).toBe(true);
    expect(data.row.id_view).toBe("MX-AAAAA-AAAAA-AAAAA");
    expect(data.row.valid).toBe(true);
    const insertCall = mocks.query.mock.calls.find(([sql]) =>
      /INSERT INTO mx_views_tiles_check/.test(sql),
    );
    expect(insertCall).toBeTruthy();
  });

  it("rejects an invalid idView without writing", async () => {
    const data = { idView: "not-a-view-id", url: "https://a/{z}/{x}/{y}.png" };
    await new Promise((resolve) =>
      ioViewTilesUrlSave(fakeSocket(), data, resolve),
    );
    expect(data.error).toBeTruthy();
    expect(mocks.setViewTilesUrl).not.toHaveBeenCalled();
  });
});

describe("raster URL configuration", () => {
  it("tests tile and legend URLs for a publisher without writing", async () => {
    const data = {
      idView: "MX-AAAAA-AAAAA-AAAAA",
      tiles: "https://a/{z}/{x}/{y}.png",
      legend: "https://a/legend.png",
    };
    mocks.query.mockResolvedValueOnce({ rowCount: 1, rows: [] });
    await new Promise((resolve) =>
      ioViewRasterConfigTest(
        fakeSocket({ user_roles: { publisher: true } }),
        data,
        resolve,
      ),
    );
    expect(data.success).toBe(true);
    expect(data.result.tile_valid).toBe(true);
    expect(data.result.legend_valid).toBe(true);
    expect(mocks.query).toHaveBeenCalledTimes(1);
  });

  it("saves the complete raster config and rechecks it", async () => {
    mocks.query.mockResolvedValueOnce({
      rows: [{
        id: "MX-AAAAA-AAAAA-AAAAA",
        project: "P1",
        tile_url: "https://old/{z}/{x}/{y}.png",
        legend_url: "https://old/legend.png",
        bounds: null,
      }],
    });
    const data = {
      idView: "MX-AAAAA-AAAAA-AAAAA",
      config: {
        tiles: "https://a/{z}/{x}/{y}.png",
        legend: "https://a/legend.png",
        tileSize: 256,
        useMirror: true,
      },
    };
    await new Promise((resolve) =>
      ioViewRasterConfigSave(
        fakeSocket({ user_roles: { publisher: true } }),
        data,
        resolve,
      ),
    );
    expect(data.success).toBe(true);
    expect(mocks.setViewRasterConfig).toHaveBeenCalledWith(
      data.idView,
      data.config,
      "P1",
    );
    expect(data.row.valid).toBe(true);
  });

  it("rejects unsupported raster options before writing", async () => {
    const data = {
      idView: "MX-AAAAA-AAAAA-AAAAA",
      config: {
        tiles: "https://a/{z}/{x}/{y}.png",
        tileSize: 1024,
        useMirror: "false",
      },
    };
    await new Promise((resolve) =>
      ioViewRasterConfigSave(
        fakeSocket({ user_roles: { publisher: true } }),
        data,
        resolve,
      ),
    );
    expect(data.error).toBe("invalid_params");
    expect(mocks.setViewRasterConfig).not.toHaveBeenCalled();
  });
});
