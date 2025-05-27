import { ws } from "../mx";

/**
 * ThemeService class for backend communication
 * Handles CRUD operations via websocket for themes
 */
export class ThemeService {
  constructor() {}

  /**
   * Create a new theme on the server
   * @param {Object} theme - Theme object to create
   * @returns {Promise<Object>} Response from server
   */
  async create(theme) {
    return await ws.emitAsync("/client/theme/create", { theme }, 10000);
  }

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
  async list() {
    console.time("client theme list");
    const themes = await ws.emitAsync("/client/theme/list", {}, 10000);
    console.timeEnd("client theme list");
    return themes;
  }

  /**
   * Update an existing theme
   * @param {Object} theme - Theme object with updated values
   * @returns {Promise<Object>} Response from server
   */
  async update(theme) {
    return await ws.emitAsync("/client/theme/update", { theme }, 10000);
  }

  /**
   * Delete a theme
   * @param {string} themeId - ID of theme to delete
   * @returns {Promise<Object>} Response from server
   */
  async delete(themeId) {
    return await ws.emitAsync("/client/theme/delete", { themeId }, 10000);
  }
}
