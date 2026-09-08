import { beforeEach, describe, expect, it, vi } from "vitest";

const { readQuery } = vi.hoisted(() => ({ readQuery: vi.fn() }));

vi.mock("#mapx/db", () => ({ pgRead: { query: readQuery } }));
vi.mock("#mapx/authentication", () => ({
  isRoot: (socket) => socket?.session?.user_roles?.root === true,
  isProjectCreator: (socket) =>
    socket?.session?.user_roles?.project_creator === true,
}));
const defaultProjectId = "MX-DEF-AUL-T00-000-000";

vi.mock("#root/settings", () => ({
  settings: { project: { default: "MX-DEF-AUL-T00-000-000" } },
}));

import { assertProjectDeletable } from "./guards.js";

const idProject = "MX-T6R-PJF-2DF-3OI-LBF";

function socket({ root = false, project_creator = false, project_id } = {}) {
  return {
    session: {
      project_id,
      user_roles: { root, project_creator },
    },
  };
}

describe("assertProjectDeletable", () => {
  beforeEach(() => {
    readQuery.mockReset();
  });

  it("rejects an invalid project id before any query", async () => {
    await expect(
      assertProjectDeletable(socket({ root: true }), "not-an-id"),
    ).rejects.toThrow("project_id_invalid");
    expect(readQuery).not.toHaveBeenCalled();
  });

  it("rejects users who are neither project creator nor root", async () => {
    await expect(assertProjectDeletable(socket(), idProject)).rejects.toThrow(
      "project_delete_access_denied",
    );
    expect(readQuery).not.toHaveBeenCalled();
  });

  it("rejects deleting the user's own current project", async () => {
    await expect(
      assertProjectDeletable(
        socket({ root: true, project_id: idProject }),
        idProject,
      ),
    ).rejects.toThrow("project_delete_is_current_forbidden");
    expect(readQuery).not.toHaveBeenCalled();
  });

  it("rejects deleting the configured default project", async () => {
    await expect(
      assertProjectDeletable(socket({ root: true }), defaultProjectId),
    ).rejects.toThrow("project_delete_default_forbidden");
    expect(readQuery).not.toHaveBeenCalled();
  });

  it("rejects a project that does not exist", async () => {
    readQuery.mockResolvedValueOnce({ rows: [] });
    await expect(
      assertProjectDeletable(socket({ root: true }), idProject),
    ).rejects.toThrow("project_not_found");
  });

  it("rejects a project that is not marked legacy", async () => {
    readQuery.mockResolvedValueOnce({
      rows: [{ legacy: false, title: "Test" }],
    });
    await expect(
      assertProjectDeletable(socket({ root: true }), idProject),
    ).rejects.toThrow("project_delete_not_legacy_forbidden");
  });

  it("accepts a legacy project for root or project-creator users", async () => {
    readQuery.mockResolvedValueOnce({
      rows: [{ legacy: true, title: "Test project" }],
    });
    await expect(
      assertProjectDeletable(socket({ root: true }), idProject),
    ).resolves.toEqual({ title: "Test project" });

    readQuery.mockResolvedValueOnce({
      rows: [{ legacy: true, title: "Test project" }],
    });
    await expect(
      assertProjectDeletable(socket({ project_creator: true }), idProject),
    ).resolves.toEqual({ title: "Test project" });
  });

  it("re-runs the check against a supplied transaction client", async () => {
    const client = {
      query: vi
        .fn()
        .mockResolvedValue({ rows: [{ legacy: true, title: "T" }] }),
    };
    await assertProjectDeletable(socket({ root: true }), idProject, {
      client,
    });
    expect(client.query).toHaveBeenCalled();
    expect(readQuery).not.toHaveBeenCalled();
  });
});
