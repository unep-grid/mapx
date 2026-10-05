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
