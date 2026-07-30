import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  editTable: vi.fn(),
}));

vi.mock("../../../source/edit/instance.js", () => ({
  editTable: mocks.editTable,
}));

vi.mock("./static.js", () => ({
  MapxResolversStatic: class {
    constructor(options) {
      this.opt = { ...options };
    }
  },
}));

vi.mock("../../../map_helpers/index.js", () => ({
  getView: vi.fn(),
  setProject: vi.fn(),
  getMapData: vi.fn(),
  getViewsListOrder: vi.fn(),
  getViewsListOpen: vi.fn(),
}));

vi.mock("../../../mx.js", () => ({
  events: {},
}));

vi.mock("../../../source/index.js", () => ({
  wsGetSourcesList: vi.fn(),
}));

import { MapxResolversApp } from "./app.js";

describe("MapxResolversApp table editor root", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards the injected root through every table editor resolver", async () => {
    const root = document.createElement("main");
    const destroy = vi.fn();
    const inspect = vi.fn(() => "result");
    mocks.editTable.mockResolvedValue({
      state: { ready: true },
      destroy,
      inspect,
    });
    const resolvers = new MapxResolversApp({ root });
    const untrustedRoot = document.createElement("aside");

    await expect(
      resolvers.table_editor_open({
        id_table: "mx_vector_a_b_c_d_e",
        root: untrustedRoot,
      }),
    ).resolves.toEqual({ ready: true });
    await expect(
      resolvers.table_editor_exec({
        id_table: "mx_vector_a_b_c_d_e",
        method: "inspect",
        root: untrustedRoot,
      }),
    ).resolves.toBe("result");
    await expect(
      resolvers.table_editor_close({
        id_table: "mx_vector_a_b_c_d_e",
        root: untrustedRoot,
      }),
    ).resolves.toEqual({ ready: true });

    expect(mocks.editTable).toHaveBeenNthCalledWith(1, {
      id_table: "mx_vector_a_b_c_d_e",
      root,
    });
    expect(mocks.editTable).toHaveBeenNthCalledWith(2, {
      id_table: "mx_vector_a_b_c_d_e",
      method: "inspect",
      root,
    });
    expect(mocks.editTable).toHaveBeenNthCalledWith(3, {
      id_table: "mx_vector_a_b_c_d_e",
      root,
    });
    expect(inspect).toHaveBeenCalledOnce();
    expect(destroy).toHaveBeenCalledOnce();
  });
});
