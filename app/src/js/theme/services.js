import { ws } from "../mx";

/**
 * ThemeService class for backend communication
 * Handles CRUD operations via websocket for themes
 */
export class ThemeService {
  constructor() {}

  /**
   * Get a specific theme by ID
   * @param {string} idTheme - ID of theme to retrieve
   * @returns {Promise<Object>} Response with theme data
   */
  async get(idTheme) {
    const resp = await ws.emitAsync("/client/theme/get", { idTheme }, 10000);
    return this._handle_error(resp);
  }

  /**
   * List available themes (filtered by permissions)
   * @returns {Promise<Object>} Response with array of themes
   */
  async list(onlyPublic) {
    const resp = await ws.emitAsync(
      "/client/theme/list",
      { onlyPublic },
      10000,
    );
    return this._handle_error(resp);
  }

  /**
   * Update or create theme
   * @param {Object} theme - Theme object with updated values
   * @returns {Promise<Object>} Response from server
   */
  async save(data = { theme: {}, setAsProjectDefault: false }) {
    const resp = await ws.emitAsync("/client/theme/save", data, 10000);
    return this._handle_error(resp);
  }

  /**
   * Delete a theme
   * @param {string} idTheme - ID of theme to delete
   * @returns {Promise<Object>} Response from server
   */
  async delete(idTheme) {
    const resp = await ws.emitAsync("/client/theme/delete", { idTheme }, 10000);
    return this._handle_error(resp);
  }

  /**
   * Validate servers side
   * @param {Object} theme  - Theme object
   * @param {boolean} full  - full or paritial / meta validation
   * @returns
   */
  async validate(theme, full = false) {
    const resp = await ws.emitAsync(
      "/client/theme/validate",
      { theme, full },
      10000,
    );
    return this._handle_error(resp);
  }

  /**
   * Check if a theme id exists and is valid
   * @param {string} idTheme - ID of theme to check
   * @returns {Promise<Object>} Response from server {exists:true}
   */
  async validateId(idTheme) {
    const resp = await ws.emitAsync(
      "/client/theme/validate/id",
      { idTheme },
      10000,
    );
    return this._handle_error(resp);
  }

  async getAllIds() {
    const resp = await ws.emitAsync("/client/theme/list/ids", {}, 10000);
    return this._handle_error(resp);
  }

  /**
   * Get schema
   * @param {boolean} full  - full or paritial / meta validation
   * @returns schema
   */
  async getSchema(full) {
    const resp = await ws.emitAsync(
      "/client/theme/schema",
      { full },
      10000,
      true,
    );
    return this._handle_error(resp);
  }

  _handle_error(response) {
    if (response?.error) {
      throw new Error(`Response error: ${response.error}`);
    } else {
      return response;
    }
  }
}
