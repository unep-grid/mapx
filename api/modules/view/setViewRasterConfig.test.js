import { describe, expect, it, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";

const mocks = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock("#mapx/db", () => ({ pgWrite: { query: mocks.query } }));
vi.mock("#mapx/template", () => ({
  templates: { setViewRasterConfig: "UPDATE mx_views raster config" },
}));

import { setViewRasterConfig } from "./setViewRasterConfig.js";
import { templates } from "#mapx/template";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.query.mockResolvedValue({
    rows: [{
      id: "MX-AAAAA-AAAAA-AAAAA",
      project: "P1",
      tile_url: "https://a/{z}/{x}/{y}.png",
      legend_url: "https://a/legend.svg",
      bounds: null,
    }],
  });
});

describe("setViewRasterConfig", () => {
  it("updates all raster source values scoped to the project", async () => {
    const stored = await setViewRasterConfig(
      "MX-AAAAA-AAAAA-AAAAA",
      {
        tiles: "https://a/{z}/{x}/{y}.png",
        legend: "https://a/legend.svg",
        tileSize: 256,
        useMirror: true,
      },
      "P1",
    );

    expect(mocks.query).toHaveBeenCalledWith(templates.setViewRasterConfig, [
      "MX-AAAAA-AAAAA-AAAAA",
      "https://a/{z}/{x}/{y}.png",
      "https://a/legend.svg",
      256,
      true,
      "P1",
    ]);
    expect(stored).toEqual(expect.objectContaining({
      tile_url: "https://a/{z}/{x}/{y}.png",
      legend_url: "https://a/legend.svg",
    }));
  });

  it("returns null when the scoped view was not updated", async () => {
    mocks.query.mockResolvedValueOnce({ rows: [] });

    const stored = await setViewRasterConfig(
      "MX-AAAAA-AAAAA-AAAAA",
      { tiles: "https://a/{z}/{x}/{y}.png", legend: null },
      "P1",
    );

    expect(stored).toBeNull();
  });

  it("stores an empty legend without nullifying the complete view data", () => {
    const sql = readFileSync(
      new URL("../template/sql/setViewRasterConfig.sql", import.meta.url),
      "utf8",
    );

    expect(sql).toContain("jsonb_build_object(");
    expect(sql).toContain("'legend', $3::text");
    expect(sql).not.toContain("to_jsonb($3::text)");
    expect(sql).toContain("RETURNING");
  });
});
