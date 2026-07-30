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
  filterAndSortSources,
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
  it("combines search and facets and returns bounded compact rows", () => {
    const result = filterAndSortSources(rows, {
      query: "road",
      acceptedTypes: ["vector", "join"],
      geometryTypes: ["line"],
      tags: ["transport"],
      limit: 1,
    });
    expect(result.total).toBe(2);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe("Road network");
    expect(result.items[0]).not.toHaveProperty("abstract");
  });

  it("sorts by latest editor email without a special me label", () => {
    const result = filterAndSortSources(rows, {
      acceptedTypes: ["vector", "join"],
      sort: "editor",
    });
    expect(result.items.map((item) => item.editor_email)).toEqual([
      "alice@example.org",
      "bob@example.org",
      "zoe@example.org",
    ]);
  });

  it("keeps an editable view's current source in the bounded result", () => {
    const result = filterAndSortSources(
      rows.map((row, index) => ({ ...row, is_current: index === 2 })),
      {
        acceptedTypes: ["vector", "join"],
        sort: "title",
        limit: 1,
      },
    );
    expect(result.items[0].id).toBe("mx_join_k_l_m_n_o");
  });

  it("resolves only explicitly selected source IDs for field hydration", () => {
    const result = filterAndSortSources(rows, {
      acceptedTypes: ["vector", "join"],
      selectedIds: ["mx_vector_f_g_h_i_j"],
    });

    expect(result.items.map((item) => item.id)).toEqual([
      "mx_vector_f_g_h_i_j",
    ]);
    expect(result.total).toBe(1);
  });

  it("returns no hydration rows when selected IDs are malformed", () => {
    const result = filterAndSortSources(rows, {
      acceptedTypes: ["vector", "join"],
      selectedIds: ["not-a-source"],
    });

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("caps request limits and ignores unsupported source kinds", () => {
    const request = sourceBrowserInternals.normalizeRequest({
      acceptedTypes: ["vector", "executable"],
      limit: 5000,
    });
    expect(request.types).toEqual(["vector"]);
    expect(request.limit).toBe(50);
    expect(request.selectedIds).toEqual([]);
  });

  it("reads approximate dimensions from PostgreSQL catalogs", () => {
    expect(sourceBrowserInternals.sourceBrowserSql).toContain("c.reltuples");
    expect(sourceBrowserInternals.sourceBrowserSql).toContain(
      "AS column_count",
    );
    expect(sourceBrowserInternals.sourceBrowserSql).not.toContain(
      "SELECT count(*) FROM",
    );
    expect(sourceBrowserInternals.sourceBrowserSql).toContain(
      "postgis_typmod_type",
    );
    expect(sourceBrowserInternals.sourceBrowserSql).not.toContain(
      "mx_source_preview",
    );
  });

  it("does not turn a normal search into empty exact-selection hydration", async () => {
    const client = {
      query: vi.fn().mockResolvedValue({ rows }),
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
      { acceptedTypes: ["vector", "join"] },
      client,
    );

    expect(result.total).toBe(3);
    expect(result.items).toHaveLength(3);
  });

  it("computes facets before active filters", () => {
    const result = filterAndSortSources(rows, {
      acceptedTypes: ["vector", "join"],
      access: ["editable"],
    });
    expect(result.items).toHaveLength(1);
    expect(result.facets.access).toEqual(
      expect.arrayContaining([
        { value: "editable", count: 1 },
        { value: "readable", count: 1 },
        { value: "global", count: 1 },
      ]),
    );
  });

  it("keeps generic PostGIS geometry declarations filterable as unspecified", () => {
    const result = filterAndSortSources(
      [
        ...rows,
        {
          id: "mx_vector_p_q_r_s_t",
          title: "Mixed geometry",
          type: "vector",
          editor_email: "alice@example.org",
          access: "editable",
          tags: [],
          geometry_types: ["unspecified"],
        },
      ],
      {
        acceptedTypes: ["vector"],
        geometryTypes: ["unspecified"],
      },
    );

    expect(result.items.map((item) => item.title)).toEqual(["Mixed geometry"]);
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
