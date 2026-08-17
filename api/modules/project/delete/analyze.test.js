import { beforeEach, describe, expect, it, vi } from "vitest";

const { assertProjectDeletable, getProjectDeleteImpact } = vi.hoisted(() => ({
  assertProjectDeletable: vi.fn(),
  getProjectDeleteImpact: vi.fn(),
}));

vi.mock("./guards.js", () => ({ assertProjectDeletable }));
vi.mock("./impact.js", () => ({ getProjectDeleteImpact }));

import { ioProjectDeleteAnalyze } from "./analyze.js";

describe("ioProjectDeleteAnalyze", () => {
  beforeEach(() => {
    assertProjectDeletable.mockReset();
    getProjectDeleteImpact.mockReset();
  });

  it("reports the guard's rejection reason without querying impact", async () => {
    assertProjectDeletable.mockRejectedValue(
      new Error("project_delete_not_legacy_forbidden"),
    );
    const result = await new Promise((resolve) =>
      ioProjectDeleteAnalyze({}, { id_project: "MX-1" }, resolve),
    );
    expect(result).toEqual({
      error: "project_delete_not_legacy_forbidden",
    });
    expect(getProjectDeleteImpact).not.toHaveBeenCalled();
  });

  it("returns the impact summary with the project title on success", async () => {
    assertProjectDeletable.mockResolvedValue({ title: "My Project" });
    getProjectDeleteImpact.mockResolvedValue({
      sources: [{ id: "s1" }],
      views: [],
      themes: [],
      sourcesDependent: [],
      viewsDependent: [],
    });
    const result = await new Promise((resolve) =>
      ioProjectDeleteAnalyze({}, { id_project: "MX-1" }, resolve),
    );
    expect(result.success).toBe(true);
    expect(result.project_title).toBe("My Project");
    expect(result.id_project).toBe("MX-1");
    expect(result.sources).toEqual([{ id: "s1" }]);
  });
});
