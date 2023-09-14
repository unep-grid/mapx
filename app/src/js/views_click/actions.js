import { el, elSpanTranslate } from "./../el_mapx/index.js";
import { isEmpty } from "./../is_test_mapx";
import { makeId, path } from "./../mx_helper_misc.js";
import { modal, modalConfirm } from "./../mx_helper_modal.js";
import { FlashItem } from "./../icon_flash";
import { displayMetadataIssuesModal } from "./../mx_helper_map_view_badges.js";
import { storyRead } from "./../story_map/index.js";
import { viewToTableAttributeModal } from "./../source/display_table.js";
import { viewToMetaModal } from "./../mx_helper_map_view_metadata.js";
import { getDictItem, getLanguageCurrent } from "./../language";
import { Uploader } from "./../uploader";
import { modalMirror } from "./../mirror_util";
import { ShareModal } from "./../share_modal/index.js";
import { ModalCodeIntegration } from "../code_integration_modal/index.js";
import {
  downloadViewSourceExternal,
  downloadViewGeoJSON,
  downloadViewVector,
  resetViewStyle,
  viewFilterToolsInit,
  getView,
  setProject,
  viewDelete,
  zoomToViewIdVisible,
  zoomToViewId,
  getViewTitle,
  viewAdd,
  viewRemove,
} from "./../map_helpers/index.js";

import { ws, data } from "./../mx.js";
import { settings } from "./../settings";
import { viewsListAddSingle } from "../views_list_manager";
import {LegendVt} from "../legend_vt/legend_vt.js";
const idMap = settings?.map?.id;

/**
 * Display modal for the mirror helper
 *
 * @returns {void}
 */
export function btn_mirror_url() {
  modalMirror();
}

/**
 * Delegate action to Shiny
 * @param {DOMStringMap} dataset
 * @returns {void}
 */
export function shiny(dataset) {
  window.Shiny.onInputChange("mx_client_view_action", {
    target: dataset.view_action_target,
    action: dataset.view_action_key,
    time: new Date(),
  });
}

/**
 * Display modal for metadata issue
 *
 * @param {DOMStringMap} dataset
 * @returns {void}
 */
export function btn_badge_warning_invalid_meta(dataset) {
  const results = JSON.parse(dataset.view_action_data);
  displayMetadataIssuesModal(results);
}

/**
 * Display modal for displaying message about the badge clicked
 *
 * @param {DOMStringMap} dataset
 * @returns {void}
 */
export async function btn_badge_show_modal_badge(dataset) {
  const type = dataset.view_action_data;
  modal({
    content: getDictItem(type),
    addBackground: true,
  });
}

/**
 * Display modal for displaying message about the element clicked
 *
 * @param {DOMStringMap} dataset
 * @returns {void}
 */
export async function btn_badge_temp_shared(dataset) {
  const type = dataset.view_action_data;
  modal({
    content: getDictItem(`${type}_desc`),
    addBackground: true,
  });
}

/**
 * Display modal for loading a project, e.g. home button
 *
 * @param {DOMStringMap} dataset
 * @returns {void}
 */
export async function btn_opt_home_project(dataset) {
  const viewTarget = dataset.view_action_target;
  const view = getView(viewTarget);
  await setProject(view.project, { askConfirm: true });
}

/**
 * Display ShareModal
 * @returns {void}
 */
export function btn_opt_share() {
  new ShareModal();
}

/**
 * Display CodeIntegration
 *
 * @param {DOMStringMap} dataset
 * @returns {void}
 */
export async function btn_opt_code_integration(dataset) {
  const idView = dataset.view_action_target;
  const darkMode = mx.theme.isDarkMode();
  const mci = new ModalCodeIntegration(idView, { darkMode: darkMode });
  await mci.init();
}

/**
 * Remove selected GeoJSON
 *
 * @param {DOMStringMap} dataset
 * @returns {void}
 */
export async function btn_opt_delete_geojson(dataset) {
  const ok = await modalConfirm({
    title: elSpanTranslate("delete_confirm_geojson_modal_title"),
    content: elSpanTranslate("delete_confirm_geojson_modal"),
  });

  if (!ok) {
    return;
  }

  const arg = dataset;
  await viewDelete(arg.view_action_target);
}

/**
 * Import/Pin linked view
 *
 * @param {DOMStringMap} dataset
 * @returns {void}
 */
export async function btn_opt_import_view_linked(dataset) {
  const ok = await modalConfirm({
    title: elSpanTranslate("import_view_linked_title"),
    content: elSpanTranslate("import_view_linked"),
  });

  if (!ok) {
    return;
  }

  const view = await ws.emitAsync(
    "/client/view/pin",
    {
      id_view: dataset.view_action_target,
      id_project: settings.project.id,
      id_request: makeId(10),
    },
    60e3
  );
  await viewDelete(dataset.view_action_target);
  await viewsListAddSingle(view, {
    moveTop: true,
    render: true,
    open: true,
  });
  new FlashItem("floppy-o");
}

/**
 * Unlink temporary view
 *
 * @param {DOMStringMap} dataset
 * @returns {void}
 */
export async function btn_opt_remove_linked(dataset) {
  const resp = await modalConfirm({
    title: elSpanTranslate("remove_confirm_temp_modal_title"),
    content: elSpanTranslate("remove_confirm_temp_modal"),
  });
  if (resp) {
    const arg = dataset;
    await viewDelete(arg.view_action_target);
  }
}

/**
 * Download handler for external source
 *
 * @param {DOMStringMap} dataset
 * @returns {void}
 */
export function btn_opt_get_external(dataset) {
  const viewTarget = dataset.view_action_target;
  downloadViewSourceExternal({ idView: viewTarget });
}

/**
 * Download handler
 *
 * @param {DOMStringMap} dataset
 * @returns {void}
 */
export function btn_opt_download(dataset) {
  const idView = dataset.view_action_target;
  return downloadViewVector(idView);
}

/**
 * Download handler for GeoJSON
 *
 * @param {DOMStringMap} dataset
 * @returns {void}
 */
export function btn_opt_get_geojson(dataset) {
  const viewTarget = dataset.view_action_target;
  downloadViewGeoJSON({ idView: viewTarget, mode: "file" });
}

/**
 * Upload handler for GeoJSON
 *
 * @param {DOMStringMap} dataset
 * @returns {void}
 */
export async function btn_upload_geojson(dataset) {
  const idView = dataset.view_action_target;
  const item = await data.geojson.getItem(idView);
  const geojson = item?.view?.data?.source?.data;
  const noGeojson = isEmpty(geojson);
  if (noGeojson) {
    return;
  }
  let filename = getViewTitle(idView);

  if (!/\.geojson$/.test(filename)) {
    filename = `${filename}.geojson`;
  }
  const strGeoJSON = JSON.stringify(geojson);
  const blob = new Blob([strGeoJSON], { type: "application/json" });
  const file = new File([blob], filename, { type: "application/json" });
  new Uploader({ file });
}

/**
 * Start reading a story map
 *
 * @param {DOMStringMap} dataset
 * @returns {void}
 */
export function btn_opt_start_story(dataset) {
  storyRead({
    id: idMap,
    idView: dataset.view_action_target,
    save: false,
  });
}

/**
 * Zoom to view's visibles features
 *
 * @param {DOMStringMap} dataset
 * @returns {void}
 */
export function btn_opt_zoom_visible(dataset) {
  zoomToViewIdVisible({
    id: idMap,
    idView: dataset.view_action_target,
  });
}

/**
 * Zoom to view's extent
 *
 * @param {DOMStringMap} dataset
 * @returns {void}
 */
export function btn_opt_zoom_all(dataset) {
  zoomToViewId({
    id: idMap,
    idView: dataset.view_action_target,
  });
}

/**
 * Show/Hide view settings / sliders / filters
 *
 * @param {DOMStringMap} dataset
 * @returns {void}
 */
export async function btn_opt_settings(dataset) {
  const elSearch = document.getElementById(dataset.view_action_el_target);
  const elSearchWait = elSearch.querySelector(".mx-settings-tool-wait");
  const elSearchContent = elSearch.querySelector(".mx-settings-tool-content");
  elSearch.classList.toggle("mx-hide");

  if (elSearch.classList.contains("mx-hide")) {
    return;
  }
  /**
   * Display waiting panel during init
   */
  elSearchWait.classList.remove("mx-hide");
  elSearchContent.classList.add("mx-hide");
  const viewTarget = dataset.view_action_target;
  const view = getView(viewTarget);
  await viewFilterToolsInit(view);
  /**
   * Hide waiting panel after init
   */
  elSearchWait.classList.add("mx-hide");
  elSearchContent.classList.remove("mx-hide");
}

/**
 * Legend filter handler
 *
 * @param {DOMStringMap} dataset
 * @param {Element} elTarget
 * @returns {void}
 */
export function btn_legend_filter(dataset) {
  const idView = dataset.view_action_target;
  const view = getView(idView);
  if(view._legend instanceof LegendVt){
     view._legend.updateFilter();
  }
}

/**
 * View add/remove handler
 *
 * @param {DOMStringMap} dataset
 * @param {Element} elTarget
 * @returns {void}
 */
export async function btn_toggle_view(dataset) {
  const idView = dataset.view_action_target;
  const view = getView(idView);
  if (view._vb) {
    const open = view._vb.toggle();
    if (open) {
      await viewAdd(view);
    } else {
      await viewRemove(view);
    }
  }
}

/**
 * View reset
 * @param {DOMStringMap} dataset
 * @returns {void}
 */
export async function btn_opt_reset(dataset) {
  await resetViewStyle({
    idView: dataset.view_action_target,
  });
}

/**
 * Display view attribute table
 * @param {DOMStringMap} dataset
 * @returns {void}
 */
export async function btn_opt_attribute_table(dataset) {
  const idView = dataset.view_action_target;
  await viewToTableAttributeModal(idView);
}

/**
 * Display view metadata
 * @param {DOMStringMap} dataset
 * @returns {void}
 */
export async function btn_opt_meta(dataset) {
  const idView = dataset.view_action_target;
  await viewToMetaModal(idView);
}

/**
 * Display view external metadata
 * @param {DOMStringMap} dataset
 * @returns {void}
 */
export async function btn_opt_meta_external(dataset) {
  const idView = dataset.view_action_target;
  const view = getView(idView);
  const link = path(view, "data.source.urlMetadata");
  const lang = getLanguageCurrent();
  let title = path(view, `data.title.${lang}`) || path(view, "data.title.en");

  if (!title) {
    title = idView;
  }
  const modalTitle = await getDictItem("source_raster_tile_url_metadata");

  modal({
    title: modalTitle,
    id: "modalMetaData",
    content: el(
      "div",
      el("b", modalTitle),
      ":",
      el(
        "a",
        {
          href: link,
          style: {
            minHeight: "150px",
          },
        },
        title
      )
    ),
  });
}
