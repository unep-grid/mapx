/**
 * Distinct attribute names across all rows, in first-seen order.
 *
 * Rows may come from several layers with different schemas (e.g. a
 * custom-code view rendering two sources), so the first row is not enough.
 * @param {Array<Object>} rows Feature properties
 * @return {Array<String>} Attribute names
 */
export function getAttributesNames(rows = []) {
  const names = new Set();
  for (const row of rows || []) {
    for (const name of Object.keys(row || {})) {
      names.add(name);
    }
  }
  return [...names];
}

/**
 * Display value of an attribute cell.
 *
 * Raster (WMS GetFeatureInfo) samples are requested with no-data as null:
 * a null raster value means "no data", not an empty attribute.
 * @param {*} value Cell value
 * @param {Object} opt Options
 * @param {boolean} [opt.isRaster=false] Value comes from a raster view
 * @param {*} [opt.nullValue] Placeholder used for null in vector attributes
 * @param {function(): (string|Element)} opt.noData No data content factory
 * @return {*} Value, empty string or no data content
 */
export function formatAttributeValue(value, opt) {
  const { isRaster = false, nullValue, noData } = opt || {};
  if (isRaster && value === null) {
    return noData();
  }
  if (value === nullValue) {
    return "";
  }
  return value;
}
