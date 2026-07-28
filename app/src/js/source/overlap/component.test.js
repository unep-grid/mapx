import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const wsMock = vi.hoisted(() => ({
  emitAsync: vi.fn(),
  socket: {
    on: vi.fn(),
    off: vi.fn(),
  },
}));

const selectAutoMock = vi.hoisted(() => ({
  instances: [],
}));

vi.mock("../../settings", () => ({
  settings: {
    language: "en",
    project: { countries: ["CHE"] },
  },
}));

vi.mock("../../mx", () => ({
  ws: wsMock,
}));

vi.mock("../../language", () => ({
  getDictItem: vi.fn(async (keys) => (Array.isArray(keys) ? keys : keys)),
}));

vi.mock("../../mx_helper_misc", () => ({
  makeId: vi.fn(() => "overlap_request"),
}));

vi.mock("../../select_auto", () => ({
  SelectAuto: class {
    constructor(options) {
      this.target = options.target;
      this.type = options.type;
      this.config = options.config || {};
      this._value = this.type === "sources" ? [] : "";
      this.init = vi.fn(async () => {});
      this.update = vi.fn(async () => {});
      this.destroy = vi.fn();
      this.enable = vi.fn();
      this.disable = vi.fn();
      selectAutoMock.instances.push(this);
    }

    get value() {
      return this._value;
    }

    set value(value) {
      this._value = value;
    }
  },
}));

import { MxSourceOverlapElement } from "./component.js";

describe("MxSourceOverlapElement", () => {
  let component;

  beforeEach(async () => {
    vi.clearAllMocks();
    selectAutoMock.instances.length = 0;
    wsMock.emitAsync.mockResolvedValue({
      accepted: true,
      id_request: "overlap_request",
    });
    component = new MxSourceOverlapElement();
    await component.initialize();
    document.body.append(component);
  });

  afterEach(() => {
    component.remove();
  });

  it("configures ordered source and searchable country selectors", () => {
    expect(component.sourceSelect.config).toMatchObject({
      closeAfterSelect: false,
      maxItems: 3,
      plugins: ["remove_button", "drag_drop"],
      loader_config: {
        types: ["vector"],
        readable: true,
        add_global: true,
        add_views: true,
        include_dimensions: false,
        disable_missing: false,
        disable_large: false,
      },
    });
    expect(component.countrySelect.type).toBe("countries");
    expect(component.countrySelect.config).toEqual({
      loader_config: { update_on_init: false },
    });
    expect(component.countrySelect.value).toBe("CHE");
  });

  it("keeps the Tom Select item order in the request", async () => {
    component.sourceSelect.value = [
      "mx_vector_a_b_c_d_e",
      "mx_vector_f_g_h_i_j",
    ];

    await component.run();

    expect(wsMock.emitAsync).toHaveBeenCalledWith(
      "/client/source/overlap/run",
      expect.objectContaining({
        id_request: "overlap_request",
        mode: "area",
        layers: ["mx_vector_a_b_c_d_e", "mx_vector_f_g_h_i_j"],
        country: "CHE",
      }),
      10000,
    );
    expect(component.refs.run.disabled).toBe(true);
    expect(component.sourceSelect.disable).toHaveBeenCalled();
    expect(component.countrySelect.disable).toHaveBeenCalled();
  });

  it("requires and reveals a valid title only when creating a source", () => {
    component.sourceSelect.value = ["mx_vector_a_b_c_d_e"];
    expect(component.refs.titleWrapper.hidden).toBe(true);
    expect(component.refs.title.required).toBe(false);

    component.refs.modeArea.checked = false;
    component.refs.modeCreate.checked = true;
    component.updateMode();
    component.refs.title.value = "abc";

    expect(component.refs.titleWrapper.hidden).toBe(false);
    expect(component.refs.title.required).toBe(true);
    expect(component.validate()).toBe("source_title");

    component.refs.title.value = "Valid source";
    expect(component.validate()).toBe(null);
  });

  it("renders matching results and ignores other requests", () => {
    component.idRequest = "overlap_request";
    component.onResult({
      id_request: "another_request",
      success: true,
      mode: "area",
      area_m2: 5e6,
    });
    expect(component.refs.output.textContent).toBe("");

    component.onResult({
      id_request: "overlap_request",
      success: true,
      mode: "area",
      area_m2: 5e6,
      duration_ms: 42,
    });
    expect(component.refs.output.textContent).toContain("5");
    expect(component.refs.output.textContent).toContain("km²");
    expect(component.refs.outputWrapper.hidden).toBe(false);
    expect(component.refs.run.disabled).toBe(false);
    expect(component.sourceSelect.enable).toHaveBeenCalled();
  });

  it("clears prior output and logs before another run", async () => {
    component.sourceSelect.value = ["mx_vector_a_b_c_d_e"];
    component.setResult("Old result");
    component.appendLog("Old log");

    await component.run();

    expect(component.refs.output.textContent).toBe("");
    expect(component.refs.logs.textContent).not.toContain("Old log");
    expect(component.refs.logs.textContent).toContain("Request accepted");
    expect(component.refs.logsDetails.hidden).toBe(false);
    expect(component.refs.logsDetails.open).toBe(true);
  });

  it("re-enables the form when request acknowledgement fails", async () => {
    component.sourceSelect.value = ["mx_vector_a_b_c_d_e"];
    wsMock.emitAsync.mockRejectedValue(new Error("offline"));

    await component.run();

    expect(component.refs.run.disabled).toBe(false);
    expect(component.refs.output.textContent).toBe("offline");
    expect(component.refs.logs.textContent).toContain("offline");
  });

  it("destroys selectors and socket listeners when disconnected", () => {
    const sourceSelect = component.sourceSelect;
    const countrySelect = component.countrySelect;

    component.remove();

    expect(sourceSelect.destroy).toHaveBeenCalled();
    expect(countrySelect.destroy).toHaveBeenCalled();
    expect(wsMock.socket.off).toHaveBeenCalledWith(
      "/server/source/overlap/result",
      component.onResult,
    );
    expect(wsMock.socket.off).toHaveBeenCalledWith(
      "/server/source/overlap/progress",
      component.onProgress,
    );
  });
});
