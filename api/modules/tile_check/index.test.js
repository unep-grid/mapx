import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock("#mapx/db", () => ({
  pgRead: { query: mocks.query },
  pgWrite: { query: mocks.query },
}));
// node-fetch is mocked here (application-level correctness/ordering tests
// only), so request-filtering-agent's connection-level filtering never
// actually engages — that's covered end-to-end, unmocked, in
// fetch_check.ssrf.test.js.
vi.mock("node-fetch", () => ({ default: mocks.fetch }));

import { runChecks, checkAllTiles, checkRasterUrls } from "./index.js";

// Uint8Array.from(...) allocates its own exactly-sized ArrayBuffer, unlike
// Buffer.from(...) which may return a view into a larger pooled buffer.
const PNG_BUFFER = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]).buffer;

function fakeResponse() {
  return {
    ok: true,
    status: 200,
    headers: { get: (name) => (name === "content-type" ? "image/png" : null) },
    body: {
      [Symbol.asyncIterator]: async function* () {
        yield Buffer.from(PNG_BUFFER);
      },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.query.mockResolvedValue({ rows: [] });
  mocks.fetch.mockResolvedValue(fakeResponse());
});

describe("runChecks", () => {
  it("calls onStart before onDone for each view, in order", async () => {
    const views = [
      { id: "MX-AAAAA-AAAAA-AAAAA", project: "P1", tile_url: "https://a/{z}/{x}/{y}.png" },
      { id: "MX-BBBBB-BBBBB-BBBBB", project: "P1", tile_url: "https://b/{z}/{x}/{y}.png" },
    ];
    const events = [];

    await runChecks(views, {
      onStart: (view) => events.push(`start:${view.id}`),
      onDone: (row) => events.push(`done:${row.id_view}`),
    });

    expect(events).toEqual([
      "start:MX-AAAAA-AAAAA-AAAAA",
      "start:MX-BBBBB-BBBBB-BBBBB",
      "done:MX-AAAAA-AAAAA-AAAAA",
      "done:MX-BBBBB-BBBBB-BBBBB",
    ]);
  });

  it("stores a row via pgWrite for each view", async () => {
    const views = [
      { id: "MX-AAAAA-AAAAA-AAAAA", project: "P1", tile_url: "https://a/{z}/{x}/{y}.png" },
    ];
    await runChecks(views);
    expect(mocks.query).toHaveBeenCalledTimes(1);
    const [sql, params] = mocks.query.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO mx_views_tiles_check/);
    expect(params[0]).toBe("MX-AAAAA-AAAAA-AAAAA");
  });

  it("runs without callbacks (daily routine path)", async () => {
    const views = [
      { id: "MX-AAAAA-AAAAA-AAAAA", project: "P1", tile_url: "https://a/{z}/{x}/{y}.png" },
    ];
    await expect(runChecks(views)).resolves.toHaveLength(1);
  });

  it("checks the configured legend alongside the tile URL", async () => {
    const result = await checkRasterUrls({
      tile_url: "https://a/{z}/{x}/{y}.png",
      legend_url: "https://a/legend.svg",
    });
    expect(result.valid).toBe(true);
    expect(result.tile_valid).toBe(true);
    expect(result.legend_valid).toBe(true);
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });

  it("does not fail a view when the legend is not configured", async () => {
    const result = await checkRasterUrls({
      tile_url: "https://a/{z}/{x}/{y}.png",
    });
    expect(result.valid).toBe(true);
    expect(result.legend_configured).toBe(false);
    expect(result.legend_valid).toBeNull();
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
});

describe("checkAllTiles", () => {
  it("queries all rt views and checks them", async () => {
    mocks.query.mockResolvedValueOnce({
      rows: [
        {
          id: "MX-AAAAA-AAAAA-AAAAA",
          project: "P1",
          tile_url: "https://a/{z}/{x}/{y}.png",
          bounds: null,
        },
      ],
    });
    const results = await checkAllTiles();
    expect(results).toHaveLength(1);
    expect(results[0].valid).toBe(true);
  });

  it("reports the planned total before checking views", async () => {
    mocks.query.mockResolvedValueOnce({
      rows: [
        {
          id: "MX-AAAAA-AAAAA-AAAAA",
          project: "P1",
          tile_url: "https://a/{z}/{x}/{y}.png",
          bounds: null,
        },
      ],
    });
    const onPlan = vi.fn();
    const onDone = vi.fn();

    await checkAllTiles({ onPlan, onDone });

    expect(onPlan).toHaveBeenCalledWith({ total: 1 });
    expect(onPlan.mock.invocationCallOrder[0]).toBeLessThan(
      onDone.mock.invocationCallOrder[0],
    );
  });
});
