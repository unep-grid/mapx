import { DownloadSourceModal } from "./index.js";
import { isView, isViewId } from "./../is_test";
import { getView } from "./../map_helpers";
import { getViewSourceSummary } from "./../mx_helper_source_summary";
import {settings} from "./../settings";
/**
 * Download source for vector view : show modal panel
 * @param {String} idView Id of the vector view
 * @return {Object} input options
 */
export async function downloadViewVector(idView) {
  if (!isViewId(idView)) {
    throw new Error(`View id ${idView} not valid`);
  }

  const view = getView(idView);

  if (!isView(view)) {
    throw new Error(`View ${idView} not found`);
  }
  const srcSummary = await getViewSourceSummary(view);
  const dl = new DownloadSourceModal({
    email: settings.user.guest ? null : settings.user.email,
    idSource: srcSummary.id,
  });

  return dl;
}
