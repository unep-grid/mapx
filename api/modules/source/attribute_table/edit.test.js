import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  acquireLock: vi.fn(),
  getLock: vi.fn(),
  getSourceIdentityStatus: vi.fn(),
  isSocketAllowedToEditGeometry: vi.fn(),
  isSocketAllowedToEditSource: vi.fn(),
  isUserAllowedToEditSource: vi.fn(),
  tableExists: vi.fn(),
}));

vi.mock("#mapx/db_utils", () => ({
  tableExists: mocks.tableExists,
  columnExists: vi.fn(),
  getColumnsTypesSimple: vi.fn(),
  getLayerTitle: vi.fn(),
  getLayerUsedAttributes: vi.fn(),
  getTableDimension: vi.fn(),
  isLayerValid: vi.fn(),
  sanitizeUpdates: vi.fn(),
  getMxSourceData: vi.fn(),
}));
vi.mock("#mapx/source", () => ({ getSourceAttributeTable: vi.fn() }));
vi.mock("#mapx/helpers", () => ({ randomString: vi.fn(() => "session") }));
vi.mock("#mapx/view", () => ({
  ioUpdateDbViewsAltStyleBySource: vi.fn(),
  getViewsTableBySource: vi.fn(),
}));
vi.mock("./locks.js", () => ({
  acquireLock: mocks.acquireLock,
  getLock: mocks.getLock,
  isLockOwner: vi.fn(),
  releaseLock: vi.fn(),
  refreshLock: vi.fn(),
}));
vi.mock("./permissions.js", () => ({
  isSocketAllowedToEditGeometry: mocks.isSocketAllowedToEditGeometry,
  isSocketAllowedToEditSource: mocks.isSocketAllowedToEditSource,
  isUserAllowedToEditSource: mocks.isUserAllowedToEditSource,
}));
vi.mock("./writes.js", () => ({ writeUpdates: vi.fn() }));
vi.mock("./geometry.js", () => ({
  addGeometryStatusToRows: vi.fn(),
  cols: { geom: "geom" },
  getFeatureByGid: vi.fn(),
  getGeometryColumnInfo: vi.fn(),
  getGeometryTypeSimple: vi.fn(),
}));
vi.mock("./identity.js", () => ({
  getSourceIdentityStatus: mocks.getSourceIdentityStatus,
  repairSourceIdentity: vi.fn(),
}));
vi.mock("#mapx/db", () => ({ pgWrite: { query: vi.fn() } }));
vi.mock("../revision.js", () => ({ createSourceRevision: vi.fn() }));

import { EditTableSession, ioEditSourceStatus } from "./edit.js";

const idTable = "mx_vector_a_b_c_d_e";

function createSocket() {
  return {
    session: {
      user_authenticated: true,
      user_id: 17,
      project_id: "MX-AAA-BBB-CCC-DDD-EEE",
      user_roles: { developer: true },
    },
    server: {},
  };
}

describe("geometry edit API gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not acquire a geometry lock when current permission is denied", async () => {
    mocks.isSocketAllowedToEditGeometry.mockResolvedValue(false);
    const edit = new EditTableSession(createSocket(), { id_table: idTable });
    edit._id_table = idTable;
    edit._id_session = "session";

    await expect(edit.acquireGeometryEditLock({ gid: 3 })).resolves.toBe(false);
    expect(mocks.acquireLock).not.toHaveBeenCalled();
  });

  it("acquires a geometry lock for an authorized developer", async () => {
    mocks.isSocketAllowedToEditGeometry.mockResolvedValue(true);
    mocks.acquireLock.mockResolvedValue({
      locked: true,
      id_session: "session",
    });
    const edit = new EditTableSession(createSocket(), { id_table: idTable });
    edit._id_table = idTable;
    edit._id_session = "session";
    const update = { gid: 3 };

    await expect(edit.acquireGeometryEditLock(update)).resolves.toBe(true);
    expect(mocks.acquireLock).toHaveBeenCalledWith(
      expect.objectContaining({
        idTable,
        scope: "geometry",
        idSession: "session",
        gid: 3,
      }),
    );
    expect(update.lock).toEqual({ locked: true, id_session: "session" });
  });

  it("reports current geometry permission in source edit status", async () => {
    mocks.tableExists.mockResolvedValue(true);
    mocks.isSocketAllowedToEditSource.mockResolvedValue(true);
    mocks.isSocketAllowedToEditGeometry.mockResolvedValue(false);
    mocks.getLock.mockResolvedValue(null);
    mocks.getSourceIdentityStatus.mockResolvedValue({ valid: true });
    const callback = vi.fn();

    await ioEditSourceStatus(createSocket(), { id_table: idTable }, callback);

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        id_table: idTable,
        geometryEditAllowed: false,
      }),
    );
  });

  it("authorizes table editing with the current socket project", async () => {
    mocks.isUserAllowedToEditSource.mockResolvedValue(true);
    const edit = new EditTableSession(createSocket(), { id_table: idTable });
    edit._id_table = idTable;

    await expect(edit.isAllowed()).resolves.toBe(true);
    expect(mocks.isUserAllowedToEditSource).toHaveBeenCalledWith({
      idTable,
      isAuthenticated: true,
      idUser: 17,
      idProject: "MX-AAA-BBB-CCC-DDD-EEE",
    });
  });
});
