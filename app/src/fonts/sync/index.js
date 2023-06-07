// Import required libraries
import fs from "fs/promises";
import path from "path";
import axios from "axios";

/**
 * FontSync class for synchronizing local TrueType font files with Mapbox's font API.
 */
export class FontSync {
  /**
   * Creates a new FontSync instance.
   * @param {Object} config - Configuration object.
   * @param {string} config.token - Mapbox API access token with write access to fonts.
   * @param {string} config.folderFont - Path to the local folder containing TrueType font files.
   * @param {string} config.folderCss - Path to the local folder containing css font-face files.
   * @param {string} [config.user="mapbox"] - Mapbox user account (default is "mapbox").
   */
  constructor(config) {
    this.accessToken = config.token;
    if (!this.accessToken) {
      throw new Error("Mapbox token required with write access to fonts");
    }
    this.folderFont = config.folderFont;
    this.folderCss = config.folderCss;
    this.user = config.user || "mapbox";
    this.cacheFile = path.join(this.folderFont, "font_cache.json");
  }

  /**
   * Lists all the fonts available in the Mapbox account.
   * @returns {Promise<string[]>} - Promise that resolves to an array of font names.
   */
  async listMapboxFonts() {
    const response = await axios.get(
      `https://api.mapbox.com/fonts/v1/${this.user}?access_token=${this.accessToken}`
    );
    return response.data;
  }

  /**
   * Lists all the local TrueType font files in the specified folder and its subfolders.
   * @returns {Promise<Object[]>} - Promise that resolves to an array of objects containing font path and name.
   */
  async listLocalFonts() {
    const files = await getFilesRecursively(this.folderFont);
    return files.map((file) => {
      return {
        path: file,
        name: path.parse(file).name,
      };
    });
  }

  /**
   * Uploads a TrueType font file to Mapbox.
   * @param {string} fontPath - Path to the local TrueType font file.
   * @returns {Promise<Object>} - Promise that resolves to an object containing the uploaded font metadata and local file path.
   */
  async uploadFontToMapbox(fontPath) {
    const fontData = await fs.readFile(fontPath);
    const res = await axios.post(
      `https://api.mapbox.com/fonts/v1/${this.user}?access_token=${this.accessToken}`,
      fontData,
      {
        headers: {
          "Content-Type": "application/x-font-ttf",
        },
      }
    );
    /**
     * res.data returns an object like :
     * {
     *  family_name: 'Libre Baskerville',
     *  style_name: 'Bold',
     *  owner: '<username>',
     *  visibility: 'private'
     * }
     */
    const out = Object.assign(
      {
        path: path.relative(this.folderFont, fontPath),
      },
      res.data
    );
    return out;
  }

  /**
   * Deletes a font from the Mapbox account using the font's combined family and style name.
   * @param {string} fontName - The combined font family and style name to delete.
   * @returns {Promise} - Promise that resolves when the font is deleted.
   */
  async deleteFontFromMapbox(fontName) {
    await axios.delete(
      `https://api.mapbox.com/fonts/v1/${this.user}/${fontName}?access_token=${this.accessToken}`
    );
  }

  /**
   * Update the css font-face files from google api
   */
  async syncCss() {
    const fontCache = await this.loadFontCache();
    const families = new Set();

    for (const font of fontCache) {
      families.add(font.family_name);
    }

    for (const family of families) {
      const cssFilename = `${family}.css`;
      const cssFilePath = path.join(this.folderCss, cssFilename);

      try {
        await fs.access(cssFilePath);
        console.log(`File ${cssFilename} already exists. Skipping...`);
      } catch (err) {
        if (err.code === "ENOENT") {
          const { data } = await axios.get(
            `https://fonts.googleapis.com/css?family=${encodeURIComponent(
              family
            )}`
          );

          await fs.writeFile(cssFilePath, data, "utf-8");
        } else {
          throw err;
        }
      }
    }
  }

  /**
   * Synchronizes the local TrueType font files with the Mapbox account.
   * Uploads missing fonts and deletes fonts not present in the local folder.
   * @returns {Promise} - Promise that resolves when synchronization is complete.
   */
  async syncFonts() {
    const localFonts = await this.listLocalFonts();
    const fontCache = await this.loadFontCache();

    for (const font of localFonts) {
      const pathRel = path.relative(this.folderFont, font.path);
      if (!fontCache.some((cachedFont) => cachedFont.path === pathRel)) {
        console.log(`Uploading ${font.name}`);
        const uploadedFont = await this.uploadFontToMapbox(font.path);
        fontCache.push(uploadedFont);
        await this.saveFontCache(fontCache);
      }
    }

    // Delete fonts not present in the local folder
    const localPaths = localFonts.map((font) => {
      return path.relative(this.folderFont, font.path);
    });

    for (const cachedFont of fontCache) {
      const exists = localPaths.includes(cachedFont.path);
      if (!exists) {
        console.log(
          `Deleting ${cachedFont.family_name} - ${cachedFont.style_name}`
        );
        await this.deleteFontFromMapbox(
          cachedFont.family_name + " " + cachedFont.style_name
        );
      }
    }
  }

  /**
   * Loads the font cache from the local JSON file.
   * @returns {Promise<Object[]>} - Promise that resolves to an array of cached font metadata.
   */

  async loadFontCache() {
    try {
      const data = await fs.readFile(this.cacheFile, "utf-8");
      return JSON.parse(data);
    } catch (err) {
      if (err.code === "ENOENT") {
        return [];
      } else {
        throw err;
      }
    }
  }
  /**
   * Saves the font cache to the local JSON file.
   * @param {Object[]} cache - Array of cached font metadata to save.
   * @returns {Promise} - Promise that resolves when the cache is saved.
   */
  async saveFontCache(cache) {
    await fs.writeFile(this.cacheFile, JSON.stringify(cache, null, 2), "utf-8");
  }
}

/**
 * Helpers
 */
async function getFilesRecursively(folder, files = []) {
  const entries = await fs.readdir(folder, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(folder, entry.name);
    if (entry.isDirectory()) {
      await getFilesRecursively(entryPath, files);
    } else if (entry.isFile() && entry.name.endsWith(".ttf")) {
      files.push(entryPath);
    }
  }

  return files;
}
