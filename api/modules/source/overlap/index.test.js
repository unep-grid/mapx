import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  areaQuery: vi.fn(),
  getSourcesList: vi.fn(),
  getIdentity: vi.fn(),
  areLayersValid: vi.fn(),
  connect: vi.fn(),
  getColumnsNames: vi.fn(),
  getGeometryColumnInfo: vi.fn(),
  registerSource: vi.fn(),
}));

vi.mock("#mapx/db", () => ({
  pgWrite: {
    query: mocks.areaQuery,
    connect: mocks.connect,
  },
}));

vi.mock("#mapx/db_utils", () => ({
  analyzeSource: vi.fn(),
  areLayersValid: mocks.areLayersValid,
  getColumnsNames: mocks.getColumnsNames,
  registerSource: mocks.registerSource,
}));

vi.mock("#mapx/helpers", () => ({
  randomString: vi.fn(() => "mx_vector_k_l_m_n_o"),
}));

vi.mock("#mapx/mail", () => ({
  sendMailAuto: vi.fn(),
}));

vi.mock("../list/index.js", () => ({
  getSourcesList: mocks.getSourcesList,
}));

vi.mock("../attribute_table/geometry.js", () => ({
  getGeometryColumnInfo: mocks.getGeometryColumnInfo,
}));

vi.mock("../attribute_table/identity.js", () => ({
  getSourceIdentityStatus: mocks.getIdentity,
}));

import { ioSourceOverlap } from "./index.js";

const base = "mx_vector_a_b_c_d_e";

function makeSocket(overrides = {}) {
  return {
    session: {
      user_authenticated: true,
      user_roles: { publisher: true, group: ["publishers"] },
      user_id: 7,
      user_email: "editor@example.org",
      project_id: "MX-AAA-BBB-CCC-DDD-EEE",
      ...overrides,
    },
    mx_emit_ws: vi.fn(),
    mx_emit_ws_response: vi.fn(),
    notifyInfoMessage: vi.fn(),
    notifyInfoError: vi.fn(),
  };
}

describe("ioSourceOverlap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSourcesList.mockResolvedValue([{ id: base }]);
    mocks.getIdentity.mockResolvedValue({ valid: true, issues: [] });
    mocks.areLayersValid.mockResolvedValue([
      { id: base, title: "Base", valid: true },
    ]);
    mocks.areaQuery.mockResolvedValue({ rows: [{ area_m2: 1234 }] });
    mocks.getColumnsNames.mockResolvedValue(["gid", "name", "geom"]);
    mocks.getGeometryColumnInfo.mockResolvedValue({
      simpleType: "polygon",
      type: "MULTIPOLYGON",
      srid: 4326,
    });
  });

  it("uses session access and emits a PostGIS area result", async () => {
    const socket = makeSocket();
    const callback = vi.fn();

    await ioSourceOverlap(
      socket,
      {
        id_request: "request_1",
        mode: "area",
        layers: [base],
        country: "che",
        language: "en",
        idUser: 999,
        idProject: "MX-WRONG",
      },
      callback,
    );

    expect(callback).toHaveBeenCalledWith({
      accepted: true,
      id_request: "request_1",
    });
    expect(mocks.getSourcesList).toHaveBeenCalledWith(
      expect.objectContaining({
        idUser: 7,
        idProject: "MX-AAA-BBB-CCC-DDD-EEE",
        include_dimensions: false,
      }),
    );
    expect(mocks.areaQuery).toHaveBeenCalledWith(
      expect.objectContaining({ values: ["CHE"] }),
    );
    expect(socket.mx_emit_ws).toHaveBeenCalledWith(
      "/server/source/overlap/result",
      expect.objectContaining({
        id_request: "request_1",
        success: true,
        area_m2: 1234,
      }),
    );
  });

  it("rejects unreadable sources before running geometry queries", async () => {
    mocks.getSourcesList.mockResolvedValue([]);
    const socket = makeSocket();
    const callback = vi.fn();

    await ioSourceOverlap(
      socket,
      {
        id_request: "request_2",
        mode: "area",
        layers: [base],
        country: "CHE",
      },
      callback,
    );

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        accepted: false,
        error: "One or more overlap sources are not readable",
      }),
    );
    expect(mocks.areaQuery).not.toHaveBeenCalled();
  });

  it("acknowledges the standard source-added event after creating a source", async () => {
    const client = {
      query: vi.fn(async (query) => {
        const text = typeof query === "string" ? query : query.text;
        if (text.includes("SELECT count(*)")) {
          return { rows: [{ count: 1 }] };
        }
        if (text.includes("ST_Dump(geom)")) {
          return { rows: [{ dimensions: [1] }] };
        }
        return { rowCount: 1, rows: [] };
      }),
      release: vi.fn(),
    };
    mocks.connect.mockResolvedValue(client);
    const socket = makeSocket();
    const callback = vi.fn();

    await ioSourceOverlap(
      socket,
      {
        id_request: "request_create",
        mode: "create_source",
        layers: [base],
        country: "CHE",
        title: "Created intersection",
      },
      callback,
    );

    expect(socket.mx_emit_ws_response).toHaveBeenCalledWith(
      "/server/source/added",
      { idSource: "mx_vector_k_l_m_n_o" },
    );
    expect(socket.mx_emit_ws).not.toHaveBeenCalledWith(
      "/server/source/added",
      expect.anything(),
    );
    expect(client.query).toHaveBeenCalledWith("COMMIT");
    expect(client.query).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("geometry(MULTILINESTRING, 4326)"),
      }),
    );
    expect(client.release).toHaveBeenCalled();
  });

  it("rejects unauthenticated callers", async () => {
    const socket = makeSocket({ user_authenticated: false });
    const callback = vi.fn();

    await ioSourceOverlap(
      socket,
      {
        mode: "area",
        layers: [base],
        country: "CHE",
      },
      callback,
    );

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        accepted: false,
        error: "Overlap tool is not allowed",
      }),
    );
    expect(mocks.getSourcesList).not.toHaveBeenCalled();
  });
});
