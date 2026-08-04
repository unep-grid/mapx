import { describe, expect, it } from "vitest";
import {
  cleanProjectText,
  nextProjectRenderLimit,
  nextProjectSort,
  normalizeProject,
  parseInitialProjectListFilters,
  selectProjects,
} from "./list_helpers.js";

const themeLabels = {
  biota: "Biota",
  environment: "Environment",
  oceans: "Oceans",
};

const projects = [
  normalizeProject(
    {
      id: "MX-ONE",
      title: "Écosystèmes",
      description: "Biodiversité marine",
      org_name: "UNEP",
      themes: ["biota", "oceans"],
      role: "admin",
      is_member: true,
      view_count: 3,
      collaborator_count: 8,
      date_modified: "2026-06-01T00:00:00Z",
    },
    themeLabels,
  ),
  normalizeProject(
    {
      id: "MX-TWO",
      title: "Atmosphere",
      themes: ["environment"],
      role: "public",
      is_member: false,
      view_count: 20,
      collaborator_count: 2,
      date_modified: "2026-01-01T00:00:00Z",
    },
    themeLabels,
  ),
];

function state(overrides = {}) {
  return {
    scope: "accessible",
    role: "any",
    themes: [],
    sort: "default",
    search: "",
    ...overrides,
  };
}

describe("project list helpers", () => {
  it("normalizes diacritics for project search", () => {
    expect(cleanProjectText("Écosystèmes")).toBe("ecosystemes");
    expect(selectProjects(projects, state({ search: "ecosystemes" }))).toEqual([
      projects[0],
    ]);
  });

  it("combines membership, exact role and all selected themes", () => {
    expect(selectProjects(projects, state({ scope: "mine" }))).toEqual([
      projects[0],
    ]);
    expect(selectProjects(projects, state({ role: "public" }))).toEqual([
      projects[1],
    ]);
    expect(
      selectProjects(projects, state({ themes: ["biota", "oceans"] })),
    ).toEqual([projects[0]]);
  });

  it("sorts by date and name", () => {
    expect(selectProjects(projects, state({ sort: "updated_asc" }))[0].id).toBe(
      "MX-TWO",
    );
    expect(selectProjects(projects, state({ sort: "name_asc" }))[0].id).toBe(
      "MX-TWO",
    );
  });

  it("sorts by views and collaborators in both directions", () => {
    expect(selectProjects(projects, state({ sort: "views_desc" }))[0].id).toBe(
      "MX-TWO",
    );
    expect(selectProjects(projects, state({ sort: "views_asc" }))[0].id).toBe(
      "MX-ONE",
    );
    expect(
      selectProjects(projects, state({ sort: "collaborators_desc" }))[0].id,
    ).toBe("MX-ONE");
    expect(
      selectProjects(projects, state({ sort: "collaborators_asc" }))[0].id,
    ).toBe("MX-TWO");
  });

  it("uses favorites, featured rank and modification date for default sorting", () => {
    const ordered = [
      normalizeProject({
        id: "MX-AAA11-BBB22-CCC33",
        title: "Zulu favorite",
        is_favorite: true,
        featured_rank: 5,
        legacy: true,
      }),
      normalizeProject({
        id: "MX-DDD44-EEE55-FFF66",
        title: "Alpha favorite",
        is_favorite: true,
      }),
      normalizeProject({
        id: "MX-GGG77-HHH88-III99",
        title: "Zulu featured",
        featured_rank: 1000,
        legacy: true,
      }),
      normalizeProject({
        id: "MX-JJJ11-KKK22-LLL33",
        title: "Alpha featured",
        featured_rank: 1000,
      }),
      normalizeProject({
        id: "MX-MMM44-NNN55-OOO66",
        title: "Regular older",
        date_modified: "2020-01-01T00:00:00Z",
      }),
      normalizeProject({
        id: "MX-PPP77-QQQ88-RRR99",
        title: "Regular newer",
        date_modified: "2026-01-01T00:00:00Z",
      }),
      normalizeProject({
        id: "MX-SSS11-TTT22-UUU33",
        title: "Obsolete newest",
        legacy: true,
        date_modified: "2030-01-01T00:00:00Z",
      }),
    ];

    expect(
      selectProjects(ordered, state()).map((project) => project.title),
    ).toEqual([
      "Alpha favorite",
      "Zulu favorite",
      "Alpha featured",
      "Zulu featured",
      "Regular newer",
      "Regular older",
      "Obsolete newest",
    ]);
  });

  it("uses an explicit sort globally instead of pinning favorites and featured projects", () => {
    const ordered = [
      normalizeProject({
        id: "MX-ZULU-FAVORITE",
        title: "Zulu favorite",
        is_favorite: true,
      }),
      normalizeProject({
        id: "MX-BETA-FEATURED",
        title: "Beta featured",
        featured_rank: 1000,
      }),
      normalizeProject({
        id: "MX-ALPHA-REGULAR",
        title: "Alpha regular",
        legacy: true,
      }),
    ];

    expect(
      selectProjects(ordered, state({ sort: "name_asc" })).map(
        (project) => project.title,
      ),
    ).toEqual(["Alpha regular", "Beta featured", "Zulu favorite"]);
  });

  it("parses legacy URL filters without making access decisions", () => {
    expect(
      parseInitialProjectListFilters({ role: "publish", title: "Demo*" }),
    ).toEqual({ role: "publisher", scope: "mine", search: "Demo" });
    expect(parseInitialProjectListFilters({ role: "unknown" })).toEqual({
      role: "any",
      scope: "accessible",
      search: "",
    });
    expect(parseInitialProjectListFilters({ role: "public" })).toEqual({
      role: "any",
      scope: "accessible",
      search: "",
    });
  });

  it("increments the progressive rendering limit without exceeding total", () => {
    expect(nextProjectRenderLimit(30, 282)).toBe(50);
    expect(nextProjectRenderLimit(270, 282)).toBe(282);
    expect(nextProjectRenderLimit(30, 12)).toBe(30);
  });

  it("uses a natural first direction then toggles the active column", () => {
    expect(nextProjectSort("updated_desc", "name")).toBe("name_asc");
    expect(nextProjectSort("name_asc", "name")).toBe("name_desc");
    expect(nextProjectSort("name_desc", "views")).toBe("views_desc");
    expect(nextProjectSort("views_desc", "views")).toBe("views_asc");
  });

  it("uses safe defaults for missing optional metadata", () => {
    const project = normalizeProject({ id: "MX-EMPTY" });
    expect(project).toMatchObject({
      title: "MX-EMPTY",
      description: "",
      org_name: "",
      themes: [],
      view_count: 0,
      collaborator_count: 0,
      legacy: false,
    });
  });
});
