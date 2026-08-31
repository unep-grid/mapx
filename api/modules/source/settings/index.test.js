import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUserRoles: vi.fn(),
  pgRead: { query: vi.fn() },
}));

vi.mock("#mapx/authentication", () => ({
  getUserRoles: mocks.getUserRoles,
}));
vi.mock("#mapx/db", () => ({ pgRead: mocks.pgRead }));

import {
  getSourceSettingsOverview,
  getSourceSettingsUsage,
  ioSourceSettingsGet,
} from "./index.js";

const idSource = "mx_vector_a_b_c_d_e";
const idProject = "MX-PROJECT";

function source(overrides = {}) {
  return {
    id: idSource,
    editor: 7,
    editor_email: "editor@example.test",
    editors: ["publishers"],
    readers: ["publishers"],
    services: ["mx_download"],
    global: false,
    project: idProject,
    type: "vector",
    data: { meta: { text: { title: { en: "Roads", fr: "Routes" } } } },
    ...overrides,
  };
}

function client({ sourceRow = source(), dependencies = [], summary = {} } = {}) {
  return {
    query: vi.fn(async (sql) => {
      if (sql.includes("FROM mx_sources_latest source")) {
        return { rows: sourceRow ? [sourceRow] : [] };
      }
      if (sql.includes("FROM pg_depend")) return { rows: dependencies };
      if (sql.includes("count(*)::integer AS count")) {
        return {
          rows: [
            {
              count: 0,
              has_other_project: false,
              has_other_editor: false,
              ...summary,
            },
          ],
        };
      }
      if (sql.includes("count(*) OVER()")) return { rows: [] };
      throw new Error(`Unexpected SQL: ${sql}`);
    }),
  };
}

describe("source settings overview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUserRoles.mockResolvedValue({
      publisher: true,
      root: false,
      group: ["publishers"],
    });
  });

  it("returns localized settings and a constant-size dependency summary", async () => {
    const dependencies = Array.from({ length: 40 }, (_, index) => ({
      id: `mx_join_${index}`,
      project: idProject,
      id_editor: 7,
    }));
    const c = client({
      dependencies,
      summary: { count: 12, has_other_editor: true },
    });
    const result = await getSourceSettingsOverview({
      client: c,
      idSource,
      idUser: 7,
      idProject,
      language: "fr",
    });

    expect(result.source.title).toBe("Routes");
    expect(result.usage).toEqual(
      expect.objectContaining({ sources: 40, views: 12, hasOtherEditor: true }),
    );
    expect(result.constraints.protectPublisherReaders).toBe(true);
    expect(c.query).toHaveBeenCalledTimes(3);
  });

  it("paginates source dependencies without returning the whole list", async () => {
    const dependencies = Array.from({ length: 30 }, (_, index) => ({
      id: `mx_join_${index}`,
      project: idProject,
      id_editor: 7,
    }));
    const result = await getSourceSettingsUsage({
      client: client({ dependencies }),
      idSource,
      idUser: 7,
      idProject,
      category: "sources",
      limit: 10,
      offset: 10,
    });
    expect(result.rows).toHaveLength(10);
    expect(result.rows[0].id).toBe("mx_join_10");
    expect(result.total).toBe(30);
  });

  it("uses socket session identity and project instead of request values", async () => {
    mocks.pgRead.query = client().query;
    const callback = vi.fn();
    const socket = {
      session: {
        user_authenticated: true,
        user_id: 7,
        project_id: idProject,
      },
      notifyInfoError: vi.fn(),
    };
    await ioSourceSettingsGet(
      socket,
      { idSource, idUser: 999, idProject: "MX-OTHER" },
      callback,
    );
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
    expect(mocks.getUserRoles).toHaveBeenCalledWith(7, idProject, mocks.pgRead);
  });
});
