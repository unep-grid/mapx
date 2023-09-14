import { ResolversBase } from "./base.js";
import { panels } from "./../../../mx.js";

/**
 * MapX resolvers for interacting with panels
 * @class
 * @extends ResolversBase
 */
export class MapxResolversPanels extends ResolversBase {
  /**
   * Applies a batch state to panels based on the provided configuration.
   * @param {Object} config - The configuration object that maps panel IDs to their desired state.
   * @returns {void}
   *
   * @example
   *
   * // Example usage :
   * mapx.ask('panels_batch',{
   *     "controls_panel": {
   *       "show": true,
   *       "open": true
   *     }
   *   }
   * });
   *
   */
  panels_batch(config) {
    return panels.batch(config);
  }

  /**
   * Retrieves current state.
   * @returns {Object} config - The configuration object that maps panel IDs to their desired state.
   *
   * @example
   *
   * // Example usage :
   * const state = await mapx.ask('panels_state');
   * console.log(state);
   * //  {
   * //  "controls_panel": {
   * //   "hide": false,
   * //   "open": true
   * //   }
   * //  }
   *
   */
  panels_state() {
    return panels.getState();
  }

  /**
   * Lists all registered panel IDs.
   * @returns {Promise<Array<string>>} A promise that resolves to an array of panel IDs.
   *
   * @example
   *
   * const panelIds = await mapx.ask('panels_list');
   * console.log(panelIds);  // Outputs: ['panel_1', 'panel_2', ...]
   *
   */
  panels_list() {
    return panels.list();
  }

  /**
   * Closes all registered panels.
   * @returns {void}
   */
  panels_close_all() {
    return panels.closeAll();
  }

  /**
   * Opens all registered panels.
   * @returns {void}
   */
  panels_open_all() {
    return panels.openAll();
  }

  /**
   * Hides all registered panels.
   * @returns {void}
   */
  panels_hide_all() {
    return panels.hideAll();
  }

  /**
   * Shows all registered panels.
   * @returns {void}
   */
  panels_show_all() {
    return panels.showAll();
  }

  /**
   * Checks if a panel is open.
   * @param {string} id - The panel ID.
   * @returns {Promise<boolean>} True if the panel is open, false otherwise.
   */
  panels_is_open(id) {
    return panels.isOpen(id);
  }

  /**
   * Checks if a panel is closed.
   * @param {string} id - The panel ID.
   * @returns {Promise<boolean>} True if the panel is closed, false otherwise.
   */
  panels_is_closed(id) {
    return panels.isClosed(id);
  }

  /**
   * Checks if a panel is visible.
   * @param {string} id - The panel ID.
   * @returns {Promise<boolean>} True if the panel is visible, false otherwise.
   */
  panels_is_visible(id) {
    return panels.isVisible(id);
  }

  /**
   * Checks if a panel is hidden.
   * @param {string} id - The panel ID.
   * @returns {Promise<boolean>} True if the panel is hidden, false otherwise.
   */
  panels_is_hidden(id) {
    return panels.isHidden(id);
  }
}
