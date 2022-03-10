import { sendJSON, readJSON } from "#mapx/helpers";
const formatsList = await readJSON("./format_list.json", import.meta.url);

/**
 * Middleware for supported file format
 */
export function mwGetFormatsList(_, res) {
  sendJSON(res, formatsList);
}

/**
 * Get formats list
 * @return {Array} Array of format info
 */
export function getFormatsList() {
  return formatsList;
}

/**
 * Validate format name
 * @param {String} format id, e.g. GPKG,
 * @return {Boolean} valid
 */
export function isFormatValid(format) {
  return !!getFormatInfo(format,false)
}

/**
 * Get format info
 * @param {String} format id, e.g. GPKG,
 * @param {Boolean} use default If format not found, return default
 * @return {Object|Boolean} format info object or false if not found and useDefault is false
 */
export function getFormatInfo(format, useDefault=true) {
  const fLower = (format || "").toLowerCase();
  for (const f of formatsList) {
    const fLName = f.name.toLowerCase();
    const fLDriver = f.driver.toLowerCase();
    if (fLower === fLName || fLower === fLDriver) {
      return f;
    }
  }

  if (useDefault) {
    return formatsList[0];
  }

  return false;
}

/**
 * Get file extension array
 * @param {String} format id, e.g. GPKG,
 * @return {Array} Arary of file ext : e.g. [.gpkg]
 */
export function getFormatExt(format) {
  return getFormatInfo(format).fileExt;
}
