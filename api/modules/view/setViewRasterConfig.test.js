import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock("#mapx/db", () => ({ pgWrite: { query: mocks.query } }));
vi.mock("#mapx/template", () => ({
  templates: { setViewRasterConfig: "UPDATE mx_views raster config" },
}));

import { setViewRasterConfig } from "./setViewRasterConfig.js";
import { templates } from "#mapx/template";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.query.mockResolvedValue({});
});

describe("setViewRasterConfig", () => {
  it("updates all raster source values scoped to the project", async () => {
    await setViewRasterConfig(
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
  });
});
