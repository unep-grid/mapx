import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUserRoles: vi.fn(),
}));

vi.mock("#mapx/db", () => ({
  pgRead: { query: vi.fn() },
}));

vi.mock("#mapx/authentication", () => ({
  getUserRoles: mocks.getUserRoles,
  validateRoleHandlerFor: vi.fn(() => (_req, _res, next) => next()),
  validateTokenHandler: vi.fn(),
}));
import {
  searchSources,
  sourceBrowserInternals,
  validateSourceSelection,
} from "./browser.js";

const rows = [
  {
    id: "mx_vector_a_b_c_d_e",
    title: "Road network",
    type: "vector",
    editor_email: "alice@example.org",
    access: "editable",
    tags: ["transport"],
    geometry_types: ["line"],
    date_uploaded: "2024-01-01",
    date_modified: "2026-01-01",
  },
  {
    id: "mx_vector_f_g_h_i_j",
    title: "Population",
    type: "vector",
    editor_email: "zoe@example.org",
    access: "readable",
    tags: ["population"],
    geometry_types: ["polygon"],
    date_uploaded: "2025-01-01",
    date_modified: "2025-02-01",
  },
  {
    id: "mx_join_k_l_m_n_o",
    title: "Road statistics",
    type: "join",
    editor_email: "bob@example.org",
    access: "global",
    tags: ["transport"],
    geometry_types: ["line"],
    date_uploaded: "2026-01-01",
    date_modified: "2026-02-01",
  },
];

describe("source browser filtering", () => {
  it("normalizes bounded page requests and ignores unsupported source kinds", () => {
    const request = sourceBrowserInternals.normalizeRequest({
      acceptedTypes: ["vector", "executable"],
      limit: 5000,
      offset: 51.8,
      includeFacets: true,
    });
    expect(request.types).toEqual(["vector"]);
    expect(request.limit).toBe(50);
    expect(request.offset).toBe(51);
    expect(request.includeFacets).toBe(false);
    expect(request.selectedIds).toEqual([]);
  });

  it("accepts metadata-only external catalog entries", () => {
    const request = sourceBrowserInternals.normalizeRequest({
      acceptedTypes: ["external"],
      requiredCapabilities: [],
    });
    expect(request.types).toEqual(["external"]);
  });

  it("forces exact-selection hydration to its first page without facets", () => {
    const request = sourceBrowserInternals.normalizeRequest({
      selectedIds: ["mx_vector_f_g_h_i_j"],
      offset: 100,
      includeFacets: true,
    });

    expect(request.selectedIds).toEqual(["mx_vector_f_g_h_i_j"]);
    expect(request.exactSelection).toBe(true);
    expect(request.offset).toBe(0);
    expect(request.includeFacets).toBe(false);
  });

  it("normalizes invalid offsets and exclusion IDs", () => {
    const request = sourceBrowserInternals.normalizeRequest({
      offset: -2,
      excludeIds: ["mx_vector_a_b_c_d_e", "not-a-source"],
    });

    expect(request.offset).toBe(0);
    expect(request.excludeIds).toEqual(["mx_vector_a_b_c_d_e"]);
  });

  it("filters, stably orders, counts, and pages compact rows in SQL", () => {
    const sql = sourceBrowserInternals.sourceBrowserSql;
    expect(sql).toContain("ILIKE '%' || $7 || '%'");
    expect(sql).toContain("geometry_types ?| $11::text[]");
    expect(sql).toContain("tags ?& $12::text[]");
    expect(sql).toContain("is_current DESC");
    expect(sql).toContain("id ASC");
    expect(sql).toContain("LIMIT $15");
    expect(sql).toContain("OFFSET $16");
    expect(sql).toContain("(SELECT count(*)::integer FROM filtered)");
    expect(sql).toContain("WHEN $17::boolean");
  });

  it("limits editable global sources to the current project", () => {
    const sql = sourceBrowserInternals.sourceBrowserSql;
    const editableCase = sql.indexOf("CASE WHEN s.project = $1");
    const globalCase = sql.indexOf("WHEN s.global THEN 'global'");

    expect(editableCase).toBeGreaterThan(-1);
    expect(globalCase).toBeGreaterThan(editableCase);
    expect(sql.slice(editableCase, globalCase)).toContain(
      "s.editor = $2::integer",
    );
  });

  it("reads approximate dimensions from PostgreSQL catalogs", () => {
    const sql = sourceBrowserInternals.sourceBrowserSql;
    expect(sql).toContain("c.reltuples");
    expect(sql).toContain("AS column_count");
    expect(sql).toContain("postgis_typmod_type");
    expect(sql).not.toContain("mx_source_preview");
  });

  it("returns a normalized intermediate page from the SQL result", async () => {
    const client = {
      query: vi.fn().mockResolvedValue({
        rows: [
          {
            items: rows.slice(0, 2),
            total: 125,
            facets: {},
          },
        ],
      }),
    };
    const socket = {
      session: {
        user_authenticated: true,
        user_roles: { publisher: true, group: [] },
        project_id: "MX-AAA-BBB-CCC-DDD-EEE",
        user_id: 7,
      },
    };

    const result = await searchSources(
      socket,
      {
        acceptedTypes: ["vector", "join"],
        offset: 50,
        limit: 2,
        includeFacets: false,
      },
      client,
    );

    expect(result).toEqual({
      items: rows.slice(0, 2),
      total: 125,
      facets: {},
      offset: 50,
      limit: 2,
      hasMore: true,
    });
    expect(client.query.mock.calls[0][1]).toEqual(
      expect.arrayContaining([50, false]),
    );
  });

  it.each([
    {
      name: "final",
      row: { items: rows.slice(0, 2), total: 52, facets: {} },
      request: { offset: 50, limit: 2 },
      total: 52,
    },
    {
      name: "empty",
      row: { items: [], total: 0, facets: { tags: [] } },
      request: { offset: 0, limit: 50 },
      total: 0,
    },
  ])("marks a $name page as complete", async ({ row, request, total }) => {
    const client = {
      query: vi.fn().mockResolvedValue({ rows: [row] }),
    };
    const socket = {
      session: {
        user_authenticated: true,
        user_roles: { publisher: true, group: [] },
        project_id: "MX-AAA-BBB-CCC-DDD-EEE",
        user_id: 7,
      },
    };

    await expect(searchSources(socket, request, client)).resolves.toEqual(
      expect.objectContaining({
        total,
        hasMore: false,
      }),
    );
  });

  it("enforces the normalized geometry capability", () => {
    expect(
      sourceBrowserInternals.normalizeRequest({
        acceptedTypes: ["vector", "tabular"],
        requiredCapabilities: ["geometry", "unsupported"],
      }).requiredCapabilities,
    ).toEqual(["geometry"]);
    expect(
      sourceBrowserInternals.normalizeRequest({
        requiredCapabilities: ["geometry", "unsupported"],
      }).requiredCapabilities,
    ).toEqual(["geometry"]);
  });

  it("validates every selected id with API-side project roles", async () => {
    mocks.getUserRoles.mockResolvedValue({ group: ["publishers"] });
    const client = {
      query: vi.fn().mockResolvedValue({
        rows: [{ id: "mx_vector_a_b_c_d_e" }],
      }),
    };
    await expect(
      validateSourceSelection(
        {
          idUser: 7,
          idProject: "MX-AAA-BBB-CCC-DDD-EEE",
          idSources: ["mx_vector_a_b_c_d_e", "mx_vector_f_g_h_i_j"],
          idView: "MX-AAA-BBB-CCC-DDD-FFF",
        },
        client,
      ),
    ).resolves.toEqual({
      valid: false,
      ids: ["mx_vector_a_b_c_d_e"],
    });
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining("mx_views_latest"),
      expect.arrayContaining([7, ["publishers"]]),
    );
  });

  it("accepts a source returned through an editor ACL", async () => {
    mocks.getUserRoles.mockResolvedValue({ group: [] });
    const client = {
      query: vi.fn().mockResolvedValue({
        rows: [{ id: "mx_vector_a_b_c_d_e" }],
      }),
    };

    await expect(
      validateSourceSelection(
        {
          idUser: 7,
          idProject: "MX-AAA-BBB-CCC-DDD-EEE",
          idSources: ["mx_vector_a_b_c_d_e"],
          idView: "MX-AAA-BBB-CCC-DDD-FFF",
        },
        client,
      ),
    ).resolves.toEqual({
      valid: true,
      ids: ["mx_vector_a_b_c_d_e"],
    });

    const [sql] = client.query.mock.calls[0];
    expect(sql).toContain("editor = $3::integer");
    expect(sql).toContain("editors ? $3::text");
  });

  it.each([
    [["mx_vector_a_b_c_d_e", "not-a-source"]],
    [["mx_vector_a_b_c_d_e", "mx_vector_a_b_c_d_e"]],
    [
      Array.from(
        { length: 21 },
        (_, index) => `mx_vector_a_b_c_d_${String(index).padStart(2, "0")}`,
      ),
    ],
  ])("rejects malformed, duplicate, or excessive selections", async (ids) => {
    mocks.getUserRoles.mockClear();
    const client = { query: vi.fn() };

    await expect(
      validateSourceSelection(
        {
          idUser: 7,
          idProject: "MX-AAA-BBB-CCC-DDD-EEE",
          idSources: ids,
          idView: "MX-AAA-BBB-CCC-DDD-FFF",
        },
        client,
      ),
    ).resolves.toEqual({ valid: false, ids: [] });

    expect(mocks.getUserRoles).not.toHaveBeenCalled();
    expect(client.query).not.toHaveBeenCalled();
  });
});
