import { draw, panels } from "../../mx.js";
import { isEmpty, isView } from "../../is_test/index.js";
import { modalDialog } from "../../mx_helper_modal.js";
import { getEditableGeometryType } from "../../draw/edit_session.js";

/**
 * Shared "edit one feature geometry" orchestration, used by the table
 * editor ( geom cell button ) and the map context menu quick edit.
 * Lock acquisition stays with the caller : the two entry points have
 * different lock flows and UI around it.
 */
const def = {
  max_zoom: 12,
  id_main_panel: "main_panel",
};

/**
 * Simple geometry type from a GeoJSON geometry
 * @param {Object|null} geometry
 * @return {String} point|line|polygon
 */
export function getGeometryTypeSimple(geometry) {
  return getEditableGeometryType(geometry);
}

/**
 * Fetch the feature, open a draw edit session, save the geometry and
 * refresh dependent views. The main panel is hidden during the edit.
 *
 * @param {Object} opt
 * @param {Object} opt.session Edit session :
 *        {getFeature, getGeometryInfo, updateGeometry, getTableViews}
 * @param {Number} opt.gid Feature id
 * @param {Object} [opt.geometry] Fallback geometry when the stored one is empty
 * @param {String} [opt.geomType] Geometry type ( point|line|polygon ).
 *        Defaults to the type derived from the geometry : pass the source
 *        type when adding geometry to an empty row.
 * @param {Object} opt.viewsApi {getView, viewsReplace}
 * @return {Promise<Object>} draw edit session result
 */
export async function editFeatureGeometry(opt) {
  const { session, gid, geometry = null, geomType = null, viewsApi } = opt;
  const feature = await session.getFeature(gid);
  if (!feature) {
    throw new Error("Feature not found");
  }
  const geom = feature.geom || geometry || null;
  const geometryInfo =
    typeof session.getGeometryInfo === "function"
      ? await session.getGeometryInfo()
      : null;
  const declaredType = `${geometryInfo?.type || geom?.type || ""}`.toUpperCase();
  const allowMultipart =
    declaredType === "GEOMETRY" || declaredType.startsWith("MULTI");
  const type = geom ? getGeometryTypeSimple(geom) : geomType || "polygon";
  if (geom && !type) {
    await modalDialog({
      title: "Unsupported geometry",
      content:
        "GeometryCollection cannot be edited. Point, line, polygon and their multipart variants are supported.",
    });
    throw new Error(`Unsupported geometry type: ${geom.type || "unknown"}`);
  }
  const mainPanelWasVisible = hideMainPanel();
  try {
    const result = await draw.startEditSession({
      type,
      feature: {
        type: "Feature",
        properties: {
          gid: feature.gid,
        },
        geometry: geom,
      },
      maxZoom: def.max_zoom,
      allowMultipart,
      promoteToMulti: allowMultipart,
      onSave: async ({ geometry }) => {
        try {
          const saved = await session.updateGeometry(feature.gid, geometry);
          if (!saved) {
            throw new Error("Geometry update was not accepted");
          }
        } catch (e) {
          await modalDialog({
            title: "Geometry save failed",
            content:
              "The geometry could not be saved. The edit session is still active.",
          });
          throw e;
        }
      },
    });
    if (result?.status === "saved") {
      await refreshTableViews(session, viewsApi);
    }
    return result;
  } finally {
    restoreMainPanel(mainPanelWasVisible);
  }
}

/**
 * Reload the views depending on the edited source, to display the changes
 * @param {Object} session Edit session : {getTableViews}
 * @param {Object} viewsApi {getView, viewsReplace}
 * @return {Promise<Boolean>} views replaced
 */
export async function refreshTableViews(session, viewsApi) {
  const tableViews = await session.getTableViews();
  if (!tableViews) {
    return false;
  }
  const views = tableViews
    .map((row) => viewsApi.getView(row.id))
    .filter((view) => isView(view));
  if (isEmpty(views)) {
    return false;
  }
  return viewsApi.viewsReplace(views);
}

function hideMainPanel() {
  const wasVisible =
    panels.idExists(def.id_main_panel) && panels.isVisible(def.id_main_panel);
  if (panels.idExists(def.id_main_panel)) {
    panels.hide(def.id_main_panel);
  }
  return wasVisible;
}

function restoreMainPanel(wasVisible) {
  if (wasVisible && panels.idExists(def.id_main_panel)) {
    panels.show(def.id_main_panel);
  }
}
