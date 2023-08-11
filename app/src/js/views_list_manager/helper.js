import { ViewsListManager } from "./manager.js";
import { getMapData } from "./../map_helpers";

/**
 * Render views HTML list in viewStore
 * @param {object} o options
 * @param {string} o.id map id
 * @param {Object} o.views views to render
 * @param {boolean} o.add Add views to an existing list
 */
export async function viewsListRenderNew(o) {
  const mData = getMapData();
  mData.viewsListManager = new ViewsListManager(o);
}

/**
 * Add single view to the views list
 * @param {Object} view View object to add
 * @param {Object} options
 * @param {String} options.id
 * @param {Boolean} options.moveTop Move view item to top
 * @param {Boolean} options.render Trigger item rendering
 * @param {Boolean} options.open Open and add view to the map
 * @param {Object} options.view View object to render
 * @return {Promise<Object>} Object options realised
 */
export async function viewsListAddSingle(view, options) {
  const mData = getMapData();
  return mData.viewsListManager.viewsListAddSingle(view, options);
}

/**
 * Update single view alread in the view list
 * @param {Object} view View object to add
 */
export async function viewsListUpdateSingle(view) {
  const mData = getMapData();
  return mData.viewsListManager.viewsListUpdateSingle(view);
}

/**
 * Update views filter
 */
export function updateViewsFilter() {
  const mData = getMapData();
  mData.viewsListManager.updateViewsFilter();
}
