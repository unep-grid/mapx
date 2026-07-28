import { beforeEach, describe, expect, it, vi } from "vitest";

const { readQuery, writeQuery, connect } = vi.hoisted(() => ({
  readQuery: vi.fn(),
  writeQuery: vi.fn(),
  connect: vi.fn(),
}));

vi.mock("#mapx/db", () => ({
  pgRead: { query: readQuery },
  pgWrite: { query: writeQuery, connect },
}));
vi.mock("#mapx/authentication", () => ({
  isRoot: (socket) =>
    socket?.session?.user_authenticated === true &&
    socket?.session?.user_roles?.root === true,
}));

import {
  getAccessibleProjects,
  ioProjectList,
  setFavoriteProject,
  setFeaturedProject,
} from "./browser.js";

const projectId = "MX-T6R-PJF-2DF-3OI-LBF";

function socket({ authenticated = true, root = false, id = 7 } = {}) {
  return {
    session: {
      user_authenticated: authenticated,
      user_id: id,
      user_roles: { root },
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
          is_favorite: true,
        },
      ],
    });
    expect(await getAccessibleProjects(socket(), "fr")).toEqual([
      expect.objectContaining({
        featured_rank: 1000,
        is_favorite: true,
      }),
    ]);
    expect(readQuery.mock.calls[0][1]).toEqual([7, "fr"]);

    readQuery.mockResolvedValueOnce({ rows: [] });
    const result = await new Promise((resolve) =>
      ioProjectList(socket({ root: true }), {}, resolve),
    );
    expect(result.can_curate_featured).toBe(true);
  });

  it("rejects guest favorites and never accepts a browser user id", async () => {
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
});
