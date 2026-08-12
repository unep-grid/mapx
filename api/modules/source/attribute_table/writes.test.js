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
  updateFeatureGeometry: vi.fn(),
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
