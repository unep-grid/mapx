import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getView: vi.fn(),
  getMap: vi.fn(),
  getLayerByPrefix: vi.fn(),
}));

vi.mock("./../mx.js", () => ({
  events: { fire: vi.fn() },
  settings: { valuesMap: { null: "$NULL" } },
}));

vi.mock("./../modules_loader_async", () => ({
  moduleLoad: vi.fn(),
}));

vi.mock("./../mx_helper_misc.js", () => ({
  date: vi.fn(),
  path: vi.fn(),
  debounce: vi.fn((fn) => fn),
}));

vi.mock("./../mx_helper_source_summary", () => ({
  getViewSourceSummary: vi.fn(),
}));

vi.mock("./index.js", () => ({
  getMap: mocks.getMap,
  getView: mocks.getView,
  getViewEl: vi.fn(),
  getLayerByPrefix: mocks.getLayerByPrefix,
}));

import {
  transparencyToOpacity,
  viewGetTransparencyValue,
  viewSetTextFilter,
} from "./view_filters.js";

function createView() {
  return {
    id: "MX-TEST",
    data: { attribute: { name: "cfr_label" } },
    _setFilter: vi.fn(),
  };
}

describe("viewSetTextFilter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falls back to the view styled attribute when none is given", () => {
    const view = createView();
    mocks.getView.mockReturnValue(view);

    const values = viewSetTextFilter({ idView: view.id, values: "High" });

    expect(values).toEqual(["High"]);
    expect(view._setFilter).toHaveBeenCalledWith({
      filter: ["any", ["==", ["get", "cfr_label"], "High"]],
      type: "text",
    });
  });

  it("uses the given attribute and maps null values", () => {
    const view = createView();
    mocks.getView.mockReturnValue(view);

    viewSetTextFilter({
      idView: view.id,
      attribute: "other",
      values: ["A", "$NULL"],
    });

    expect(view._setFilter).toHaveBeenCalledWith({
      filter: ["any", ["==", ["get", "other"], "A"], ["!has", "other"]],
      type: "text",
    });
  });
});

describe("transparency helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("converts transparency to a clamped opacity", () => {
    expect(transparencyToOpacity(0)).toBe(1);
    expect(transparencyToOpacity("30")).toBeCloseTo(0.7);
    expect(transparencyToOpacity(100)).toBe(0);
    expect(transparencyToOpacity(150)).toBe(0);
    expect(transparencyToOpacity(-5)).toBe(1);
  });

  it("rejects missing or non numeric transparency", () => {
    expect(() => transparencyToOpacity()).toThrow("Invalid transparency");
    expect(() => transparencyToOpacity("high")).toThrow("Invalid transparency");
  });

  it("reads transparency on the 0-100 scale without float noise", () => {
    mocks.getView.mockReturnValue({});
    expect(viewGetTransparencyValue({ idView: "MX-TEST" })).toBe(0);

    mocks.getView.mockReturnValue({ _opacity: 1 - 7 * 0.01 });
    expect(viewGetTransparencyValue({ idView: "MX-TEST" })).toBe(7);
  });
});
