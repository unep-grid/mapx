import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSourceDependencies, getViewsTableBySource } = vi.hoisted(() => ({
  getSourceDependencies: vi.fn(),
  getViewsTableBySource: vi.fn(),
}));

vi.mock("#mapx/db", () => ({ pgRead: { query: vi.fn() } }));
vi.mock("#mapx/source", () => ({ getSourceDependencies }));
vi.mock("#mapx/view", () => ({ getViewsTableBySource }));

import { getProjectDeleteImpact } from "./impact.js";

const idProject = "MX-OWN-PROJECT";

function client(rowsBySql) {
  return {
    query: vi.fn(async (sql) => {
      for (const [match, rows] of rowsBySql) {
        if (sql.includes(match)) {
          return { rows };
        }
      }
      return { rows: [] };
    }),
  };
}

describe("getProjectDeleteImpact", () => {
  beforeEach(() => {
    getSourceDependencies.mockReset();
    getViewsTableBySource.mockReset();
  });

  it("returns the project's own sources, views and themes", async () => {
    const c = client([
      ["FROM mx_sources_latest", [{ id: "s1", type: "vector", global: false }]],
      ["FROM mx_views_latest", [{ id: "v1", title: "View 1" }]],
      ["FROM mx_themes", [{ id: "t1", label: "Theme 1" }]],
    ]);
    getSourceDependencies.mockResolvedValue([]);
    getViewsTableBySource.mockResolvedValue([]);

    const impact = await getProjectDeleteImpact(idProject, "en", c);
    expect(impact.sources).toEqual([
      { id: "s1", type: "vector", global: false },
    ]);
    expect(impact.views).toEqual([{ id: "v1", title: "View 1" }]);
    expect(impact.themes).toEqual([{ id: "t1", label: "Theme 1" }]);
    expect(impact.sourcesDependent).toEqual([]);
    expect(impact.viewsDependent).toEqual([]);
    // no global source -> no cascade lookups
    expect(getSourceDependencies).not.toHaveBeenCalled();
    expect(getViewsTableBySource).not.toHaveBeenCalled();
  });

  it("cascades into cross-project dependents of global sources only, deduplicated", async () => {
    const c = client([
      [
        "FROM mx_sources_latest",
        [
          { id: "global_1", type: "vector", global: true },
          { id: "local_1", type: "vector", global: false },
        ],
      ],
      ["FROM mx_views_latest", []],
      ["FROM mx_themes", []],
    ]);
    getSourceDependencies.mockResolvedValue([
      { id: "join_in_other_project", id_project: "OTHER" },
      { id: "join_in_same_project", id_project: idProject },
    ]);
    getViewsTableBySource.mockResolvedValue([
      { id: "view_in_other_project", project: "OTHER" },
      { id: "view_in_same_project", project: idProject },
    ]);

    const impact = await getProjectDeleteImpact(idProject, "en", c);

    // only queried for the global source, not the local one
    expect(getSourceDependencies).toHaveBeenCalledTimes(1);
    expect(getSourceDependencies).toHaveBeenCalledWith(
      "global_1",
      "en",
      c,
    );
    expect(getViewsTableBySource).toHaveBeenCalledWith(
      "global_1",
      null,
      c,
    );

    // same-project dependents are excluded ( already covered by the
    // project's own views/sources ) ; cross-project ones are kept
    expect(impact.sourcesDependent).toEqual([
      { id: "join_in_other_project", id_project: "OTHER" },
    ]);
    expect(impact.viewsDependent).toEqual([
      { id: "view_in_other_project", project: "OTHER" },
    ]);
  });
});
