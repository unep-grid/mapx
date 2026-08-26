import { isArray } from "../is_test/index.js";

const WORLD_COUNTRY_CODE = "WLD";

/**
 * Build the map state used to highlight a list of countries.
 *
 * @param {Array<string>} countries ISO 3166-1 alpha-3 country codes
 * @returns {{countries: Array<string>, filter: Array, visibility: string}}
 */
export function getCountryHighlightState(countries) {
  const normalizedCountries = isArray(countries) ? countries : [];
  const hasCountries = normalizedCountries.length > 0;
  const hasWorld = normalizedCountries.includes(WORLD_COUNTRY_CODE);
  const isHighlightActive = hasCountries && !hasWorld;
  const filter = ["any"];

  if (isHighlightActive) {
    filter.push(["==", ["get", "iso3code"], ""]);
    filter.push([
      "!",
      ["in", ["get", "iso3code"], ["literal", normalizedCountries]],
    ]);
  }

  return {
    countries: normalizedCountries,
    filter,
    visibility: isHighlightActive ? "visible" : "none",
  };
}

/**
 * Apply the country highlight filter and visibility to a map layer.
 *
 * @param {object} options Options
 * @param {object} options.map MapLibre map instance
 * @param {string} [options.idLayer] Country mask layer id
 * @param {Array<string>} [options.countries] ISO 3166-1 alpha-3 country codes
 * @returns {{countries: Array<string>, filter: Array, visibility: string}}
 */
export function applyCountryHighlight(options) {
  const { map, idLayer = "country-code", countries = [] } = options;
  const state = getCountryHighlightState(countries);

  // Set the filter before showing the layer to avoid briefly masking the world.
  map.setFilter(idLayer, state.filter);
  map.setLayoutProperty(idLayer, "visibility", state.visibility);

  return {
    ...state,
    filter: map.getFilter(idLayer),
  };
}
