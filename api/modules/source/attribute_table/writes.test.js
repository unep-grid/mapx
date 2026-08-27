import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  client: {
    query: vi.fn(),
    release: vi.fn(),
  },
  connect: vi.fn(),
  columnExists: vi.fn(),
  deleteRowByGid: vi.fn(),
  getSourceIdentityStatus: vi.fn(),
  revisionSave: vi.fn(),
  revisionTouch: vi.fn(),
  updateFeatureGeometry: vi.fn(),
  updateLayerExtentMeta: vi.fn(),
}));

vi.mock("#mapx/db", () => ({
  pgWrite: { connect: mocks.connect },
}));

vi.mock("#mapx/db_utils", () => ({
  addColumnMetadata: vi.fn(),
  addTableColumn: vi.fn(),
  columnExists: mocks.columnExists,
  columnsExist: vi.fn(),
  deleteRowByGid: mocks.deleteRowByGid,
  duplicateColumnMetadata: vi.fn(),
  duplicateTableColumn: vi.fn(),
  getColumnCells: vi.fn(),
  getColumnsTypesSimple: vi.fn(),
  removeColumnMetadata: vi.fn(),
  removeTableColumn: vi.fn(),
  renameColumnMetadata: vi.fn(),
  renameTableColumn: vi.fn(),
  setMxSourceData: vi.fn(),
  updateLayerExtentMeta: mocks.updateLayerExtentMeta,
  updateTableCellByGid: vi.fn(),
  updateViewsAttributeBatch: vi.fn(),
}));

vi.mock("#mapx/source", () => ({
  SourceRevisionBatch: class {
    constructor() {
      this.touch = mocks.revisionTouch;
      this.save = mocks.revisionSave;
    }
  },
  updateJoinColumnsNames: vi.fn(),
}));

vi.mock("./geometry.js", () => ({
  cols: {
    geom: "geom",
    geom_status: "__mx_geom_status",
  },
  insertTableRow: vi.fn(),
  updateFeatureGeometry: mocks.updateFeatureGeometry,
}));

vi.mock("./identity.js", () => ({
  getSourceIdentityStatus: mocks.getSourceIdentityStatus,
}));

import { writeUpdates } from "./writes.js";

const idTable = "mx_fe9gq_3op2g_qlugj_l9wvt_epv3n";
const session = { _id_table: idTable, _id_user: 17 };

function removeRows() {
  return writeUpdates(session, {
    updates: [
      {
        type: "remove_rows",
        id_table: idTable,
        id_rows: [3],
      },
    ],
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.connect.mockResolvedValue(mocks.client);
  mocks.client.query.mockResolvedValue({});
  mocks.getSourceIdentityStatus.mockResolvedValue({ valid: true, issues: [] });
});

describe("row removal extent updates", () => {
  it("skips spatial extent work for a tabular source", async () => {
    mocks.columnExists.mockResolvedValue(false);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(removeRows()).resolves.toBeUndefined();

    expect(mocks.deleteRowByGid).toHaveBeenCalledWith(idTable, [3]);
    expect(mocks.columnExists).toHaveBeenCalledWith("geom", idTable);
    expect(mocks.updateLayerExtentMeta).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();

    warn.mockRestore();
  });

  it("updates the spatial extent for a vector source", async () => {
    mocks.columnExists.mockResolvedValue(true);

    await expect(removeRows()).resolves.toBeUndefined();

    expect(mocks.updateLayerExtentMeta).toHaveBeenCalledWith(idTable, 17);
  });
});

describe("geometry update authorization", () => {
  function updateGeometry(sessionOverrides = {}, updateOverrides = {}) {
    return writeUpdates(
      {
        ...session,
        isGeometryEditAllowed: vi.fn().mockResolvedValue(true),
        ...sessionOverrides,
      },
      {
        updates: [
          {
            type: "update_geom",
            id_table: idTable,
            gid: 3,
            geom: { type: "Point", coordinates: [7, 46] },
            ...updateOverrides,
          },
        ],
      },
    );
  }

  it("rejects the write in its transaction when geometry editing is denied", async () => {
    const isGeometryEditAllowed = vi.fn().mockResolvedValue(false);

    await expect(
      updateGeometry({ isGeometryEditAllowed }),
    ).rejects.toThrow("Geometry editing is not allowed or is locked");

    expect(isGeometryEditAllowed).toHaveBeenCalledWith(mocks.client);
    expect(mocks.updateFeatureGeometry).not.toHaveBeenCalled();
    expect(mocks.client.query).toHaveBeenCalledWith("ROLLBACK");
  });

  it("rejects geometry updates targeting a different source", async () => {
    const isGeometryEditAllowed = vi.fn().mockResolvedValue(true);

    await expect(
      updateGeometry(
        { isGeometryEditAllowed },
        { id_table: "mx_vector_f_g_h_i_j" },
      ),
    ).rejects.toThrow("Update table does not match edit session");

    expect(isGeometryEditAllowed).not.toHaveBeenCalled();
    expect(mocks.updateFeatureGeometry).not.toHaveBeenCalled();
    expect(mocks.client.query).toHaveBeenCalledWith("ROLLBACK");
  });

  it("writes geometry after the transactional authorization check", async () => {
    const row = { gid: 3, __mx_geom_status: "valid" };
    const isGeometryEditAllowed = vi.fn().mockResolvedValue(true);
    mocks.updateFeatureGeometry.mockResolvedValue(row);

    await expect(
      updateGeometry({ isGeometryEditAllowed }),
    ).resolves.toBeUndefined();

    expect(isGeometryEditAllowed).toHaveBeenCalledWith(mocks.client);
    expect(mocks.updateFeatureGeometry).toHaveBeenCalledWith(
      idTable,
      3,
      { type: "Point", coordinates: [7, 46] },
      mocks.client,
    );
    expect(mocks.client.query).toHaveBeenCalledWith("COMMIT");
  });
});
