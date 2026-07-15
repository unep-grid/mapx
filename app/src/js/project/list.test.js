import { beforeEach, describe, expect, it, vi } from "vitest";

const { emitAsync } = vi.hoisted(() => ({ emitAsync: vi.fn() }));

vi.mock("../mx.js", () => ({ ws: { emitAsync } }));
vi.mock("../language", () => ({
  getDictItem: vi.fn(async (keys) => keys),
}));
vi.mock("../settings", () => ({
  settings: {
    language: "en",
    project: { id: "CURRENT" },
    user: { guest: false },
  },
}));
vi.mock("../map_helpers/index.js", () => ({
  requestProjectMembership: vi.fn(),
  setProject: vi.fn(),
}));

import { ProjectListElement } from "./list.js";

const projects = [
  {
    id: "ONE",
    title: "Zulu",
    description: "Ocean project",
    themes: ["oceans"],
    role: "admin",
    is_member: true,
    view_count: 2,
    collaborator_count: 8,
    date_modified: "2026-06-01T00:00:00Z",
  },
  {
    id: "TWO",
    title: "Alpha",
    description: "Land project",
    themes: ["environment"],
    role: "public",
    is_member: false,
    view_count: 20,
    collaborator_count: 2,
    date_modified: "2026-01-01T00:00:00Z",
  },
];

describe("mx-project-list", () => {
  beforeEach(() => {
    emitAsync.mockReset();
    emitAsync.mockResolvedValue({ projects });
  });

  it("applies native filters and header sorting to rendered rows", async () => {
    const element = new ProjectListElement();
    element.configure({ language: "en" });
    document.body.appendChild(element);
    await vi.waitFor(() => expect(element.projects).toHaveLength(2));

    element.roleSelect.value = "public";
    element.roleSelect.dispatchEvent(new Event("change", { bubbles: true }));
    expect(element.selectedProjects.map((project) => project.id)).toEqual([
      "TWO",
    ]);

    element.roleSelect.value = "any";
    element.roleSelect.dispatchEvent(new Event("change", { bubbles: true }));
    element.sortButtons.get("name").click();
    expect(element.state.sort).toBe("name_asc");
    expect(element.selectedProjects.map((project) => project.id)).toEqual([
      "TWO",
      "ONE",
    ]);
    expect(
      element.sortButtons.get("name").parentElement.getAttribute("aria-sort"),
    ).toBe("ascending");
    expect(element.sortButtons.get("name").lastElementChild.hidden).toBe(false);
    expect(element.sortButtons.get("updated").lastElementChild.hidden).toBe(
      true,
    );
    expect(element.rows.querySelector(".mx-icon.mx-view")).not.toBeNull();
    expect(element.rows.querySelector(".fa-eye")).toBeNull();

    element.sortButtons.get("name").click();
    expect(element.state.sort).toBe("name_desc");
    element.remove();
  });
});
