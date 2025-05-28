import { ws } from "../mx";

/**
 * ThemeService class for backend communication
 * Handles CRUD operations via websocket for themes
 */
export class ThemeService {
  constructor() {}

  /**
   * Get a specific theme by ID
   * @param {string} themeId - ID of theme to retrieve
   * @returns {Promise<Object>} Response with theme data
   */
  async get(themeId) {
    return await ws.emitAsync("/client/theme/get", { themeId }, 10000);
  }

  /**
   * List available themes (filtered by permissions)
   * @returns {Promise<Object>} Response with array of themes
   */
  async list(onlyPublic) {
    const themes = await ws.emitAsync(
      "/client/theme/list",
      { onlyPublic },
      10000,
    );
    return themes;
  }

  /**
   * Update or create theme
   * @param {Object} theme - Theme object with updated values
   * @returns {Promise<Object>} Response from server
   */
  async save(theme) {
    return await ws.emitAsync("/client/theme/save", { theme }, 10000);
  }

  /**
   * Delete a theme
   * @param {string} themeId - ID of theme to delete
   * @returns {Promise<Object>} Response from server
   */
  async delete(idTheme) {
    return await ws.emitAsync("/client/theme/delete", { idTheme }, 10000);
  }

  /**
   * Validate servers side
   * @param {Object} theme  - Theme object
   * @param {boolean} full  - full or paritial / meta validation
   * @returns
   */
  async validate(theme, full = false) {
    return await ws.emitAsync("/client/theme/validate", { theme, full }, 10000);
  }

  /**
   * Get schema
   * @param {boolean} full  - full or paritial / meta validation
   * @returns schema
   */
  async getSchema(full) {
    const schema = await ws.emitAsync(
      "/client/theme/get/schema",
      { full },
      10000,
      true,
    );
    return schema;
  }
}
