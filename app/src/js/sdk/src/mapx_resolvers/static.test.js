import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getLanguageCurrent: vi.fn(),
  getLanguagesAll: vi.fn(),
  updateLanguage: vi.fn(),
  setHighlightedCountries: vi.fn(),
  zoomToViewId: vi.fn(),
  zoomToViewIdVisible: vi.fn(),
  getViewJson: vi.fn(),
  viewSetOpacity: vi.fn(),
  viewSetTextFilter: vi.fn(),
  viewSetNumericFilter: vi.fn(),
  viewSetTimeFilter: vi.fn(),
  spatialDataToView: vi.fn(),
  viewsListAddSingle: vi.fn(),
  settings: { mode: { static: true } },
}));

vi.mock("../../../language/index.js", () => ({
  getLanguageCurrent: mocks.getLanguageCurrent,
  getLanguagesAll: mocks.getLanguagesAll,
  updateLanguage: mocks.updateLanguage,
}));

vi.mock("../../../map_helpers/index.js", () => ({
  setHighlightedCountries: mocks.setHighlightedCountries,
  zoomToViewId: mocks.zoomToViewId,
  zoomToViewIdVisible: mocks.zoomToViewIdVisible,
  getViewJson: mocks.getViewJson,
}));

vi.mock("../../../map_helpers/view_filters.js", async (importOriginal) => ({
  ...(await importOriginal()),
  viewSetOpacity: mocks.viewSetOpacity,
  viewSetTextFilter: mocks.viewSetTextFilter,
  viewSetNumericFilter: mocks.viewSetNumericFilter,
  viewSetTimeFilter: mocks.viewSetTimeFilter,
}));

vi.mock("../../../mx_helper_map_dragdrop.js", () => ({
  spatialDataToView: mocks.spatialDataToView,
}));

vi.mock("../../../views_list_manager", () => ({
  viewsListAddSingle: mocks.viewsListAddSingle,
}));

vi.mock("../../../mx.js", () => ({
  settings: mocks.settings,
  highlighter: {},
  spotlight: {},
  theme: {},
  ws: {},
  controls: {},
  panels: {},
}));

import { MapxResolversStatic } from "./static.js";

describe("MapxResolversStatic basics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists the public zoom resolvers", () => {
    const methods = MapxResolversStatic.prototype.get_sdk_methods();

    expect(methods).toContain("zoom_to_view_rendered_features");
    expect(methods).toContain("zoom_to_view_extent");
  });

  it("delegates zoom requests to the matching map helper", async () => {
    const options = { idView: "MX-TEST" };
    mocks.zoomToViewIdVisible.mockResolvedValue("rendered");
    mocks.zoomToViewId.mockResolvedValue("extent");

    await expect(
      MapxResolversStatic.prototype.zoom_to_view_rendered_features(options),
    ).resolves.toBe("rendered");
    await expect(
      MapxResolversStatic.prototype.zoom_to_view_extent(options),
    ).resolves.toBe("extent");
    expect(mocks.zoomToViewIdVisible).toHaveBeenCalledWith(options);
    expect(mocks.zoomToViewId).toHaveBeenCalledWith(options);
  });

  it("supports zooming all rendered MapX views without options", async () => {
    mocks.zoomToViewIdVisible.mockResolvedValue(true);

    await expect(
      MapxResolversStatic.prototype.zoom_to_view_rendered_features(),
    ).resolves.toBe(true);
    expect(mocks.zoomToViewIdVisible).toHaveBeenCalledWith({});
  });

  it("gets, lists, and updates languages through the language boundary", () => {
    mocks.getLanguageCurrent.mockReturnValue("fr");
    mocks.getLanguagesAll.mockReturnValue(["en", "fr"]);
    mocks.updateLanguage.mockReturnValue(true);

    expect(MapxResolversStatic.prototype.get_language()).toBe("fr");
    expect(MapxResolversStatic.prototype.get_languages()).toEqual(["en", "fr"]);
    expect(MapxResolversStatic.prototype.set_language({ lang: "en" })).toBe(
      true,
    );
    expect(mocks.updateLanguage).toHaveBeenCalledWith("en");
  });

  it("keeps the direct country array contract", () => {
    const countries = ["COD", "CHN", "USA"];
    const filter = ["any"];
    mocks.setHighlightedCountries.mockReturnValue(filter);

    expect(MapxResolversStatic.prototype.set_country_highlight(countries)).toBe(
      filter,
    );
    expect(mocks.setHighlightedCountries).toHaveBeenCalledWith({ countries });
  });
});

describe("MapxResolversStatic layer filters", () => {
  const {
    set_view_layer_filter_text,
    set_view_layer_filter_numeric,
    set_view_layer_filter_time,
  } = MapxResolversStatic.prototype;

  /**
   * Resolver stub in app mode, the attribute test result given
   */
  function appResolver(isStyleAttribute = true) {
    mocks.settings.mode = { static: false, app: true };
    return {
      _apply_filter_layer_select: vi.fn(),
      _apply_filter_layer_slider: vi.fn(),
      _is_view_style_attribute: vi.fn(() => isStyleAttribute),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    mocks.settings.mode = { static: true };
  });

  it("sets the view search box values in app mode", async () => {
    const rslv = appResolver();

    await set_view_layer_filter_text.call(rslv, {
      idView: "MX-TEST",
      values: ["A"],
    });

    expect(rslv._apply_filter_layer_select).toHaveBeenCalledWith(
      "searchBox",
      "setValue",
      { idView: "MX-TEST", value: ["A"] },
    );
  });

  it("filters text directly in static mode", async () => {
    await set_view_layer_filter_text.call(
      {},
      { idView: "MX-TEST", values: ["A"] },
    );

    expect(mocks.viewSetTextFilter).toHaveBeenCalledWith(
      expect.objectContaining({ idView: "MX-TEST", values: ["A"] }),
    );
  });

  it("maps the deprecated text value option to values", async () => {
    await set_view_layer_filter_text.call(
      {},
      { idView: "MX-TEST", value: ["A"] },
    );

    expect(mocks.viewSetTextFilter).toHaveBeenCalledWith(
      expect.objectContaining({ values: ["A"] }),
    );
  });

  it("filters text directly in app mode for another attribute", async () => {
    const rslv = appResolver(false);

    await set_view_layer_filter_text.call(rslv, {
      idView: "MX-TEST",
      attribute: "other",
      values: ["A"],
    });

    expect(rslv._apply_filter_layer_select).not.toHaveBeenCalled();
    expect(mocks.viewSetTextFilter).toHaveBeenCalledWith(
      expect.objectContaining({ attribute: "other", values: ["A"] }),
    );
  });

  it("sets the view numeric slider range in app mode", async () => {
    const rslv = appResolver();

    await set_view_layer_filter_numeric.call(rslv, {
      idView: "MX-TEST",
      from: 1,
      to: 5,
    });

    expect(rslv._apply_filter_layer_slider).toHaveBeenCalledWith(
      "numericSlider",
      "set",
      { idView: "MX-TEST", value: [1, 5] },
    );
  });

  it("maps the deprecated numeric value option to from and to", async () => {
    const rslv = appResolver();

    await set_view_layer_filter_numeric.call(rslv, {
      idView: "MX-TEST",
      value: [5, 1],
    });

    expect(rslv._apply_filter_layer_slider).toHaveBeenCalledWith(
      "numericSlider",
      "set",
      { idView: "MX-TEST", value: [1, 5] },
    );
  });

  it("filters numeric directly in app mode for another attribute", async () => {
    const rslv = appResolver(false);

    await set_view_layer_filter_numeric.call(rslv, {
      idView: "MX-TEST",
      attribute: "other",
      from: 1,
      to: 5,
    });

    expect(rslv._apply_filter_layer_slider).not.toHaveBeenCalled();
    expect(mocks.viewSetNumericFilter).toHaveBeenCalledWith(
      expect.objectContaining({ attribute: "other", from: 1, to: 5 }),
    );
  });

  it("sets the view time slider range in app mode", async () => {
    const rslv = appResolver();

    await set_view_layer_filter_time.call(rslv, {
      idView: "MX-TEST",
      from: 1000,
      to: 2000,
    });

    expect(rslv._apply_filter_layer_slider).toHaveBeenCalledWith(
      "timeSlider",
      "set",
      { idView: "MX-TEST", value: [1000, 2000] },
    );
  });

  it("filters time directly in static mode", async () => {
    const opt = { idView: "MX-TEST", from: 1000, to: 2000 };

    await set_view_layer_filter_time.call({}, opt);

    expect(mocks.viewSetTimeFilter).toHaveBeenCalledWith(opt);
  });
});

describe("MapxResolversStatic transparency (static mode)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("converts the 0-100 transparency to a layer opacity", async () => {
    await MapxResolversStatic.prototype.set_view_layer_transparency({
      idView: "MX-TEST",
      value: 30,
    });

    expect(mocks.viewSetOpacity).toHaveBeenCalledWith({
      idView: "MX-TEST",
      opacity: expect.closeTo(0.7),
    });
  });

  it("keeps the deprecated opacity option when no value is given", async () => {
    await MapxResolversStatic.prototype.set_view_layer_transparency({
      idView: "MX-TEST",
      opacity: 0.5,
    });

    expect(mocks.viewSetOpacity).toHaveBeenCalledWith({
      idView: "MX-TEST",
      opacity: 0.5,
    });
  });

  it("rejects an invalid transparency", async () => {
    await expect(
      MapxResolversStatic.prototype.set_view_layer_transparency({
        idView: "MX-TEST",
      }),
    ).rejects.toThrow("Invalid transparency");
    expect(mocks.viewSetOpacity).not.toHaveBeenCalled();
  });
});

describe("MapxResolversStatic geojson views", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.spatialDataToView.mockResolvedValue({ id: "MX-GJ-TEST" });
    mocks.getViewJson.mockReturnValue({ id: "MX-GJ-TEST" });
  });

  it("zooms to the new layer by default", async () => {
    await MapxResolversStatic.prototype.view_geojson_create({ data: {} });

    expect(mocks.spatialDataToView).toHaveBeenCalledWith(
      expect.objectContaining({ zoomToView: true }),
    );
  });

  it("lets callers keep the camera with zoomToView false", async () => {
    await MapxResolversStatic.prototype.view_geojson_create({
      data: {},
      zoomToView: false,
    });

    expect(mocks.spatialDataToView).toHaveBeenCalledWith(
      expect.objectContaining({ zoomToView: false }),
    );
  });
});
