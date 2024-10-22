import commonloc from "./locations.json";
import { isArray } from "./../is_test/index.js";
import { getDictItem, getDictItemId } from "./../language";
import { getMap, getBoundsArray, fitMaxBounds } from "./../map_helpers/index.js";
import { getArrayDiff } from "./../array_stat";
import { settings } from "../settings";

// Default configuration for instance-level settings
const CONFIG = {
  defaultCode: ["WLD"],
  defaultBounds: [-180, 80, 180, -80],
  fitOptions: {
    animate: true,
  },
  maxResults: 5,  // Instance-specific search limit
};

export class CommonLoc {
  constructor(config = {}) {
    this.config = { ...CONFIG, ...config };
    this._map = getMap();
  }

  /**
   * Fits map to bounds based on location code or name
   * @param {Object} options
   * @param {String} options.id - Map id
   * @param {String|Array<string>} options.code - ISO3 or M49 code
   * @param {String|Array<string>} options.name - Country/region name
   * @param {Object} options.param - Animation options
   * @returns {Promise<Array<number>|null>} Bounds array [west, south, east, north]
   * @throws {Error} If map instance not available
   */
  async fitBbox(options = {}) {
    if (!this._map) {
      throw new Error("Map instance not available");
    }

    const params = {
      ...this.config.fitOptions,
      ...options.param,
    };

    const bbox = await this.getBbox(options);
    if (!bbox) return null;

    const currentBounds = getBoundsArray();
    const hasChanged = getArrayDiff(currentBounds, bbox).length > 0;

    if (!hasChanged) return bbox;

    const fitted = fitMaxBounds(bbox, params);
    if (fitted) {
      await this._map.once("moveend");
    }

    return bbox;
  }

  /**
   * Gets bounding box for given location(s)
   * @param {Object} options
   * @param {String|Array<string>} options.code - ISO3 or M49 code
   * @param {String|Array<string>} options.name - Country/region name
   * @returns {Promise<Array<number>|null>} Bounds array [west, south, east, north]
   */
  async getBbox(options = {}) {
    const {
      code = this.config.defaultCode,
      name = null,
    } = options;

    try {
      let codes = code;

      if (name) {
        codes = [];
        const names = isArray(name) ? name : [name];
        for (const n of names) {
          const id = await getDictItemId(n, settings.language); // Uses dynamic global language
          if (id) codes.push(id);
        }
      }

      codes = isArray(codes) ? codes : [codes];
      if (codes.length === 0) return null;

      const bounds = [...this.config.defaultBounds];

      for (const c of codes) {
        const loc = commonloc[c];
        if (!loc) {
          console.warn(`Location not found: ${c}. Available locs:`);
          console.table(await this.getTableCodes());
          return null;
        }

        bounds[0] = Math.max(loc[0], bounds[0]); // west
        bounds[1] = Math.min(loc[1], bounds[1]); // south
        bounds[2] = Math.min(loc[2], bounds[2]); // east
        bounds[3] = Math.max(loc[3], bounds[3]); // north
      }

      return bounds;
    } catch (error) {
      console.error("Error getting bbox:", error);
      return null;
    }
  }

  /**
   * Search for locations based on query string
   * @param {String} query - Search query
   * @param {Object} options - Search options
   * @param {Number} options.limit - Max number of results
   * @returns {Promise<Array<GeoJSON.Feature>>} Array of GeoJSON features
   */
  async geolocate(query, options = {}) {
    if (!query?.trim()) return [];

    const { limit = this.config.maxResults } = options;

    try {
      const searchQuery = query.toLowerCase().trim();
      const locations = await this.getTableCodes();

      const results = locations
        .map((loc) => ({
          score: this._getSearchScore(searchQuery, loc),
          feature: this._createGeoFeature(loc),
        }))
        .filter((result) => result.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((r) => r.feature);

      return results;
    } catch (error) {
      console.error("Error in geolocate:", error);
      return [];
    }
  }

  /**
   * Gets table of location codes and names
   * @returns {Promise<Array<{code: string, name: string}>>} Array of {code, name} objects
   * @private
   */
  async getTableCodes() {
    try {
      const codes = Object.keys(commonloc);
      const table = await Promise.all(
        codes.map(async (code) => ({
          code,
          name: await getDictItem(code, settings.language), // Uses dynamic global language
        }))
      );
      return table;
    } catch (error) {
      console.error("Error getting table codes:", error);
      return [];
    }
  }
  
/**
 * Gets list of available location codes
 * @returns {Array<string>} Array of location codes
 */
getListCodes() {
  return Object.keys(commonloc);
}

  /**
   * Calculate search relevance score
   * @private
   */
  _getSearchScore(query, location) {
    const score = {
      exact: 100,
      partial: 50,
      start: 25,
    };

    let totalScore = 0;
    const testStrings = [location.code, location.name];

    for (const str of testStrings) {
      const testStr = str.toLowerCase();
      if (testStr === query) totalScore += score.exact;
      if (testStr.includes(query)) totalScore += score.partial;
      if (testStr.startsWith(query)) totalScore += score.start;
    }

    return totalScore;
  }

  /**
   * Create GeoJSON feature from location
   * @private
   */
  _createGeoFeature(location) {
    const bbox = commonloc[location.code];

    return {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [bbox[0], bbox[1]], // sw
            [bbox[0], bbox[3]], // nw
            [bbox[2], bbox[3]], // ne
            [bbox[2], bbox[1]], // se
            [bbox[0], bbox[1]], // sw (close polygon)
          ],
        ],
      },
      properties: {
        code: location.code,
        name: location.name,
      },
    };
  }
}
