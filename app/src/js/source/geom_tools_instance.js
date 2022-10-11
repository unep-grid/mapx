import { ws_tools } from "./../mx.js";

/**
 * Init geometry tools session
 * @param {Object} config
 * @param {String} config.id_table Id of the source
 * @param {Function} config.on_destroy Optional callback when destroy is called
 * @param {Boolean} config.test_mode Optional test mode switch 

 * @return {Object} instance
 */
export function geomTools(config) {
  return ws_tools.start("geometry_tools", config);
}
