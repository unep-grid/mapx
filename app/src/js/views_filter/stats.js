/**
 * Extract checkboxes from various path in given views list and produce frequency tables
 * @param {Array} v Views list
 * @note : expect type, data.collections
 */
export function getFreqTable(views) {
  const data = views.map((v) => v._component_groups);
  const stats = {};

  for (const item of data) {
    for (const [key, value] of Object.entries(item)) {
      if (!stats[key]) {
        stats[key] = {};
      }

      if (Array.isArray(value)) {
        for (const val of value) {
          stats[key][val] = (stats[key][val] || 0) + 1;
        }
      } else {
        stats[key][value] = (stats[key][value] || 0) + 1;
      }
    }
  }

  return stats;
}
