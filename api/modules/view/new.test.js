import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  insertRow: vi.fn(async () => {}),
}));

vi.mock("#mapx/helpers", () => ({ clone: structuredClone }));
vi.mock("#mapx/db_utils", () => ({
  insertRow: mocks.insertRow,
  tableExists: vi.fn(async () => true),
  getColumnsNames: vi.fn(async () => ["gid", "geom", "name"]),
  getTableDimension: vi.fn(async () => ({ nrow: 10 })),
  getColumnsTypesSimple: vi.fn(async () => [
    { column_name: "name", column_type: "character varying" },
  ]),
}));
vi.mock("#mapx/source", () => ({
  getSourceSummary: vi.fn(async () => ({
    geom_type_table: [{ type: "point" }],
    attribute_stat: {
      type: "categorical",
      table: [{ value: "a" }],
      table_row_count: 10,
      table_row_count_all: 10,
    },
  })),
}));
vi.mock("@fxi/mx_valid", async (importOriginal) => ({
  ...(await importOriginal()),
  isView: () => true,
  isViewId: () => true,
  isProjectId: () => true,
}));

import { ioAddViewVt } from "./new.js";

const config = {
  idUser: 42,
  idProject: "MX-AAA-BBB-CCC-DDD-EEE",
  idSource: "mx_aaaaa_bbbbb",
  idView: "MX-AAAAA-BBBBB-CCCCC",
  title: "Places",
  create_view: true,
};

describe("ioAddViewVt", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates the view for HTTP uploads without a client socket", async () => {
    const res = { mx_emit_http: vi.fn() };

    await expect(ioAddViewVt(res, { ...config })).resolves.toBe(true);
    expect(mocks.insertRow).toHaveBeenCalledWith(
      expect.objectContaining({ id: config.idView }),
      "mx_views",
    );
  });

  it("pushes the view to the websocket client", async () => {
    const socket = { mx_emit_ws_response: vi.fn(async () => ({})) };

    await ioAddViewVt(socket, { ...config });
    expect(socket.mx_emit_ws_response).toHaveBeenCalledWith(
      "/server/view/add",
      { view: expect.objectContaining({ id: config.idView, _edit: true }) },
    );
  });
});
