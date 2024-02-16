import { ws } from "./../../mx.js";
import { getLanguageCurrent } from "./../../language/index.js";

async function get(route, config) {
  const language = getLanguageCurrent();
  const data = { language };
  Object.assign(data, config);
  return ws.emitAsync(route, data);
}


/**
 * Retrieves a list of sources from the server.
 *
 * @param {Object} config - The configuration object for the request.
 * @param {string} config.language - The language setting, e.g., "en".
 * @param {boolean} config.editable
 * @param {boolean} config.readable
 * @param {boolean} config.add_global 
 * @param {boolean} config.add_views
 * @param {string[]} config.types - The types of sources to be retrieved. Can include "tabular", "vector", "raster", "join".
 * @returns {Promise<Object>} A Promise that resolves to the list of editable sources.
 */
export async function wsGetSourcesList(config) {
  return get("/client/source/get/list", config);
}

/**
 * Fetches columns of a specific source from the server.
 *
 * @param {Object} config - The configuration object for the request.
 * @param {number|null} config.id_source - The identifier of the source for which columns are to be retrieved.
 * @param {string[]} config.ignore_attr - Attributes to be ignored in the response, such as "geom", "gid", "_mx_valid".
 * @returns {Promise<Object>} A Promise that resolves to the list of source columns.
 */
export async function wsGetSourcesListColumns(config) {
  return get("/client/source/get/list/columns", config);
}
