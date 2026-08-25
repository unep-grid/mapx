import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
  createExternalMetadataSource: vi.fn(),
  getUserRoles: vi.fn(),
  newIdView: vi.fn(),
}));

vi.mock("#mapx/db", () => ({
  pgWrite: { connect: mocks.connect },
}));
vi.mock("#mapx/authentication", () => ({
  getUserRoles: mocks.getUserRoles,
  validateTokenHandler: vi.fn(),
}));
vi.mock("../source/external.js", () => ({
  createExternalMetadataSource: mocks.createExternalMetadataSource,
}));
vi.mock("./id.js", () => ({ newIdView: mocks.newIdView }));

import {
  createExternalMetadataView,
  deleteViewWithExternalMetadata,
} from "./lifecycle.js";

const idProject = "MX-AAA-BBB-CCC-DDD-EEE";
const idView = "MX-AAAAA-BBBBB-CCCCC";
const idSource = "mx_extern_a_b_c_d_e";

function createClient(query) {
  return { query: vi.fn(query), release: vi.fn() };
}

describe("external metadata view lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUserRoles.mockResolvedValue({
      publisher: true,
      developer: true,
      admin: false,
    });
    mocks.createExternalMetadataSource.mockResolvedValue({
      ok: true,
      source: { id: idSource },
    });
    mocks.newIdView.mockReturnValue(idView);
  });

  it("creates an RT and its initialized metadata source together", async () => {
    const client = createClient(async (sql, values) => {
      if (String(sql).includes("INSERT INTO mx_views")) {
        return {
          rowCount: 1,
          rows: [
            {
              id: values[0],
              editor: values[1],
              data: JSON.parse(values[2]),
              type: values[3],
              project: values[4],
              readers: [],
              editors: [],
            },
          ],
        };
      }
      return { rowCount: 0, rows: [] };
    });

    const result = await createExternalMetadataView(
      {
        idUser: 7,
        idProject,
        idView: "MX-ZZZZZ-ZZZZZ-ZZZZZ",
        viewType: "rt",
        title: " New raster ",
        language: "fr",
      },
      client,
    );

    expect(result.view.data).toEqual({
      title: { fr: "New raster" },
      abstract: {},
      source: { metadataId: idSource, tiles: [] },
    });
    expect(result.view.id).toBe(idView);
    expect(mocks.createExternalMetadataSource).toHaveBeenCalledWith(
      {
        idUser: 7,
        idProject,
        metadata: {
          text: { title: { fr: "New raster" }, abstract: {} },
        },
      },
      client,
    );
  });

  it("requires developer access for custom-code views", async () => {
    mocks.getUserRoles.mockResolvedValue({
      publisher: true,
      developer: false,
    });

    await expect(
      createExternalMetadataView(
        {
          idUser: 7,
          idProject,
          viewType: "cc",
          title: "Code",
          language: "en",
        },
        createClient(),
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(mocks.createExternalMetadataSource).not.toHaveBeenCalled();
  });

  it("rolls metadata creation back when the view insert fails", async () => {
    const client = createClient(async (sql) => {
      if (String(sql).includes("INSERT INTO mx_views")) {
        throw new Error("insert failed");
      }
      return { rowCount: 0, rows: [] };
    });
    mocks.connect.mockResolvedValue(client);

    await expect(
      createExternalMetadataView({
        idUser: 7,
        idProject,
        viewType: "rt",
        title: "Raster",
        language: "en",
      }),
    ).rejects.toThrow("insert failed");

    expect(client.query.mock.calls.map(([sql]) => sql)).toContain("ROLLBACK");
    expect(client.query.mock.calls.map(([sql]) => sql)).not.toContain("COMMIT");
    expect(client.release).toHaveBeenCalledOnce();
  });

  function deletionClient({
    type = "rt",
    sourceProject = idProject,
    references = 0,
    editor = 7,
    editors = [],
  } = {}) {
    return createClient(async (sql) => {
      const text = String(sql);
      if (text.includes("FROM mx_views\n") && text.includes("FOR UPDATE")) {
        return {
          rowCount: 1,
          rows: [
            {
              editor,
              editors,
              project: idProject,
              type,
              data:
                type === "rt" || type === "cc"
                  ? { source: { metadataId: idSource } }
                  : { source: { layerInfo: { name: "mx_vector_a_b_c_d_e" } } },
            },
          ],
        };
      }
      if (text.includes("FROM mx_sources\n")) {
        return {
          rowCount: 1,
          rows: [{ project: sourceProject, type: "external" }],
        };
      }
      if (text.includes("DELETE FROM mx_views")) {
        return { rowCount: 2, rows: [] };
      }
      if (text.includes("FROM mx_views_latest")) {
        return { rowCount: references, rows: references ? [{ exists: 1 }] : [] };
      }
      if (text.includes("DELETE FROM mx_sources")) {
        return { rowCount: 3, rows: [] };
      }
      return { rowCount: 1, rows: [] };
    });
  }

  it("deletes every revision of an RT and its unshared external source", async () => {
    const client = deletionClient();

    await expect(
      deleteViewWithExternalMetadata(
        { idUser: 7, idProject, idView },
        client,
      ),
    ).resolves.toEqual({ ok: true, idView, idSourceDeleted: idSource });

    expect(
      client.query.mock.calls.some(([sql]) =>
        String(sql).includes("DELETE FROM mx_sources"),
      ),
    ).toBe(true);
    expect(
      client.query.mock.calls.some(([sql]) =>
        String(sql).includes("SET views_external"),
      ),
    ).toBe(true);
  });

  it("preserves vector, shared, and cross-project sources", async () => {
    for (const client of [
      deletionClient({ type: "vt" }),
      deletionClient({ references: 1 }),
      deletionClient({ sourceProject: "MX-XXX-YYY-ZZZ-AAA-BBB" }),
    ]) {
      const result = await deleteViewWithExternalMetadata(
        { idUser: 7, idProject, idView },
        client,
      );
      expect(result.idSourceDeleted).toBeNull();
      expect(
        client.query.mock.calls.some(([sql]) =>
          String(sql).includes("DELETE FROM mx_sources"),
        ),
      ).toBe(false);
    }
  });

  it("denies deletion without current view edit access", async () => {
    mocks.getUserRoles.mockResolvedValue({
      publisher: true,
      admin: false,
    });
    const client = deletionClient({ editor: 9, editors: ["admins"] });

    await expect(
      deleteViewWithExternalMetadata(
        { idUser: 7, idProject, idView },
        client,
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(
      client.query.mock.calls.some(([sql]) =>
        String(sql).includes("DELETE FROM mx_views"),
      ),
    ).toBe(false);
  });
});
