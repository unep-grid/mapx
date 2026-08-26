import { describe, expect, it, vi } from "vitest";
import {
  applyCountryHighlight,
  getCountryHighlightState,
} from "./country_highlight.js";

function createMap() {
  let appliedFilter;

  return {
    setFilter: vi.fn((_idLayer, filter) => {
      appliedFilter = filter;
    }),
    setLayoutProperty: vi.fn(),
    getFilter: vi.fn(() => appliedFilter),
  };
}

describe("country highlight", () => {
  it("shows the mask and excludes selected countries from it", () => {
    const map = createMap();
    const countries = ["COD", "CHN", "USA"];

    const result = applyCountryHighlight({ map, countries });

    const expectedFilter = [
      "any",
      ["==", ["get", "iso3code"], ""],
      ["!", ["in", ["get", "iso3code"], ["literal", countries]]],
    ];
    expect(map.setFilter).toHaveBeenCalledWith("country-code", expectedFilter);
    expect(map.setLayoutProperty).toHaveBeenCalledWith(
      "country-code",
      "visibility",
      "visible",
    );
    expect(result).toEqual({
      countries,
      filter: expectedFilter,
      visibility: "visible",
    });
    expect(map.setFilter.mock.invocationCallOrder[0]).toBeLessThan(
      map.setLayoutProperty.mock.invocationCallOrder[0],
    );
  });

  it.each([
    { countries: [] },
    { countries: null },
    { countries: { countries: ["CHE"] } },
  ])("hides the mask when the selection is $countries", ({ countries }) => {
    const state = getCountryHighlightState(countries);

    expect(state.filter).toEqual(["any"]);
    expect(state.visibility).toBe("none");
    expect(state.countries).toEqual([]);
  });

  it.each([{ countries: ["WLD"] }, { countries: ["WLD", "CHE"] }])(
    "treats WLD as no country clipping for $countries",
    ({ countries }) => {
      const map = createMap();

      const result = applyCountryHighlight({ map, countries });

      expect(result.filter).toEqual(["any"]);
      expect(result.visibility).toBe("none");
      expect(result.countries).toBe(countries);
      expect(map.setLayoutProperty).toHaveBeenCalledWith(
        "country-code",
        "visibility",
        "none",
      );
    },
  );

  it("restores the highlight after a theme hides the mask", () => {
    const map = createMap();
    const countries = ["CHE"];

    applyCountryHighlight({ map, countries });
    map.setLayoutProperty("country-code", "visibility", "none");
    applyCountryHighlight({ map, countries });

    expect(map.setLayoutProperty).toHaveBeenLastCalledWith(
      "country-code",
      "visibility",
      "visible",
    );
  });
});
