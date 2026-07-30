import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSourceLastTimestamp: vi.fn(),
  redisGet: vi.fn(),
  redisSet: vi.fn(),
  sourceIsAccessible: vi.fn(),
}));

vi.mock("#mapx/db", () => ({
  pgRead: { query: vi.fn() },
  redisGet: mocks.redisGet,
  redisSet: mocks.redisSet,
}));

vi.mock("#mapx/db_utils", () => ({
  getSourceLastTimestamp: mocks.getSourceLastTimestamp,
}));

vi.mock("#mapx/helpers", () => ({
  parseTemplate: (template, data) =>
    template.replace(/{{([^{}]+)}}/g, (_match, key) => data[key]),
}));

vi.mock("#mapx/template", () => ({
  templates: {
    getSvgSourcePreview:
      "SELECT ST_EstimatedExtent('{{layer_name}}'), ST_SnapToGrid(geom), ST_PointOnSurface(geom) FROM {{layer}} source",
  },
}));

vi.mock("./browser.js", () => ({
  sourceIsAccessible: mocks.sourceIsAccessible,
}));

import {
  generateSourcePreview,
  getSourcePreview,
  sourcePreviewInternals,
} from "./preview.js";

const idSource = "mx_vector_a_b_c_d_e";
const preview = {
  kind: "vector",
  width: 64,
  height: 36,
  bbox: [-180, -90, 180, 90],
  geometryTypes: ["polygon"],
  layers: [
    {
      kind: "path",
      geometryType: "polygon",
      d: "M0 0L10 -10Z",
    },
  ],
};

describe("on-demand source preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sourceIsAccessible.mockResolvedValue(true);
    mocks.getSourceLastTimestamp.mockResolvedValue(
      "2026-07-30T10:00:00.000Z",
    );
    mocks.redisGet.mockResolvedValue(null);
    mocks.redisSet.mockResolvedValue("OK");
  });

  it("keeps one fixed, bounded contract without algorithm versioning", () => {
    expect(sourcePreviewInternals.PREVIEW_WIDTH).toBe(64);
    expect(sourcePreviewInternals.PREVIEW_HEIGHT).toBe(36);
    expect(sourcePreviewInternals.BIN_SIZE).toBe(3);
    expect(sourcePreviewInternals.MAX_PAYLOAD_BYTES).toBe(24_000);
    expect(sourcePreviewInternals).not.toHaveProperty("ALGORITHM_VERSION");
  });

  it("builds deterministic full-coverage SQL without table sampling", async () => {
    const client = {
      query: vi.fn().mockResolvedValue({ rows: [{ preview }] }),
    };

    await expect(generateSourcePreview(idSource, client)).resolves.toEqual(
      preview,
    );

    const sql = client.query.mock.calls[0][0];
    expect(sql).toContain(`FROM "${idSource}" source`);
    expect(sql).toContain("ST_EstimatedExtent");
    expect(sql).toContain("ST_SnapToGrid");
    expect(sql).toContain("ST_PointOnSurface");
    expect(sql).not.toContain("TABLESAMPLE");
  });

  it("rejects a result that exceeds the socket payload budget", async () => {
    const client = {
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            preview: {
              ...preview,
              layers: [{ ...preview.layers[0], d: "M".repeat(25_000) }],
            },
          },
        ],
      }),
    };

    await expect(generateSourcePreview(idSource, client)).resolves.toBeNull();
  });

  it("authorizes before returning a cached preview", async () => {
    mocks.redisGet.mockResolvedValue(JSON.stringify(preview));
    const client = {
      query: vi.fn().mockResolvedValue({ rows: [{ type: "vector" }] }),
    };

    await expect(
      getSourcePreview({}, idSource, null, { client }),
    ).resolves.toEqual(preview);

    expect(mocks.sourceIsAccessible).toHaveBeenCalledWith(
      {},
      idSource,
      client,
      null,
    );
    expect(client.query).toHaveBeenCalledTimes(1);
    expect(mocks.redisSet).not.toHaveBeenCalled();
  });

  it("uses the source timestamp as the Redis cache identity", async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ type: "vector" }] })
        .mockResolvedValueOnce({ rows: [{ preview }] }),
    };

    await expect(
      getSourcePreview({}, idSource, null, { client }),
    ).resolves.toEqual(preview);

    const expectedKey = sourcePreviewInternals.cacheKey(
      idSource,
      "2026-07-30T10:00:00.000Z",
    );
    expect(mocks.redisGet).toHaveBeenCalledWith(expectedKey);
    expect(mocks.redisSet).toHaveBeenCalledWith(
      expectedKey,
      JSON.stringify(preview),
    );
  });

  it("returns a neutral preview for joins without resolving their base", async () => {
    const client = {
      query: vi.fn().mockResolvedValue({ rows: [{ type: "join" }] }),
    };

    await expect(
      getSourcePreview({}, "mx_join_k_l_m_n_o", null, { client }),
    ).resolves.toBeNull();

    expect(mocks.getSourceLastTimestamp).not.toHaveBeenCalled();
    expect(mocks.redisGet).not.toHaveBeenCalled();
  });

  it("rejects inaccessible sources before source or cache lookup", async () => {
    mocks.sourceIsAccessible.mockResolvedValue(false);
    const client = { query: vi.fn() };

    await expect(
      getSourcePreview({}, idSource, null, { client }),
    ).rejects.toThrow("source_preview_access_denied");

    expect(client.query).not.toHaveBeenCalled();
    expect(mocks.redisGet).not.toHaveBeenCalled();
  });
});
