import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getLanguageCurrent: vi.fn(),
  getLanguagesAll: vi.fn(),
  updateLanguage: vi.fn(),
  setHighlightedCountries: vi.fn(),
  zoomToViewId: vi.fn(),
  zoomToViewIdVisible: vi.fn(),
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
}));

vi.mock("../../../mx.js", () => ({
  settings: {},
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
