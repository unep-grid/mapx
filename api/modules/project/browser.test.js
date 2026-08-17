import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";

const { readQuery, writeQuery, connect } = vi.hoisted(() => ({
  readQuery: vi.fn(),
  writeQuery: vi.fn(),
  connect: vi.fn(),
}));

vi.mock("#mapx/db", () => ({
  pgRead: { query: readQuery },
  pgWrite: { query: writeQuery, connect },
}));
vi.mock("#mapx/template", () => ({
  templates: {
    getAccessibleProjectLogos: "SELECT project logos",
    getAccessibleProjects: "SELECT accessible projects",
    setLegacyProject: "UPDATE legacy project",
    setFavoriteProject:
      "UPDATE favorite projects WITH jsonb_set_nested SELECT DISTINCT ON",
  },
}));
vi.mock("#mapx/authentication", () => ({
  isRoot: (socket) =>
    socket?.session?.user_authenticated === true &&
    socket?.session?.user_roles?.root === true,
  isProjectCreator: (socket) =>
    socket?.session?.user_authenticated === true &&
    socket?.session?.user_roles?.project_creator === true,
}));

import {
  getAccessibleProjects,
  ioProjectList,
  setFavoriteProject,
  setFeaturedProject,
  setLegacyProject,
} from "./browser.js";

const projectId = "MX-T6R-PJF-2DF-3OI-LBF";

function socket({
  authenticated = true,
  guest = false,
  root = false,
  project_creator = false,
  id = 7,
} = {}) {
  return {
    session: {
      user_authenticated: authenticated,
      user_is_guest: guest,
      user_id: id,
      user_roles: { root, project_creator },
    },
  };
}

describe("project browser API", () => {
  beforeEach(() => {
    readQuery.mockReset();
    writeQuery.mockReset();
    connect.mockReset();
  });

  it("lists accessible rows with favorite metadata and root capability", async () => {
    readQuery.mockResolvedValueOnce({
      rows: [
        {
          id: projectId,
          featured_rank: 1000,
          legacy: false,
          is_favorite: true,
        },
      ],
    });
    expect(await getAccessibleProjects(socket(), "fr")).toEqual([
      expect.objectContaining({
        featured_rank: 1000,
        legacy: false,
        is_favorite: true,
      }),
    ]);
    expect(readQuery.mock.calls[0][1]).toEqual([7, "fr"]);

    readQuery.mockResolvedValueOnce({ rows: [] });
    const result = await new Promise((resolve) =>
      ioProjectList(socket({ root: true }), {}, resolve),
    );
    expect(result.can_curate_featured).toBe(true);
    expect(result.can_curate_legacy).toBe(true);

    readQuery.mockResolvedValueOnce({ rows: [] });
    const resultCreator = await new Promise((resolve) =>
      ioProjectList(socket({ project_creator: true }), {}, resolve),
    );
    expect(resultCreator.can_curate_featured).toBe(false);
    expect(resultCreator.can_curate_legacy).toBe(true);
  });

  it("returns project creation dates for browser sorting", async () => {
    const sql = await readFile(
      new URL("../template/sql/getAccessibleProjects.sql", import.meta.url),
      "utf8",
    );
    expect(sql).toContain("p.date_created");
    expect(sql).not.toContain("ORDER BY p.date_modified");
  });

  it("rejects guest favorites and never accepts a browser user id", async () => {
    await expect(
      setFavoriteProject(socket({ guest: true }), projectId, true),
    ).rejects.toThrow("authentication_required");
    await expect(
      setFavoriteProject(socket({ authenticated: false }), projectId, true),
    ).rejects.toThrow("authentication_required");
    expect(writeQuery).not.toHaveBeenCalled();
  });

  it("updates only the session user's nested favorite preference", async () => {
    writeQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ favorite_projects: [projectId] }],
    });
    await expect(
      setFavoriteProject(socket({ id: 23 }), projectId, true),
    ).resolves.toEqual([projectId]);
    expect(writeQuery.mock.calls[0][1]).toEqual([23, projectId, true]);
    expect(writeQuery.mock.calls[0][0]).toContain("jsonb_set_nested");
    expect(writeQuery.mock.calls[0][0]).toContain("SELECT DISTINCT ON");
  });

  it("rejects non-root featured curation regardless of other roles", async () => {
    const nonRoot = socket();
    nonRoot.session.user_roles = {
      root: false,
      admin: true,
      project_creator: true,
    };
    await expect(setFeaturedProject(nonRoot, projectId, true)).rejects.toThrow(
      "project_featured_access_denied",
    );
    expect(connect).not.toHaveBeenCalled();
  });

  it("allows root users to append, rerank and unfeature", async () => {
    const queries = [];
    const client = {
      query: vi.fn(async (sql, values) => {
        queries.push([sql, values]);
        if (sql.includes("RETURNING featured_rank")) {
          return {
            rowCount: 1,
            rows: [
              {
                featured_rank: sql.includes("SET featured_rank = NULL")
                  ? null
                  : values[1] || 1000,
              },
            ],
          };
        }
        return { rowCount: 0, rows: [] };
      }),
      release: vi.fn(),
    };
    connect.mockResolvedValue(client);

    await expect(
      setFeaturedProject(socket({ root: true }), projectId, true),
    ).resolves.toBe(1000);
    expect(queries.some(([sql]) => sql.includes("max(featured_rank)"))).toBe(
      true,
    );

    await expect(
      setFeaturedProject(socket({ root: true }), projectId, true, 25),
    ).resolves.toBe(25);
    await expect(
      setFeaturedProject(socket({ root: true }), projectId, false),
    ).resolves.toBeNull();
  });

  it("rejects non-positive and fractional featured ranks", async () => {
    await expect(
      setFeaturedProject(socket({ root: true }), projectId, true, 0),
    ).rejects.toThrow("project_featured_rank_invalid");
    await expect(
      setFeaturedProject(socket({ root: true }), projectId, true, 1.5),
    ).rejects.toThrow("project_featured_rank_invalid");
  });

  it("allows only root or project-creator users to update the legacy flag", async () => {
    await expect(
      setLegacyProject(socket(), projectId, true),
    ).rejects.toThrow("project_legacy_access_denied");
    expect(writeQuery).not.toHaveBeenCalled();

    writeQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ legacy: true }],
    });
    await expect(
      setLegacyProject(socket({ root: true }), projectId, true),
    ).resolves.toBe(true);
    expect(writeQuery).toHaveBeenCalledWith("UPDATE legacy project", [
      projectId,
      true,
    ]);

    writeQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ legacy: true }],
    });
    await expect(
      setLegacyProject(socket({ project_creator: true }), projectId, true),
    ).resolves.toBe(true);
  });

  it("validates legacy values and reports missing active projects", async () => {
    await expect(
      setLegacyProject(socket({ root: true }), projectId, "true"),
    ).rejects.toThrow("project_legacy_value_invalid");
    expect(writeQuery).not.toHaveBeenCalled();

    writeQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    await expect(
      setLegacyProject(socket({ root: true }), projectId, false),
    ).rejects.toThrow("project_not_found");
  });
});
