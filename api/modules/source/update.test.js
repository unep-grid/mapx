import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  client: {
    query: vi.fn(),
    release: vi.fn(),
  },
  getSourceEditPermission: vi.fn(),
  getSourceSettingsContext: vi.fn(),
  createSourceRevision: vi.fn(),
  removeSource: vi.fn(),
}));

vi.mock("#mapx/db", () => ({
  pgWrite: { connect: vi.fn(async () => mocks.client) },
}));
vi.mock("./permissions.js", () => ({
  getSourceEditPermission: mocks.getSourceEditPermission,
}));
vi.mock("./revision.js", () => ({
  createSourceRevision: mocks.createSourceRevision,
}));
vi.mock("#mapx/db_utils", () => ({ removeSource: mocks.removeSource }));
vi.mock("#mapx/authentication", () => ({
  validateTokenHandler: vi.fn(),
}));
vi.mock("./settings/index.js", () => {
  class SourceSettingsError extends Error {
    constructor(message, status = 400, details = null) {
      super(message);
      this.status = status;
      this.details = details;
    }
  }
  return {
    SourceSettingsError,
    getSourceSettingsContext: mocks.getSourceSettingsContext,
    sourceSettingsAllowedValues: {
      readers: ["publishers", "admins"],
      editors: ["publishers", "admins"],
      servicesByType: {
        vector: ["mx_download", "gs_ws_b", "mx_postgis_tiler"],
        join: ["mx_download"],
        tabular: ["mx_download"],
      },
    },
  };
});

import { reviseSource } from "./update.js";

const baseRequest = {
  method: "settings",
  idSource: "mx_vector_a_b_c_d_e",
  idUser: 7,
  idProject: "MX-PROJECT",
  changes: {
    readers: ["publishers"],
    editors: ["publishers"],
    services: ["mx_download"],
  },
};

describe("source settings revision policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.client.query.mockResolvedValue({ rows: [] });
    mocks.getSourceEditPermission.mockResolvedValue({
      allowed: true,
      roles: { publisher: true, root: false },
      source: { id: baseRequest.idSource },
    });
    mocks.getSourceSettingsContext.mockResolvedValue({
      source: { type: "vector", global: false },
      usage: { hasOtherProject: false, hasOtherEditor: false },
    });
    mocks.createSourceRevision.mockResolvedValue({ pid: 22 });
  });

  it("rejects service values not supported by the source type", async () => {
    await expect(
      reviseSource({
        ...baseRequest,
        changes: { ...baseRequest.changes, services: ["unknown_service"] },
      }),
    ).rejects.toThrow("Invalid source services");
    expect(mocks.createSourceRevision).not.toHaveBeenCalled();
    expect(mocks.client.query).toHaveBeenCalledWith("ROLLBACK");
  });

  it.each([undefined, null])(
    "rejects invalid readers before dependency policy checks (%s)",
    async (readers) => {
      mocks.getSourceSettingsContext.mockResolvedValue({
        source: { type: "vector", global: false },
        usage: { hasOtherProject: false, hasOtherEditor: true },
      });

      await expect(
        reviseSource({
          ...baseRequest,
          changes: { ...baseRequest.changes, readers },
        }),
      ).rejects.toMatchObject({
        message: "Invalid source readers",
        status: 400,
      });
      expect(mocks.getSourceSettingsContext).not.toHaveBeenCalled();
      expect(mocks.createSourceRevision).not.toHaveBeenCalled();
      expect(mocks.client.query).toHaveBeenCalledWith("ROLLBACK");
    },
  );

  it("rejects removing publisher access when another editor depends on it", async () => {
    mocks.getSourceSettingsContext.mockResolvedValue({
      source: { type: "vector", global: false },
      usage: { hasOtherProject: false, hasOtherEditor: true },
    });
    await expect(
      reviseSource({
        ...baseRequest,
        changes: { ...baseRequest.changes, readers: [] },
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("allows a valid update and creates one immutable revision", async () => {
    await expect(reviseSource(baseRequest)).resolves.toEqual({
      ok: true,
      idSource: baseRequest.idSource,
      pid: 22,
    });
    expect(mocks.createSourceRevision).toHaveBeenCalledOnce();
    expect(mocks.client.query).toHaveBeenCalledWith("COMMIT");
  });
});
