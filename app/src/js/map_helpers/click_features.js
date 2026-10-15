import { isEmpty } from "./../is_test/index.js";

/**
 * Build the data of the single "click_features" event fired per map click.
 * Views without features are omitted: an empty `attributes` object means the
 * click hit nothing.
 * @param {Object<string, Promise<Array|Object>>} layersAttributes Pending
 * attributes, with view id as key
 * @param {Object} event Map click event
 * @return {Promise<{attributes: Object, point: Object, lngLat: Object}>}
 */
export async function getClickFeaturesData(layersAttributes, event) {
  const entries = Object.entries(layersAttributes || {});
  const results = await Promise.all(
    entries.map(async ([idView, pending]) => {
      try {
        return [idView, await pending];
      } catch (e) {
        console.warn(`Failed to query attributes of ${idView}`, e);
        return [idView, null];
      }
    }),
  );
  const attributes = {};
  for (const [idView, items] of results) {
    if (!isEmpty(items)) {
      attributes[idView] = items;
    }
  }
  return {
    attributes,
    point: event.point,
    lngLat: event.lngLat,
  };
}
