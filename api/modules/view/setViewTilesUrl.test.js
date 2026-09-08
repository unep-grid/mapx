import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn() }));

vi.mock("#mapx/db", () => ({ pgWrite: { query: mocks.query } }));
vi.mock("#mapx/template", () => ({
  templates: { setViewTilesUrl: "UPDATE mx_views SET tiles url" },
}));

import { setViewTilesUrl } from "./setViewTilesUrl.js";
import { templates } from "#mapx/template";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.query.mockResolvedValue({});
});

describe("setViewTilesUrl", () => {
  it("runs the setViewTilesUrl template with idView, url, idProject", async () => {
    const result = await setViewTilesUrl(
      "MX-AAAAA-AAAAA-AAAAA",
      "https://a/{z}/{x}/{y}.png",
      "P1",
    );
    expect(result).toBe(true);
    expect(mocks.query).toHaveBeenCalledWith(templates.setViewTilesUrl, [
      "MX-AAAAA-AAAAA-AAAAA",
      "https://a/{z}/{x}/{y}.png",
      "P1",
    ]);
  });

  it("uses a supplied client instead of pgWrite when given one", async () => {
    const client = { query: vi.fn().mockResolvedValue({}) };
    await setViewTilesUrl(
      "MX-AAAAA-AAAAA-AAAAA",
      "https://a/x.png",
      "P1",
      client,
    );
    expect(client.query).toHaveBeenCalledTimes(1);
    expect(mocks.query).not.toHaveBeenCalled();
  });
});
