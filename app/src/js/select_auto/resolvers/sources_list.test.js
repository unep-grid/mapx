import { beforeEach, describe, expect, it, vi } from "vitest";

const wsGetSourcesList = vi.hoisted(() => vi.fn());

vi.mock("../../source/utils/index.js", () => ({
  wsGetSourcesList,
}));

vi.mock("../../el_mapx", () => ({
  el: vi.fn(),
}));

import { config } from "./sources_list.js";

describe("sources SelectAuto resolver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("forwards the dimension option and supports metadata-only source rows", async () => {
    const source = {
      id: "mx_vector_a_b_c_d_e",
      title: "Source",
      abstract: "",
      type: "vector",
      views: ["Related view"],
    };
    wsGetSourcesList.mockResolvedValue({ list: [source] });
    const tom = {
      settings: {
        loader_config: {
          ...config.loader_config,
          readable: true,
          add_views: true,
          include_dimensions: false,
          disable_missing: false,
          disable_large: false,
        },
      },
      control_input: {},
      disable: vi.fn(),
      enable: vi.fn(),
      addOptions: vi.fn(),
      refreshOptions: vi.fn(),
    };

    await config.onInitialize.call(tom);
    await tom._update();

    expect(wsGetSourcesList).toHaveBeenCalledWith(
      expect.objectContaining({
        readable: true,
        add_views: true,
        include_dimensions: false,
      }),
    );
    expect(source._disabled).toBe(false);
    expect(tom.addOptions).toHaveBeenCalledWith([source]);
  });
});
