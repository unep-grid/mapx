import {
  ws,
  nc,
  mg,
  events,
  data as mx_storage,
  listeners,
  theme,
  templates,
  mapboxgl,
  maps,
  highlighter,
  settings,
  panels,
  controls,
} from "./../mx.js";
import { FeaturesToWidget } from "../features_to_widget";
import { RadialProgress } from "./../radial_progress";
import { handleViewClick } from "./../views_click";
import { RasterMiniMap } from "./../raster_mini_map";
import { el, elSpanTranslate as tt } from "./../el_mapx/index.js";
import { shake } from "./../elshake/index.js";
import { MainPanel } from "./../panel_main";
import { MapInfoBox } from "./../map_info_box";
import { Search } from "./../search";
import { downloadJSON } from "../download/index.js";
import { ViewBase } from "../views_builder/view_base.js";
import { ChaosTest } from "./chaos_test.js";
import {
  MapxLogo,
  MapControlLiveCoord,
  MapControlAttribution,
  MapControlScale,
} from "./../map_controls";
import { MapxDraw } from "./../draw";
import { NotifCenter } from "./../notif_center/";
import { cleanDiacritic } from "./../string_util/";
import chroma from "chroma-js";
import { mirrorUrlCreate } from "./../mirror_util";
import { getAppPathUrl } from "./../api_routes/index.js";
import { isStoryPlaying, storyRead } from "./../story_map/index.js";
import { wmsQuery } from "./../wms/index.js";
import { clearMapxCache, getVersion } from "./../app_utils";
import { onNextFrame } from "./../animation_frame/index.js";
import {
  handleMapDragOver,
  handleMapDrop,
} from "./../mx_helper_map_dragdrop.js";
import {
  updateViewsFilter,
  viewsListRenderNew,
  viewsListAddSingle,
} from "./../views_list_manager";
import { initLog } from "./../mx_helper_log.js";
import { dashboard } from "./../dashboards/index.js";
import {
  updateIfEmpty,
  round,
  setBusy,
  clone,
  path,
  urlToImageBase64,
  showSelectProject,
  showSelectLanguage,
  showLogin,
  updateTitle,
  getClickHandlers,
  setClickHandler,
  cssTransformFun,
  xyToDegree,
  debounce,
  isShinyReady,
  debouncePromise,
} from "./../mx_helper_misc.js";
import {
  modal,
  modalGetAll,
  modalCloseAll,
  modalConfirm,
  modalDialog,
} from "./../mx_helper_modal.js";
import { errorHandler } from "./../error_handler/index.js";
import { waitTimeoutAsync } from "./../animation_frame";
import { getArrayDistinct, sortByOrder } from "./../array_stat/index.js";
import { getApiUrl } from "./../api_routes";
import { getViewSourceSummary } from "./../mx_helper_source_summary";
import {
  setQueryParametersInitReset,
  getQueryParametersAsObject,
  getQueryParameterInit,
  getQueryParameter,
  getQueryInit,
  setQueryParameters,
  cleanTemporaryQueryParameters,
  getQueryParametersInit,
} from "./../url_utils";
import { LegendVt } from "./../legend_vt/index.js";
import { getViewMapboxLayers } from "./../style_vt/index.js";
import { moduleLoad } from "./../modules_loader_async";
import {
  getDictItem,
  getLanguageCurrent,
  getLanguageDefault,
  getLanguagesAll,
  getLabelFromObjectPath,
  updateLanguage,
  updateLanguageElements,
} from "./../language";

import {
  isUrl,
  isView,
  isArray,
  isArrayOf,
  isUrlValidWms,
  isObject,
  isBbox,
  isMap,
  isEmpty,
  isViewId,
  isViewRt,
  isViewVt,
  isHTML,
  isElement,
  isString,
  isFunction,
  isBoolean,
  isViewOpen,
  isNotEmpty,
  isArrayOfViews,
  isArrayOfViewsId,
  isBase64img,
  isRegExp,
  isViewLocal,
  isViewEditable,
  isViewDashboard,
  isViewRtWithTiles,
  isViewVtWithRules,
  isViewRtWithLegend,
  isViewVtWithAttributeType,
  isBoundsInsideBounds,
  isSourceId,
  isProjectId,
  isViewInstance,
} from "./../is_test_mapx/index.js";
import { FlashItem } from "../icon_flash/index.js";
import { viewFiltersInit } from "./view_filters.js";
import { fetchViews } from "./views_fetch.js";
import { ButtonPanelLegend } from "../panel_legend/index.js";
import { createViewControls } from "../views_builder/view_controls.js";
export * from "./view_filters.js";

/**
 * Storage
 * - keep a ref to instances and objects previouly attached to mx global,
 *   but only used in map helpers / mapx js instance management
 * - views_active 'Set' is required to handle a simple state in 'static' mode,
 *   where there are no views list
 */
const mx_local = {
  views_active: new Set(),
  panel_main: null,
  draw: null,
  search: null,
};

/**
 * Export style basemap
 * @param {Object} opt Options
 * @param {String} opt.sourcePrefixToKeep Prefix of source layers id to keep;
 * @returns {Object} Mapbox style with MapX basemap
 */
export function getStyleBaseMap(opt) {
  const map = getMap();
  const sourcePrefixToKeep = opt?.sourcePrefixToKeep;
  const style = clone(map.getStyle());
  const themeData = theme.get();
  const styleOut = {};
  style.name = `${themeData.id}_${settings.version}`;

  /**
   * Clear metadata
   */
  delete style.metadata;

  styleOut.metadata = {
    mapx_version: settings.version,
  };

  /*
   *
   * Remove mapx layers
   */
  const layers = [];
  for (const layer of style.layers) {
    if (layer.id.match("^(?!MX-)")) {
      layers.push(layer);
    }
  }
  style.layers = layers;

  /*
   * Remove mapx sources
   */
  const strReg =
    `^MX-` + sourcePrefixToKeep ? `&^(?!${sourcePrefixToKeep})` : ``;
  for (const idSource in style.sources) {
    const reg = new RegExp(strReg);
    if (idSource.match(reg)) {
      delete style.sources[idSource];
    }
  }

  Object.assign(styleOut, style);

  return styleOut;
}

/**
 * Convert point in  degrees to meter
 * @lngLat {PointLike} lngLat
 * @return {PointLike} reprojected point
 */
export function degreesToMeters(lngLat) {
  const x = (lngLat.lng * 20037508.34) / 180;
  let y =
    Math.log(Math.tan(((90 + lngLat.lat) * Math.PI) / 360)) / (Math.PI / 180);
  y = (y * 20037508.34) / 180;
  return {
    x: x,
    y: y,
  };
}

/**
 * Convert point in meter to degrees
 * @lngLat {PointLike} lngLat
 * @return {PointLike} reprojected point
 */
export function metersToDegrees(point) {
  const lng = (point.x * 180) / 20037508.34;
  const lat =
    (Math.atan(Math.exp((point.y * Math.PI) / 20037508.34)) * 360) / Math.PI -
    90;
  return {
    lat: lat,
    lng: lng,
  };
}

/**
 * Export downloadViewVector from here, to match pattern
 *  map_helpers ->
 *  downloadViewVector
 *  downloadViewGeoJSON
 *  downloadViewSourceExternal
 * Definied is this file.
 */
export { downloadViewVector } from "./../source";

/**
 * Download view geojson
 * @param {Object} opt Options
 * @param {String} opt.idView Id of the gj view
 * @param {String} opt.mode Mode : 'file' or 'data'
 * @return {Object} input options. If data, new key "data"
 */
export async function downloadViewGeoJSON(opt) {
  opt = Object.assign({}, { idView: null, mode: "data" }, opt);
  const view = getView(opt.idView);

  if (!isView(view)) {
    throw new Error(`No view with id ${opt.idView}`);
  }
  const geojson = path(view, "data.source.data");
  let filename = path(view, "data.title.en");
  if (filename.search(/.geojson$/) === -1) {
    filename = `${view.id}.geojson`;
  }
  if (opt.mode === "file") {
    await downloadJSON(geojson, filename);
  }
  if (opt.mode === "data") {
    opt.data = geojson;
  }
  return opt;
}

/**
 * Get url items from view's meta
 * @param {Object} view
 * @return {Array} array of download url items [{<label>,<url>,<is_download_link>}]
 */
export function getDownloadUrlItemsFromViewMeta(view) {
  const urlItems = path(view, "data.source.meta.origin.source.urls", []);

  if (urlItems.length === 0) {
    /**
     * Manual support for previous method to store the dl url
     * NOTE: should match the schema
     */
    const legacyUrl = path(view, "data.source.urlDownload");
    if (legacyUrl) {
      urlItems.push({
        url: legacyUrl,
        is_download_link: true,
        label: "Download",
      });
    }
  }
  const urlItemsClean = urlItems.filter(
    (urlItem) => isObject(urlItem) && isUrl(urlItem.url),
  );

  return urlItemsClean;
}

/**
 * Check if view's meta has download url items
 * @param {Object} view
 * @return {Boolean} has items
 */
export function hasDownloadUrlItemsFromViewMeta(view) {
  return getDownloadUrlItemsFromViewMeta(view).length > 0;
}

/**
 * Download external source
 * @param {Object} opt Options
 * @param {String} opt.idView Id of the rt view
 * @return {Object} input options, with new key "url", first url and all items in an array [{<label>,<url>,<is_download_link>}]
 */
export async function downloadViewSourceExternal(opt) {
  opt = Object.assign({}, { idView: null, mode: null }, opt);
  const view = getView(opt.idView);

  if (!isView(view)) {
    throw new Error(`No view with id ${opt.idView}`);
  }

  /*
   * Retrieve urls list
   */
  const urlItemsClean = getDownloadUrlItemsFromViewMeta(view);

  /**
   * Warn if there is an no valid url
   */
  if (isEmpty(urlItemsClean)) {
    modal({
      title: getDictItem("source_raster_download_error_title"),
      content: getDictItem("source_raster_download_error"),
      addBackground: true,
    });
    return opt;
  }

  /**
   * Keep compatibility with the SDK resolver
   */
  opt.url = urlItemsClean[0].url;
  opt.urlItems = urlItemsClean;

  /**
   * Build ui
   */
  const elContent = el(
    "div",
    {
      class: "list-group",
    },
    urlItemsClean.map((item) => {
      const isDl = item.is_download_link === true;
      const hasLabel = isNotEmpty(item.label);
      const elItem = el(
        "button",
        {
          on: ["click", dl],
          class: "list-group-item",
          dataset: { url: item.url },
        },
        el(
          "div",
          {
            style: {
              display: "flex",
              justifyContent: "space-between",
            },
          },
          el("i", {
            class: ["fa", isDl ? "fa-download" : "fa-external-link"],
          }),
          el(
            "span",
            {
              style: {
                maxWidth: "80%",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              },
            },
            hasLabel ? item.label : item.url,
          ),
        ),
      );
      return elItem;
    }),
  );

  const elModal = modal({
    title: getDictItem("meta_source_url_download"),
    content: elContent,
    addBackground: true,
  });

  return opt;

  function dl(e) {
    /**
     * Open a new windows, let the browser handle the dl or page load
     */
    const url = e.currentTarget.dataset?.url;
    window.open(url, "_blank");
    elModal.close();
  }
}

/**
 * Get random geojson point
 * @param {Object} opt Options
 * @param {Number} opt.n points
 * @param {Array} opt.latRange Range in lat
 * @param {Array} opt.lngRange Range in lng
 */
export function getGeoJSONRandomPoints(opt) {
  opt = Object.assign(
    {},
    { n: 101, latRange: [-85, 85], lngRange: [-180, 180] },
    opt,
  );

  const features = [];

  for (var i = 0; i < opt.n; i++) {
    features.push(feature());
  }

  return {
    type: "FeatureCollection",
    features: features,
  };

  function feature() {
    return {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [randomInRange(opt.lngRange), randomInRange(opt.latRange)],
      },
    };
  }
  function randomInRange(to) {
    const from = [0, 1];
    const scale = (to[1] - to[0]) / (from[1] - from[0]);
    const capped =
      Math.min(from[1], Math.max(from[0], Math.random())) - from[0];
    return Math.floor(capped * scale + to[0]);
  }
}

/**
 * Get login info
 * @note : now from settings, but could be fetched
 * @returns {Object} loginInfo
 * @returns {Integer} loginInfo.idUser Id of the user
 * @returns {String} loginInfo.idProject id of the current project
 * @returns {Boolean} loginInfo.isGuest Is the user guest
 * @returns {String} loginInfo.token Encrypted string with as {key:<key from mx_users>, is_guest: <boolean>, valid_until:<unixtime>}
 */
export async function getLoginInfo() {
  const s = settings;
  return {
    idUser: s.user.id,
    idProject: s.project.id,
    isGuest: s.user.guest,
    token: s.user.token,
    language: getLanguageCurrent(),
  };
}

/**
 * Wrapper to trigger layers list update (.e.g. after upload)
 * @returns
 */
export function triggerUpdateSourcesList() {
  const hasShiny = isShinyReady();
  if (hasShiny) {
    Shiny.onInputChange("mx_client_update_source_list", {
      date: new Date() * 1,
    });
  }
}

/**
 * Set the project manually
 * @param {String} idProject project to load
 * @param {Object} opt Options
 * @param {Function} opt.onSuccess : Optional callback if project is changed
 * @return null
 */
export async function setProject(idProject, opt) {
  const hasShiny = isShinyReady();
  if (!hasShiny) {
    console.log("Project change requires a valid app session");
    return;
  }

  if (!isProjectId(idProject)) {
    return;
  }

  opt = Object.assign({}, { askConfirmIfModal: true, askConfirm: false }, opt);
  const idCurrentProject = path(mx, "settings.project.id");
  const isGuest = settings.user.guest;

  if (idProject === idCurrentProject) {
    return false;
  }
  /**
   * Check if some modal are still there
   */
  const modals = modalGetAll({ ignoreSelectors: ["#uiSelectProject"] });
  const askConfirm =
    opt.askConfirm || (opt.askConfirmIfModal && modals.length > 0);
  let changeNow = true;

  if (askConfirm) {
    changeNow = await modalConfirm({
      title: tt("modal_check_confirm_project_change_title"),
      content: tt("modal_check_confirm_project_change_txt"),
    });
  }
  if (!changeNow) {
    return false;
  }

  modalCloseAll();

  const promWait = waitTimeoutAsync(10e3, null, "timeout");
  const promRes = events.once("settings_project_change");

  Shiny.onInputChange("selectProject", idProject);

  const res = await Promise.race([promRes, promWait]);

  const idProjectNew = res?.new_project;
  const idProjectOld = res?.old_project;
  const hadTimeout = res === "timeout";

  const validProject = isProjectId(idProjectNew);
  const projectNotChanged = validProject && idProjectNew === idProjectOld;
  const projectRefused = !validProject || idProjectNew !== idProject;

  if (hadTimeout || projectRefused || projectNotChanged) {
    await modalDialog({
      title: tt("modal_check_confirm_project_change_fail_title"),
      content: tt(
        isGuest
          ? "modal_check_confirm_project_change_fail_content_not_logged"
          : "modal_check_confirm_project_change_fail_content_logged",
      ),
    });
    console.error("Project change failed", {
      hadTimeout,
      validProject,
      projectRefused,
      projectNotChanged,
    });
    return false;
  }

  /**
   * Clean params and close views
   */
  setQueryParametersInitReset();
  await viewsCloseAll();

  /**
   * Restart websocket
   */
  await ws.connect();

  /**
   * Wait the view list to be updated
   */
  await events.once("views_list_updated");

  /**
   * Fire project:changed event
   */
  events.fire({
    type: "project_changed",
    data: {
      new_project: idProject,
      old_project: idCurrentProject,
    },
  });
  return true;
}

/**
 * Wrapper around set project for use with shiny binding
 * @param {Object} opt Options
 * @param {String} opt.idProject id of the project
 */
export function updateProject(opt) {
  return setProject(opt.idProject, opt);
}

/**
 * Trigger an membership request event in mapx Shiny app
 * @param {String} idProject id of the project
 */
export function requestProjectMembership(idProject) {
  Shiny.onInputChange("requestProjectMembership", {
    id: idProject,
    date: new Date(),
  });
}

/**
 * Check if query paramater noViews or modeLocked is set to 'true'
 * In such mode, no view can be added
 */
export function isModeLocked() {
  let modeLocked =
    getQueryParameterInit("noViews")[0] ||
    getQueryParameterInit("modeLocked")[0];
  return !!modeLocked;
}

/**
 * Init global listener
 */
export function initListenerGlobal() {
  const map = getMap();
  const btn3d = controls.get("btn_3d_terrain");

  /*
   * Fire session start
   */
  events.fire({
    type: "session_start",
  });

  /**
   * Handle project state navigation
   */
  listeners.addListener({
    target: window,
    type: "popstate",
    idGroup: "base",
    callback: async (event) => {
      const state = event.state;
      if (!state) {
        return;
      }
      await setProject(state.project);
    },
  });

  /**
   * View / Legend click
   */
  listeners.addListener({
    target: window,
    type: "click",
    idGroup: "view_legends",
    callback: handleViewClick,
  });

  /*
   * Fire session end
   */
  listeners.addListener({
    target: window,
    type: "beforeunload",
    idGroup: "base",
    callback: () => {
      events.fire({
        type: "session_end",
      });
    },
  });

  listeners.addListener({
    target: window,
    type: ["error", "unhandledrejection"],
    idGroup: "base",
    callback: errorHandler,
  });

  /**
   *  Events
   */
  events.on({
    type: [
      "view_added",
      "view_removed",
      "story_step",
      "language_change",
      "views_list_ordered",
      "set_map_projection",
    ],
    idGroup: "update_share_modale",
    callback: updateSharingTool,
  });
  events.on({
    type: ["story_start", "story_close", "story_update"],
    idGroup: "update_share_modale_story",
    callback: resetSharingTool,
  });
  map.on("move", updateSharingTool);
  map.on("styledata", updateSharingTool);
  map.on("pitch", debounce(update3d));

  function update3d() {
    const enable = map.getPitch() > 0;
    const enabled = btn3d.isActive();
    if (enable && !enabled) {
      btn3d.action("enable");
    }
    if (!enable && enabled) {
      btn3d.action("disable");
    }
  }

  function updateSharingTool() {
    if (window._share_modal) {
      window._share_modal.update();
    }
  }
  function resetSharingTool() {
    if (window._share_modal) {
      window._share_modal.reset();
    }
  }
}

/**
 * Init app listeners
 */
export function initListenersApp() {
  listeners.addListener({
    target: document.getElementById("btnShowProject"),
    type: "click",
    callback: showSelectProject,
    group: "mapx_base",
  });

  listeners.addListener({
    target: document.getElementById("btnShowLanguage"),
    type: "click",
    callback: showSelectLanguage,
    group: "mapx_base",
  });

  listeners.addListener({
    target: document.getElementById("btnShowLogin"),
    type: "click",
    callback: showLogin,
    group: "mapx_base",
  });

  events.on({
    type: "language_change",
    idGroup: "view_filter_tag_lang",
    callback: function () {
      const mData = getMapData();
      if (mData.viewsFilter) {
        mData.viewsFilter.updateCheckboxesOrder();
      }
    },
  });

  /**
   * When user change, re-init notifications.
   * The message will be cleaared and a  new localforage
   * will be loaded for that user,
   */

  events.on({
    type: ["settings_user_change"],
    idGroup: "notif",
    callback: async (data) => {
      if (data.delta.id) {
        /**
         * Reconnect to ws
         */
        await ws.connect();
        /**
         * Re-init notifications control
         */
        await nc.init();
      }
    },
  });

  /**
   * After project change
   * - url search params  'project' is set in ../url_utils
   */
  events.on({
    type: "project_changed",
    idGroup: "project_change",
    callback: async () => {
      const clActive = "active";
      const clHide = "mx-hide";
      const elBtn = document.getElementById("btnFilterShowPanel");
      const isActive = elBtn.classList.contains(clActive);
      const elPanel = document.getElementById("viewsFilterPanel");
      if (isActive) {
        elPanel.classList.add(clHide);
        elBtn.classList.remove(clActive);
      }
    },
  });

  events.on({
    type: ["settings_change"],
    idGroup: "mapx_base",
    callback: updateUiSettings,
  });
  updateUiSettings();

  events.on({
    type: ["view_created", "view_deleted"],
    idGroup: "clean_history_and_state",
    callback: async () => {
      updateViewsFilter();
    },
  });

  events.on({
    type: ["views_list_updated", "view_add", "view_remove", "mapx_ready"],
    idGroup: "update_btn_filter_view_activated",
    callback: () => {
      const mData = getMapData();
      mData.viewsListManager.updateBtnFilterActivated();
      viewsCheckedUpdate();
    },
  });

  listeners.addListener({
    target: document.getElementById("btnClearCache"),
    type: "click",
    callback: clearMapxCache,
    group: "mapx_base",
  });

  listeners.addListener({
    target: document.getElementById("btnShowSearchApiConfig"),
    type: "click",
    callback: () => {
      if (mx_local.search) {
        return mx_local.search.showApiConfig();
      }
    },
    group: "mapx_base",
  });

  listeners.addListener({
    target: document.getElementById("btnResetPanelSize"),
    type: "click",
    callback: () => {
      panels.resetSizeAll();
    },
    group: "mapx_base",
  });

  listeners.addListener({
    target: document.getElementById("btnFilterShowPanel"),
    type: "click",
    callback: (e) => {
      let elBtn = e.target;
      let clHide = "mx-hide";
      let clActive = "active";
      let elPanel = document.getElementById("viewsFilterPanel");
      let isHidden = elPanel.classList.contains(clHide);
      if (isHidden) {
        elPanel.classList.remove(clHide);
        elBtn.classList.add(clActive);
      } else {
        elPanel.classList.add(clHide);
        elBtn.classList.remove(clActive);
      }
    },
    group: "mapx_base",
  });

  /**
   * Redirect Shiny events
   */
  const hasShiny = isShinyReady();
  if (hasShiny) {
    $(document).on("shiny:connected", () => {
      events.fire("mapx_connected");
    });
    $(document).on("shiny:disconnected", () => {
      events.fire("mapx_disconnected");
    });
  }
}

/**
 * Update element and button text that could not be translated automatically
 * after a settings change
 */
export const updateUiSettings = debouncePromise(updateUiSettings_base);

async function updateUiSettings_base() {
  try {
    await waitTimeoutAsync(10);

    const langDef = getLanguageDefault();
    const lang = getLanguageCurrent();
    /**
     * User / login labels
     */
    const elBtnLogin = document.getElementById("btnShowLoginLabel");
    const sUser = path(mx, "settings.user", {});
    const sRole = path(mx, "settings.user.roles", {});

    if (sUser.guest) {
      elBtnLogin.innerText = await getDictItem("login_label");
    } else {
      const role = sRole.admin
        ? "admin"
        : sRole.publisher
          ? "publisher"
          : sRole.member
            ? "member"
            : "public";

      const roleLabel = await getDictItem(role);
      elBtnLogin.innerText = `${sUser.email} – ${roleLabel}`;
    }

    /**
     * Project labels
     */
    const elBtnProject = document.getElementById("btnShowProject");
    const elBtnProjectLabel = document.getElementById("btnShowProjectLabel");
    const elBtnProjectPrivate = document.getElementById(
      "btnShowProjectPrivate",
    );
    const title = path(mx, "settings.project.title");

    const label = title[lang] || title[langDef] || settings.project.id;

    elBtnProjectLabel.innerText = label;
    elBtnProject.setAttribute("aria-label", label);

    if (settings.project.public) {
      elBtnProjectPrivate.classList.remove("fa-lock");
    } else {
      elBtnProjectPrivate.classList.add("fa-lock");
    }

    /**
     * Update app title (project or default)
     */
    updateTitle();

    /**
     * Language
     */
    await updateLanguage();
    const elBtnLanguage = document.getElementById("btnShowLanguageLabel");
    elBtnLanguage.innerText = await getDictItem(lang);
  } catch (e) {
    console.error("updateUiSettings error", e);
  }
}

/**
 * Check if there are some view item enable and visible
 * @return {Boolean} has activated view items
 */
export function hasViewsActivated() {
  const views = getViews();
  for (const view of views) {
    if (view._vb instanceof ViewBase) {
      if (view._vb.isActive()) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Initial mgl and mapboxgl
 * @param {Object} o options
 * @param {String} o.id Id of the map. Default to settings.map.id
 * @param {Array} o.idViews Initial id views list
 * @param {Object} o.mapPosition Options (zoom, method, for center ing the map)
 * @param {Number} o.mapPosition.z Zoom
 * @param {Number} o.mapPosition.n North max
 * @param {Number} o.mapPosition.s South max
 * @param {Number} o.mapPosition.e East max
 * @param {Number} o.mapPosition.w West max
 * @param {Number} o.mapPosition.pitch Pitch
 * @param {Number} o.mapPosition.bearing Bearing
 * @param {Number} o.mapPosition.lng Longitude center
 * @param {Number} o.mapPosition.lat Latitude center
 * @param {Object} o.colorScheme Color sheme object
 * @param {String} o.idTheme Id of the theme to use
 * @param {Boolean} o.useQueryFilters Use query filters for fetch views
 */
export async function initMapx(o) {
  o = o || {};
  o.id = o.id || settings.map.id;
  const mp = o.mapPosition || {};

  /**
   * Set mapbox gl token
   */
  mapboxgl.accessToken = o.token || settings.map.token;

  /**
   * MapX map data : views, config, etc..
   */
  maps[o.id] = Object.assign(
    {
      map: {},
      views: [],
    },
    maps[o.id],
  );

  /**
   * Set mode
   */
  const storyAutoStart =
    !o.modeStatic && getQueryParameter("storyAutoStart")[0];
  settings.mode.static = !!o.modeStatic || settings.mode.storyAutoStart;
  settings.mode.app = !settings.mode.static;

  if (storyAutoStart) {
    /**
     * Temporary hack : force redirect here. URL rewrite in Traefik does
     * not allow lookaround : it's not possible to have non trivial redirect.
     */
    const url = new URL(window.location);
    url.searchParams.set("storyAutoStart", false);
    url.pathname = "/static.html";
    window.location = url.href;
    return;
  }

  /**
   * Update closed panel setting
   */
  const closePanel = getQueryParameter("closePanels")[0];
  if (closePanel) {
    settings.initClosedPanels = true;
  }

  /**
   * Update  sprites path
   * -> glyphs are hosted with mapbox. If self hosted:
   * settings.style.glyphs = getAppPathUrl("fontstack");
   */
  settings.style.sprite = getAppPathUrl("sprites");

  /**
   * WS connect + authentication
   */
  await ws.connect();

  /**
   * Init notification control
   */
  await nc.init();

  /*
   * test if mapbox gl is supported
   */
  if (!mapboxgl.supported()) {
    alert(
      "This website will not work with your browser. Please upgrade it or use a compatible one.",
    );
    return;
  }

  /*
   * Update map pos with values from query
   */
  const queryLat = getQueryParameter("lat")[0];
  const queryLng = getQueryParameter("lng")[0];
  const queryZoom = getQueryParameter(["z", "zoom"])[0];
  const queryPitch = getQueryParameter(["p", "pitch"])[0];
  const queryBearing = getQueryParameter(["b", "bearing"])[0];
  const queryMinZoom = getQueryParameter(["zmin", "zoomMin"])[0];
  const queryMaxZoom = getQueryParameter(["zmax", "zoomMax"])[0];
  const queryMaxBounds = getQueryParameter(["useMaxBounds"]);
  const queryGlobe = getQueryParameter(["globe"])[0];

  if (isNotEmpty(queryLat)) {
    mp.center = null;
    mp.lat = queryLat * 1 || 0;
  }
  if (isNotEmpty(queryLng)) {
    mp.center = null;
    mp.lng = queryLng * 1 || 0;
  }
  if (isNotEmpty(queryZoom)) {
    mp.z = queryZoom * 1 || 0;
  }
  if (isNotEmpty(queryPitch)) {
    mp.p = queryPitch * 1 || 0;
  }
  if (isNotEmpty(queryBearing)) {
    mp.b = queryBearing * 1 || 0;
  }
  if (isNotEmpty(queryMaxZoom)) {
    mp.zmax = queryMaxZoom * 1 || 22;
  }
  if (isNotEmpty(queryMinZoom)) {
    mp.zmin = queryMinZoom * 1 || 0;
  }

  if (isNotEmpty(queryGlobe)) {
    mp.globe = !!queryGlobe;
  }

  if (isNotEmpty(queryMaxBounds) || mp.useMaxBounds) {
    const bounds = [];
    for (const k of ["w", "s", "e", "n"]) {
      const v = (getQueryParameter(k)[0] || mp[k] || 0) * 1;
      bounds.push(v);
    }
    const vbounds = validateBounds(bounds);
    mp.maxBounds = vbounds;
  }

  /* map options */
  const mapOptions = {
    container: o.id, // container id
    style: settings.style, // mx default style
    maxZoom: settings.map.maxZoom,
    minZoom: settings.map.minZoom,
    bounds: mp.bounds || null,
    maxBounds: mp.maxBounds || null,
    preserveDrawingBuffer: false,
    attributionControl: false,
    crossSourceCollisions: true,
    projection: mp.globe ? "globe" : null,
    zoom: mp.z || mp.zoom || 1,
    minZoom: mp.zmin || mp.zoomMax || null,
    maxZoom: mp.zmax || mp.zoomMin || null,
    bearing: mp.b || mp.bearing || 0,
    pitch: mp.p || mp.pitch || 0,
    center: mp.center || [mp.lng || 0, mp.lat || 0],
    localIdeographFontFamily: "'Noto Sans', 'Noto Sans SC', sans-serif",
  };
  /*
   * Create map object
   */
  const map = new mapboxgl.Map(mapOptions);
  const elCanvas = map.getCanvas();
  elCanvas.setAttribute("tabindex", "-1");

  // Multiple maps were originally planned, never happened.
  // -> many function have an option for getting the map by id, but
  //    only one really exists. TODO: refactoring
  o.map = map;
  maps[o.id].map = map;

  /**
   * Wait for map to be loaded
   */
  await map.once("load");

  /**
   * Link theme to map
   */
  theme.linkMap(map);

  /**
   * Update theme, if required by init opt
   * - If there is a query parameter value for this, it has already been set
   *   in init_theme.js
   * - Use the project theme if it's valid
   * - Use theme default if none exists.
   */
  const idThemeQuery = getQueryParameter("theme")[0];
  if (isEmpty(idThemeQuery)) {
    const idTheme = o.idTheme;
    if (theme.isValidId(idTheme)) {
      await theme.set(idTheme, { save_url: true });
    }
  }

  if (!settings.mode.static) {
    /**
     * Configure search tool
     */
    const key = await getSearchApiKey();
    mx_local.search = new Search({
      key: key,
      container: "#mxTabPanelSearch",
      host: settings.search.host,
      protocol: settings.search.protocol,
      port: settings.search.port,
      language: getLanguageCurrent(),
      index_template: "views_{{language}}",
    });

    /**
     * Init left panel
     */
    mx_local.panel_main = new MainPanel({
      mapx: {
        version: getVersion(),
      },
      panel: {
        id: "main_panel",
        elContainer: document.body,
        position: "top-left",
        button_text: getDictItem("btn_panel_main"),
        button_lang_key: "btn_panel_main",
        tooltip_position: "bottom-right",
        button_classes: ["fa", "fa-list-ul"],
      },
    });

    if (!settings.initClosedPanels) {
      panels.get("main_panel").open();
    }

    /**
     * Panels (static  handled later)
     */
    const panelState = getQueryParameter("panels")[0];
    const panelControls = panels.get("controls_panel");

    if (isNotEmpty(panelState)) {
      panels.batch(panelState);
    } else if (!settings.initClosedPanels) {
      panelControls.open();
    }

    /**
     * Build theme config inputs only when settings tab is displayed
     * On tab change to search, perform a search
     */
    mx_local.panel_main.on("tab_change", async (id) => {
      try {
        switch (id) {
          case "tools":
            const elThemeContainer = document.querySelector(
              "#mxInputThemeColors",
            );
            await theme.initManager(elThemeContainer);
            break;

          case "search":
            await mx_local.search.initCheck();
            mx_local.search._elInput.focus();
            break;

          default:
            // No action for other cases
            break;
        }
      } catch (e) {
        console.error(e);
      }
    });

    /**
     * On language change, update
     */
    events.on({
      type: "language_change",
      idGroup: "search_index",
      callback: (data) => {
        if (mx_local.search) {
          mx_local.search.setLanguage({
            language: data?.new_language,
          });
        }
      },
    });

    events.on({
      type: ["view_ui_open", "view_ui_close", "view_deleted"],
      idGroup: "search_index",
      callback: () => {
        mx_local.search._update_toggles_icons();
      },
    });
  }

  /**
   * Initial mode terrain 3d / Sat
   */
  const enable3d = getQueryParameter("t3d")[0];
  const enableSat = getQueryParameter("sat")[0];
  const enableGlobe = getQueryParameter("globe")[0];
  if (enable3d) {
    controls.get("btn_3d_terrain").action("enable");
  }
  if (enableSat) {
    controls.get("btn_theme_sat").action("enable");
  }
  if (enableGlobe) {
    controls.get("btn_globe").action("enable");
  }

  /**
   * Add mapx draw handler
   */
  mx_local.draw = new MapxDraw({
    map: map,
    controls,
  });
  mx_local.draw.on("enable", () => {
    setClickHandler({
      type: "draw",
      enable: true,
    });
  });
  mx_local.draw.on("disable", () => {
    setClickHandler({
      type: "draw",
      enable: false,
    });
  });

  /**
   * Add infobox handler
   * - if `mx_info_box` attribute exist when hovering the map,
   *   this module will display an infobox
   */
  mx_local.infobox = new MapInfoBox(map);

  /**
   * Add controls
   */
  map.addControl(new MapControlAttribution(), "bottom-right");
  map.addControl(new MapControlLiveCoord(), "bottom-right");
  map.addControl(new MapControlScale(), "bottom-right");
  map.addControl(new MapxLogo(), "bottom-left");

  /**
   * Init global listeners
   * -> no fire/events before this
   */
  initLog();
  initListenerGlobal();
  initMapListener(map);

  /**
   * Set initial globe button state
   */
  await events.fire("init_button_globe");

  /**
   * Load mapx app or static
   */
  if (settings.mode.static) {
    await initMapxStatic(o);
  } else {
    await initMapxApp(o);
  }

  return o;
}

export function initMapListener(map) {
  /**
   * Error handling
   */
  map.on("error", (e) => {
    errorHandler(e);
  });

  /**
   * Click event : build popup, ignore or redirect
   */
  map.on("click", (e) => {
    handleClickEvent(e, map.id);
  });

  /**
   * Move north arrow
   */
  map.on("rotate", () => {
    const r = -map.getBearing();
    const northArrow = document.querySelector(".mx-north-arrow");
    northArrow.style[cssTransformFun()] = "rotateZ(" + r + "deg) ";
  });

  /**
   * Highlight on event
   */
  highlighter.init(map);

  events.on({
    type: [
      "view_add",
      "view_remove",
      "story_step",
      "story_close",
      "view_panel_click",
    ],
    idGroup: "highlight_reset",
    callback: () => {
      highlighter.reset();
    },
  });

  events.on({
    type: ["set_map_projection", "set_map_pos", "init_button_globe"],
    idGroup: "globe_state",
    callback: updateButtonGlobe,
  });

  theme.on("set_colors", (colors) => {
    highlighter.setOptions({
      highlight_color: colors.mx_map_feature_highlight.color,
    });
  });

  map.on("moveend", () => {
    if (highlighter.isNotSet()) {
      return;
    }
    highlighter.update();
  });

  map.on("mousemove", (e) => {
    const layers = getLayerNamesByPrefix({
      id: map.id,
      prefix: "MX", // custom code could be MXCC ...
    });
    /**
     * Change cursor when hovering mapx layers : invite for click
     */
    const features = map.queryRenderedFeatures(e.point, { layers: layers });
    map.getCanvas().style.cursor = features.length ? "pointer" : "";

    /**
     * Change illuminaion direction accoding to mouse position
     * - Quite intensive on GPU.
     * - setPaintProperty seems buggy
     */
    if (0) {
      const elCanvas = map.getCanvas();
      const dpx = window.devicePixelRatio || 1;
      const wMap = elCanvas.width;
      const hMap = elCanvas.height;
      const x = e.point.x - wMap / (2 * dpx);
      const y = hMap / (2 * dpx) - e.point.y;
      const deg = xyToDegree(x, y);

      map.setPaintProperty(
        "hillshading",
        "hillshade-illumination-direction",
        deg,
      );
    }
  });
}

export async function initMapxStatic(o) {
  const mapData = getMapData();
  const zoomToViews = getQueryParameter("zoomToViews")[0];
  const language = getQueryParameter("language")[0] || getLanguageDefault();
  /**
   * NOTE: all views are
   */
  const idViewsQuery = getQueryParameter([
    "views",
    "viewsOpen",
    "idViews",
    "idViewsOpen",
  ]);

  const idViews = getArrayDistinct(idViewsQuery).reverse();
  const hasViews = idViews.length > 0;

  /**
   * Update language
   */
  await updateLanguage(language);

  /**
   * If no views, send mapx_ready early
   */
  if (hasViews) {
    /**
     * Get views and set order
     */
    const views = await getViewsRemote(idViews);
    mapData.views.push(...views);

    /*
     * If a story is found, ignore other options
     */
    const story = mapData.views.find((v) => v.type === "sm");
    if (story) {
      storyRead({
        id: o.id,
        idView: story.id,
        save: false,
        autoStart: true,
      });
      return;
    }
  }

  /**
   * Create button panel for legends
   * -> Story module add its own legend panel.
   */
  mx_local.panel_legend = new ButtonPanelLegend({
    id: "button_panel_legend_static",
    position: "top-left",
    tooltip_position: "right",
    container_classes: ["button-panel--shadow-inset"],
  });

  events.on({
    type: ["view_legend_updated", "view_removed", "view_added"],
    idGroup: "panel_legend",
    callback: () => {
      mx_local.panel_legend.resizeAuto("content");
    },
  });

  /**
   * If there are views, render all
   */
  if (hasViews) {
    /**
     * Display views
     */
    const elLegendContainer = mx_local.panel_legend.getContainer();
    const promAdd = mapData.views.map((view) => {
      return viewRender({
        view,
        elLegendContainer,
        addTitle: true,
      });
    });
    await Promise.all(promAdd);

    viewsLayersOrderUpdate({
      order: idViews.reverse(),
      orig: "init_mapx_static",
    });

    /**
     * Adapt the panel
     * - Note : in case of image of raster image,
     */
    mx_local.panel_legend.resizeAuto("content");

    /**
     * Extract all views bounds
     */
    if (zoomToViews) {
      const bounds = await getViewsBounds(mapData.views);
      fitMaxBounds(bounds);
    }
  }

  /**
   * Panels
   * - for app mode, handled in initMapx
   */
  const panelState = getQueryParameter("panels")[0];
  const panelControls = panels.get("controls_panel");

  if (isNotEmpty(panelState)) {
    /**
     * Execute batch commands
     */
    panels.batch(panelState);
  } else if (!settings.initClosedPanels) {
    /**
     * Init panel not closed, open
     */
    panelControls.open();
  }

  events.fire({
    type: "mapx_ready",
  });

  return;
}

/**
 * Init full app mode
 */
export async function initMapxApp(opt) {
  const map = opt.map;
  const elMap = map.getContainer();
  const hasShiny = isShinyReady();

  /**
   * Init app listeners: view add, language, project change, etc.
   */
  initListenersApp();

  /*
   * Fetch views
   */
  await updateViewsList({
    useQueryFilters: opt.useQueryFilters,
  });

  /*
   * If shiny, trigger read event
   */
  if (hasShiny) {
    Shiny.onInputChange("mx_client_ready", new Date());
  }

  /**
   * Handle drop view or spatial dataset
   */
  if (handleMapDragOver && handleMapDrop) {
    /**
     * Allow view to be dropped when global drag mode is enabled
     */
    elMap.classList.add("li-keep-enable-drop");

    /**
     * Listen to drag/drop
     */
    listeners.addListener({
      target: elMap,
      type: "dragover",
      callback: handleMapDragOver,
      group: "map_drag_over",
      bind: mx,
    });
    listeners.addListener({
      target: elMap,
      type: "drop",
      callback: handleMapDrop,
      group: "map_drag_over",
      bind: mx,
    });
  }

  /**
   * From now, query parameter should be requested using
   * getQueryParameterInit
   */
  cleanTemporaryQueryParameters();

  /**
   * Fire ready event
   */
  events.fire({
    type: "mapx_ready",
  });
}

/**
 * Update globe buttton state
 */
async function updateButtonGlobe() {
  const map = getMap();
  const btnGlobe = controls.get("btn_globe");
  const hasMaxBounds = !!map.getMaxBounds();

  if (hasMaxBounds) {
    btnGlobe.disable();
    btnGlobe.lock();
    await setMapProjection({
      skipEvent: true,
      name: "mercator",
      origin: "event",
    });
  } else {
    btnGlobe.unlock();
  }

  const isGlobe = settings.projection.name === "globe";

  /**
   * Set button state
   */
  if (isGlobe) {
    btnGlobe.enable();
  } else {
    btnGlobe.disable();
  }
}

/**
 * Handle click event
 * @param {Object} e Mapboxgl event object
 */
export async function handleClickEvent(e, idMap) {
  const type = e.type;
  const hasLayer = getLayerNamesByPrefix().length > 0;
  const map = getMap(idMap);
  const clickModes = getClickHandlers();
  const hasDashboard = clickModes.includes("dashboard");
  const hasDraw = clickModes.includes("draw");
  const hasSdk = clickModes.includes("sdk");
  const hasCC = clickModes.includes("cc");
  const addWidget = !(hasDashboard || hasCC || hasSdk || hasDraw);
  const addHighlight = !hasDraw && !hasDashboard;

  const retrieveAttributes = addWidget || hasSdk;

  if (!hasLayer && type !== "click") {
    return;
  }

  if (!retrieveAttributes) {
    return;
  }
  /*
   * Extract attributes, return an object with idView
   * as key and promises as value
   * e.g. {MX-OTXV7-C2HI3-Z7XLJ: Promise}
   *
   */
  const layersAttributes = await getLayersPropertiesAtPoint({
    map: map,
    point: e.point,
    type: ["vt", "gj", "cc", "rt"],
    asObject: true,
  });

  if (isEmpty(layersAttributes)) {
    return;
  }

  if (addWidget) {
    const fw = new FeaturesToWidget();

    window._fw = fw;
    fw.on("destroyed", () => {
      highlighter.reset();
    });

    events.once({
      type: [
        "view_remove",
        "view_add",
        "story_step",
        "story_lock",
        "story_close",
        "view_filter_legend",
      ],
      idGroup: "click_feature_widget",
      callback: () => {
        fw.destroy();
      },
    });

    await fw.init({
      layersAttributes,
    });
  }

  if (addHighlight) {
    highlighter.set({ point: e.point });
  }

  /**
   * Dispatch to event
   * - If something listens to "click_attributes", return values
   */
  await attributesToEvent(layersAttributes, e);
}

/**
 * Fire an event with resolved list of attributes per layer.
 * @param {Object} List of promise of attributes with layers id as key
 * @param {Event} e Map click event
 */
async function attributesToEvent(layersAttributes, e) {
  const isValid = isObject(layersAttributes) && isObject(e);

  if (!isValid) {
    return;
  }

  /**
   * Produce an event per attributes
   */
  const idViews = Object.keys(layersAttributes);
  const nViews = idViews.length;
  let processed = 0;
  for (let idView in layersAttributes) {
    await dispatch(layersAttributes, idView);
  }
  /**
   * Wait promise and fire event with attributes values as
   * data
   */
  async function dispatch(layersAttributes, idView) {
    const attributes = await layersAttributes[idView];
    events.fire({
      type: "click_attributes",
      data: {
        part: ++processed,
        nPart: nViews,
        idView: idView,
        attributes: attributes,
        point: e.point,
        lngLat: e.lngLat,
      },
    });
  }
}

/**
 * Get local forage item and send it to shiny app
 * @param {Object} o options
 * @param {String} o.idStore Id/Name of the store
 * @param {String} o.idKey Key to retrieve
 * @param {String} o.idInput Which id to trigger in Shiny
 */
export function getLocalForageData(o) {
  const db = mx_storage[o.idStore];
  db.getItem(o.idKey).then((item) => {
    Shiny.onInputChange(o.idInput, {
      item: item,
      time: new Date(),
    });
  });
}

/**
 * Geolocate user on click
 * @return null
 */
export function geolocateUser() {
  const lang = getLanguageCurrent();
  const hasGeolocator = !!navigator.geolocation;

  const o = { idMap: settings.map.id };
  const map = getMap(o.idMap);
  const options = {
    enableHighAccuracy: false,
    timeout: 5000,
    maximumAge: 0,
  };

  if (hasGeolocator) {
    setBusy(true);
    navigator.geolocation.getCurrentPosition(success, error, options);
  } else {
    error({ message: "Browser not compatible" });
  }

  function success(pos) {
    setBusy(false);
    const crd = pos.coords;
    map.flyTo({ center: [crd.longitude, crd.latitude], zoom: 10 });
  }

  function error(err) {
    getDictItem(
      ["error_cant_geolocate_msg", "error_geolocate_issue"],
      lang,
    ).then((it) => {
      setBusy(false);
      modal({
        id: "geolocate_error",
        title: it[1],
        content: "<p> " + it[0] + "</p> <p> ( " + err.message + " ) </p>",
      });
    });
  }
}

/**
 * Reset project : remove view, dashboards, etc
 * NOTE: Shiny require at least one argument. Not used, but, needed.
 *
 */
export function viewsCloseAll(o) {
  o = o || {};
  /*
   * Close and remove layers
   */
  const views = getViews();
  const removed = views.map((view) => {
    return viewRemove(view.id);
  });
  return Promise.all(removed);
}

export async function addSourceFromView({ view, noLocationCheck, map }) {
  const vType = path(view, "type");
  const validType = ["vt", "rt", "gj"].includes(vType);
  const hasSource = Boolean(path(view, "data.source"));

  if (!validType || !hasSource) {
    return false;
  }

  const idSource = `${view.id}-SRC`;

  const currentProjectId = path(mx, "settings.project.id");
  const viewProjectId = path(view, "project");
  const projectsView = path(view, "data.projects", []);
  const useMirror = path(view, "data.source.useMirror");

  checkAndSetViewEditability(
    view,
    noLocationCheck,
    currentProjectId,
    viewProjectId,
    projectsView,
  );

  if (vType === "vt") {
    setSourceViewVt(view);
  }

  if (vType === "gj") {
    setSourceViewGj(view);
  }

  const source = clone(view.data.source);

  if (vType === "rt" && useMirror) {
    modifyTileUrlsToMirror(source);
  }

  removeOldSourceIfExists(view, map, idSource);
  map.addSource(idSource, source);
}

/**
 * Configure view object: source urls and promoted id
 * @pramam {Object} view
 * @returns void
 */
function setSourceViewVt(view) {
  const urlBase = getApiUrl("getTile");
  const useServerCache = settings.tiles.vector.useCache;
  const usePostgisTiles = settings.tiles.vector.usePostgisTiles;
  // URL API escape {x}/{y}/{z}, use concat
  const url =
    `${urlBase}?idView=${view.id}&` +
    `timestamp=${view.date_modified}&` +
    (usePostgisTiles === true ? `usePostgisTiles=true&` : "") +
    (useServerCache === false ? `skipCache=true&` : "");

  view.data.source.tiles = [url, url];
  view.data.source.promoteId = "gid";
}

function setSourceViewGj(view) {
  let gid = 1;
  const features = view?.data?.source?.data?.features || [];
  for (const f of features) {
    if (isEmpty(f.properties)) {
      f.properties = {};
    }
    if (!f.properties.gid) {
      f.properties.gid = gid++;
    }
  }
  view.data.source.promoteId = "gid";
}

function checkAndSetViewEditability(
  view,
  noLocationCheck,
  currentProjectId,
  viewProjectId,
  projectsView,
) {
  const isEditable = isViewEditable(view);
  const isLocationOk =
    noLocationCheck ||
    viewProjectId === currentProjectId ||
    projectsView.indexOf(currentProjectId) > -1;

  if (!isLocationOk && isEditable) {
    view._edit = false;
  }
}

/**
 * Remove source safely
 */
function removeOldSourceIfExists(view, map, idSource) {
  /**
   * Direct layer removal, if called outside a view context
   */
  removeLayersByPrefix({
    prefix: view.id,
    map,
  });

  const sourceExists = isNotEmpty(map.getSource(idSource));

  if (!sourceExists) {
    return false;
  }
  /*
   * Bug in mapbox gl with updatingTerrain ( #12747 )
   * -> "Cannot read properties of undefined (reading 'get')"
   * -> fails when removing layer and right after, their source.
   * -> Waiting a bit seems to solve the issue;
   * UPDATE
   * -> If waiting, produce inconsistant state later
   * -> Removing waitTimeoutAsync
   * await waitTimeoutAsync(100);
   */
  map.removeSource(idSource);

  return true;
}

function modifyTileUrlsToMirror(source) {
  const tiles = source.tiles;
  for (let i = 0, iL = tiles.length; i < iL; i++) {
    tiles[i] = mirrorUrlCreate(tiles[i]);
  }
}

/**
 * Get remote view from latest views table
 * @param {String} idView id of the view
 * @return {Promise} Promise resolving to object
 */
export async function getViewRemote(idView) {
  const apiUrlViews = getApiUrl("getView");
  const isViewValid = isView(idView);

  if (isViewValid) {
    return idView;
  }

  const isValid = isViewId(idView) && isUrl(apiUrlViews);

  if (!isValid) {
    throw new Error("Invalid view id or URL");
  }

  /*
   * View URL, + date to avoid cache
   */
  const keyNet = `${apiUrlViews}${idView}?date=${Date.now()}`;

  const res = await fetch(keyNet);

  if (res.status !== 200) {
    return null;
  }

  const view = await res.json();

  if (isView(view)) {
    view._edit = false;
    view._static = true;
  }

  return view;
}

/**
 * Get view local or remote, but prefer local over remote
 * @param {String|Object} idView View id or view
 * @return {Promise<Object>}
 */
export async function getViewAuto(idView) {
  const view = getView(idView) || (await getViewRemote(idView));
  const valid = isView(view);
  if (!valid) {
    throw new Error(`View not found: ${JSON.stringify(idView)}`);
  }
  const views = getViews();

  if (!views.includes(view)) {
    views.push(view);
  }

  return view;
}

/**
 * Get multipler remote views from latest views table
 * @param {Array} idViews array of views id
 * @return {Promise<array>} Promise resolving to an array of views
 */
export async function getViewsRemote(idViews) {
  const viewsProm = [];
  const idViewsToFetch = getArrayDistinct(idViews);
  for (const id of idViewsToFetch) {
    const viewProm = getViewRemote(id);
    viewsProm.push(viewProm);
  }
  const views = await Promise.all(viewsProm);
  return views.filter(isView);
}

/**
 * Save view list to views
 * @param {Object} opt options
 * @param {String} opt.id ID of the map
 * @param {String} opt.project ID of the project
 * @param {Array} opt.viewsList views list
 * @param {Boolean} opt.render Render given view
 * @param {Boolean} opt.resetView Reset given view
 * @param {Boolean} opt.useQueryFilters In fetch all mode, use query filters
 */
export async function updateViewsList(opt) {
  const views = [];
  let elProgContainer;
  let nCache = 0,
    nNetwork = 0,
    nTot = 0,
    prog;

  const progressColor = theme.getColorThemeItem("mx_ui_link");
  /*
   * See default used:
   * - app/src/r/server/view_update_client.R
   * - app/src/r/helpers/binding_mgl.R
   */
  const def = {
    id: "map_main",
    project: path(mx, "settings.project.id"),
    viewsList: [],
    render: false,
    resetViews: false,
    useQueryFilters: true,
  };
  updateIfEmpty(opt, def);
  const viewsToAdd = opt.viewsList;
  const hasViewsList = isArrayOfViews(viewsToAdd) && isNotEmpty(viewsToAdd);

  if (hasViewsList) {
    nTot = viewsToAdd.length;
  }

  /**
   * Set fetch mode
   */
  if (hasViewsList) {
    /* Views are given, add them */
    views.push(viewsToAdd);
    await addLocal(viewsToAdd);
  } else {
    /* Views should be fetched */
    views.push(...(await addAsyncAll()));
  }

  /**
   * Remove progress if it has been instanciated. See :
   *  - updateProgress
   */
  if (prog instanceof RadialProgress) {
    prog.destroy();
  }

  return views;

  /**
   * Helpers
   */

  /* Add all view from automatic fetch. */
  async function addAsyncAll() {
    const views = [];
    const state = [];
    /**
     * Local GeoJSON views
     */
    const viewsGeoJSON = await getGeoJSONViewsFromStorage({
      project: opt.project,
    });
    views.push(...viewsGeoJSON);

    /**
     * Remote views
     */
    const data = await fetchViews({
      onProgress: updateProgress,
      idProject: opt.project,
      useQueryFilters: opt.useQueryFilters,
    });
    views.push(...data.views);
    state.push(
      ...data.states.reduce((a, s) => {
        if (s.id === "default") {
          return s.state;
        } else {
          return a;
        }
      }, state),
    );

    /**
     * Render
     */
    await viewsListRenderNew({
      id: opt.id,
      views: views,
      state: state,
    });

    /**
     * Add additional logic if query param should be used
     */
    if (opt.useQueryFilters) {
      const conf = getQueryInit();
      const viewsList = getViewsList();

      /**
       * Set flat mode (hide categories)
       */
      if (conf.isFlatMode) {
        viewsList.setModeFlat(true, { permanent: true });
      }
      const idViewsOpen = conf.idViewsOpen;
      const isFilterActivated = conf.isFilterActivated;

      /**
       * Move view to open to the top
       */
      if (isNotEmpty(idViewsOpen)) {
        const idViewsOpenInv = idViewsOpen.reverse();
        viewsList.setModeAnimate(false);
        for (const id of idViewsOpenInv) {
          viewsList.moveTargetTop(id);
        }
        viewsList.setModeAnimate(true);
      }

      /**
       * Add views views
       */
      for (const id of idViewsOpen) {
        await viewAdd(id);
      }

      /**
       * If any view requested to be open, filter activated
       */
      if (isFilterActivated && idViewsOpen.length > 0) {
        const viewsFilter = getViewsFilter();
        viewsFilter.filterActivated(true);
      }

      /**
       * Update layers order
       */
      layersOrderAuto("update_views_list");
    }

    events.fire({
      type: "views_list_updated",
    });

    return views;
  }

  /* Add single view object, typically after an update */
  async function addLocal(view) {
    if (isArrayOfViews(view)) {
      view = view[0];
    }
    await viewsListAddSingle(view, {
      open: true,
      render: true,
    });
    events.fire({
      type: "views_list_updated",
    });
    events.fire({
      type: "view_created",
    });
    return view;
  }

  /* Update progress */
  function updateProgress(d) {
    d = d || {
      loaded: nCache + nNetwork,
      total: nTot,
    };

    /**
     * Init
     */

    if (!elProgContainer) {
      elProgContainer = document.querySelector(".mx-views-list");
    }

    if (!prog && elProgContainer) {
      elProgContainer.replaceChildren();
      prog = new RadialProgress(elProgContainer, {
        radius: 30,
        stroke: 4,
        strokeColor: progressColor,
      });
    }

    /**
     * Update
     */

    if (prog instanceof RadialProgress && prog.update && elProgContainer) {
      prog.update((d.loaded / d.total) * 100);
    }
  }
}

/**
 * Load geojson from localstorage,
 * @param {Object} o options
 * @param {String} o.project Current project to filter geojson view. Default to settings.project
 * @return {Promise<Array>} array of views;
 */
export async function getGeoJSONViewsFromStorage(o) {
  const out = [];

  const project = o.project || settings.project.id;
  /**
   * extract views from local storage
   */
  await mx_storage.geojson.iterate((value) => {
    const view = value.view;
    if (view.project === project) {
      out.push(view);
    }
  });
  return out;
}

/**
 * Update server side with views status
 */
export async function viewsCheckedUpdate() {
  const hasShiny = isShinyReady();
  if (!hasShiny) {
    return;
  }
  const summary = {
    vVisible: getViewsLayersVisibles(),
    vChecked: getViewsListOpen(),
  };
  Shiny.onInputChange("mx_client_views_status", summary);
}

/**
 * Get id of views with visible layers on map
 * @return {Array}
 */
export function getViewsLayersVisibles(reverse) {
  const views = getLayerNamesByPrefix({
    prefix: "MX-",
    base: true,
  });

  if (reverse) {
    views.reverse();
  }

  return views;
}

/**
 * Manual events on view list items
 * @param {object} o options
 * @param {string} o.id Map id
 * @param {string} o.idView view id
 * @param {string} o.action Action :  "check", "uncheck"
 */
export function viewLiAction(o) {
  if (!o.idView || !o.action) {
    return;
  }

  const el = document.getElementById(o.idView);

  if (!el) {
    return;
  }

  const elInput = el.querySelector(
    "input[data-view_action_key='btn_toggle_view']",
  );

  if (o.action === "check" && elInput && !elInput.checked) {
    el.checked = true;
  }

  if (o.action === "uncheck" && elInput && elInput.checked) {
    el.checked = false;
  }
}

/**
 * Get sprite / image data from mapbox imageManager
 * @param {String} id Sprite id
 * @param {Object} opt Options
 * @param {String} opt.color Optional color suported by chroma
 * @return {Object} Sprite {<height>,<width>,<widthDrp>,<heightDpr>,<url()>}
 */
export function getSpriteImage(id, opt) {
  if (isEmpty(id) || id === "none") {
    return;
  }

  updateIfEmpty(opt, { color: null });

  const map = getMap();
  const sprite = map.style.imageManager.images[id];
  if (!sprite) {
    console.warn(`Unknown sprite ${id}`);
  }
  const out = {
    widthDpr: sprite.data.width,
    heightDpr: sprite.data.height,
    width: sprite.data.width / sprite.pixelRatio,
    height: sprite.data.height / sprite.pixelRatio,
  };

  out.url = (color) => {
    color = color || opt.color;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = out.widthDpr;
    canvas.height = out.heightDpr;
    canvas.style.height = `${out.height}px`;
    canvas.style.width = `${out.width}px`;
    const imData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    imData.data.set(sprite.data.data);
    if (color) {
      let i, j, u;
      const rgba = chroma(color).rgba();
      const n = imData.data.length;
      // convert + floor alpha 0-1 to 0-255
      rgba[3] = ~~(rgba[3] * 255);
      // loop pixels
      for (i = 0; i < n; i += 4) {
        // test if pixel is visible
        u =
          imData.data[i] > 1 ||
          imData.data[i + 1] > 1 ||
          imData.data[i + 2] > 1;
        if (u) {
          // replace color
          for (j = 0; j < 4; j++) {
            imData.data[i + j] = rgba[j];
          }
        }
      }
    }
    ctx.putImageData(imData, 0, 0);
    return canvas.toDataURL("image/png");
  };

  return out;
}

/**
 * Get views order from list
 *  - app : ui list / user order
 *  - static :views_active / original order
 * @returns {Array}
 */
export function getViewsOrder() {
  const isStatic = !!settings.mode.static;
  const order = isStatic
    ? Array.from(mx_local.views_active)
    : getViewsListOrder();
  return order;
}

/**
 * Set layers position according to current views order
 * - app : list of view
 * - static : current views_active NOTE: will change
 * @param {string} orgin Label to keep track of the origin of the request
 * @return {Array} order
 */
export function layersOrderAuto(origin) {
  const order = getViewsOrder();
  return viewsLayersOrderUpdate({
    order,
    orig: origin || "views_list_order",
  });
}

/**
 * Update layer order based on view list position
 * @param {Object} o Options
 * @param {String} o.id Id of the map
 * @param {Array} o.order Array of layer base name.
 * @param {String} o.orig Id of the caller
 * @param {Boolean} o.debug Debug mode - print state
 * @return {Array} order
 */
export function viewsLayersOrderUpdate(o) {
  const opt = Object.assign(
    {},
    { order: null, id: null, orig: null, debug: false },
    o,
  );
  /**
   * Get order list by priority :
   * 1) Given order
   * 2) Order of displayed views (ui, list)
   * 3) Views list
   */
  const map = getMap(opt.id);
  const order = opt.order || [];

  if (!isArray(order)) {
    throw new Error("Missing order");
  }
  if (opt.debug) {
    console.table(order.map(getViewTitle));
  }

  /**
   * Get displayed layer
   */
  const layersDiplayed = getLayerByPrefix({
    prefix: /^MX-/,
  });

  /**
   * For each group (view id) [a,b,c],
   * 1) Get corresponding layers [a_1,a_0],
   * 2) Set inner order [a_0,a_1]
   * 3) Push result
   */
  let incView = 0;
  let idPrevious;
  const sorted = [];
  for (let idView of order) {
    /**
     * Amongst visible layers, does a layer match view's order item ?
     * -> cc views: layer.id should match idView
     * -> vt,rt,gj views : layer.metadata.idView should match idView
     */
    const layersView = layersDiplayed.filter((layer) => {
      return layer?.id === idView || layer?.metadata?.idView === idView;
    });

    if (layersView.length > 0) {
      /*
       * Sort layers within view context
       */
      sortLayers(layersView);

      /**
       * Sort layer within map context
       */
      for (let layer of layersView) {
        const firstOfAll = incView++ === 0;
        const idBefore = firstOfAll ? settings.layerBefore : idPrevious;
        map.moveLayer(layer.id, idBefore);
        idPrevious = layer.id;
        sorted.push({ id: layer.id, idBefore });
      }
    }
  }

  events.fire({
    type: "layers_ordered",
    data: {
      layers: order,
    },
  });
  return order;
}

/**
 * Sort layer helper
 *
 * Set layers order, while keeping priority in order:
 *
 * true     false
 * ----     -----
 * 0,1      1,1
 * 0,0      1,0
 * 1,1      0,1
 * 1,0      0,0
 *
 * Last layer will be on top
 *
 * @param {Array} layers Layers list, with metadata attribute
 * @param {Boolean} reverse Reverse pos, keep priority
 */
export function sortLayers(layers, reverse) {
  layers.sort((a, b) => {
    const ap = a.metadata.position;
    const ar = a.metadata.priority;
    const bp = b.metadata.position;
    const br = b.metadata.priority;
    const d1 = reverse ? bp - ap : ap - bp;
    if (d1 !== 0) {
      return d1;
    }
    return ar - br;
  });
}

/**
 * Update view in params
 */
export function updateViewParams(o) {
  o = o || { id: getMap() };

  const displayed = getLayerNamesByPrefix({
    id: o.id,
    prefix: "MX-",
    base: true,
  });

  setQueryParameters({ views: displayed });
}

/**
 * Get the current view order
 * @return {Array} view id array or null
 */
export function getViewsListOrder() {
  const viewContainer = document.querySelector(".mx-views-list");
  const out = new Set();
  if (!viewContainer) {
    return [];
  }
  const els = viewContainer.querySelectorAll(".mx-view-item");
  for (const el of els) {
    out.add(el.dataset.view_id);
  }
  return Array.from(out);
}

/**
 * Get id of all views opened
 * @return {Array}
 */
export function getViewsListOpen() {
  const open = [];
  const viewOrder = getViewsListOrder();
  for (let idView of viewOrder) {
    if (isViewOpen(idView)) {
      open.push(idView);
    }
  }
  return open;
}

/**
 * Get list of active views ( no specific order )
 * @return {Array} Array of views array
 */
export function getViewsActive() {
  return Array.from(mx_local.views_active);
}

/**
 * Remove view from views list and geojson database
 * @param {Object|String} view View or view id to remove from the list
 */
export async function viewDelete(view) {
  const mData = getMapData();
  const views = getViews();
  view = getView(view);
  const exists = views.includes(view);

  if (!exists) {
    throw new Error("viewDelete : view does not exist");
  }

  const vIndex = views.indexOf(view);
  const geojsonData = mx_storage.geojson;

  await viewClear({
    idView: view.id,
  });
  mData.viewsList.removeItemById(view.id);

  if (view.type === "gj") {
    geojsonData.removeItem(view.id);
  }

  views.splice(vIndex, 1);

  events.fire({
    type: "view_deleted",
  });
  return true;
}

/**
 * Close view and clean its modules
 * @param {Object} o options;
 * @param {String} o.id map id
 * @param {String} o.idView view id
 * @param {Object} o.view view
 */
export async function viewClear(o) {
  const view = o.view || getView(o.idView);
  o.id = o.id || settings.map.id;

  if (!isView(view)) {
    throw new Error("viewClear : view not found");
  }

  const now = Date.now();
  const viewDuration = now - view._added_at || 0;

  delete view._added_at;

  await viewModulesRemove(view);

  events.fire({
    type: "view_remove",
    data: {
      idView: o.idView,
      view: getViewJson(view, { asString: false }),
    },
  });

  removeLayersByPrefix({
    id: o.id,
    prefix: o.idView,
  });

  mx_local.views_active.delete(view.id);

  events.fire({
    type: "view_removed",
    data: {
      idView: o.idView,
      time: now,
      duration: viewDuration,
    },
  });

  if (view._elLegendGroup) {
    view._elLegendGroup.remove();
  }

  return true;
}

/**
 * Get view, open it and add layers if any
 * @param {String|Object} idView View to open
 * @return {Promise} Boolean
 */
export async function viewAdd(idView) {
  try {
    const view = await getViewAuto(idView);
    if (!isView(view)) {
      throw new Error("viewAdd : not a view");
    }

    if (view._vb instanceof ViewBase) {
      view._vb.open();
    }

    await viewRender({
      view: view,
    });

    await updateLanguageElements({
      el: getViewEl(view),
    });
    return true;
  } catch (e) {
    console.warn(e);
    return false;
  }
}

/**
 * Automatically add and open a view
 * - static/app mode
 * - from local or remote source
 * @param {string} idView View id
 * @param {Object} options options
 * @returns {Promise<boolean>}
 */
export async function viewAddAuto(idView, options) {
  options = Object.assign({}, { zoomToView: false }, options);
  const view = await getViewAuto(idView);
  const isApp = !!settings.mode.app;
  const isInstance = isViewInstance(view);

  if (isApp && !isInstance) {
    await viewsListAddSingle(view, { open: true });
  } else if (isApp) {
    await viewAdd(view);
  } else {
    await viewRender({
      view: view,
      elLegendContainer: mx_local.panel_legend.getContainer(),
      addTitle: true,
    });
  }

  if (options.zoomToView) {
    const bounds = await getViewsBounds(view);
    const ok = fitMaxBounds(bounds);
    return ok;
  }
  return true;
}

/**
 * Removed both view UI and layers, handle view_removed event
 * @param {String|Object} idView View id or view
 * @return {Promise<Boolean>} Boolean
 */
export async function viewRemove(idView) {
  try {
    const view = getView(idView);

    if (!isView(view)) {
      throw new Error("viewRemove : view not found");
    }
    /**
     * Close UI
     * - Layers can take a while
     * - Search list need quickly an
     *   event to trigger toggles
     * - vb.close triggers viewRemove too
     */
    if (view._vb instanceof ViewBase) {
      view._vb.close();
    }

    await viewClear({
      idView: view.id,
    });

    return true;
  } catch (e) {
    console.warn(e);
    return false;
  }
}

/**
 * Get view el
 * @param {Object} view View
 */
export function getViewEl(view) {
  return view._el || document.querySelector("[data-view_id='" + view.id + "']");
}

/**
 * Get layer by id
 * @param {Object} o options
 * @param {string} o.id Map id
 * @param {string} o.idLayer id of the layer
 * @return {array} of layers
 *
 */
export function getLayerById(o) {
  o = o || {};
  o.idLayer = o.idLayer || "";
  const map = getMap(o.id);
  const result = [];

  if (map && o.idLayer) {
    const layer = map.getLayer(o.idLayer);
    if (layer) {
      result.push(layer);
    }
  }
  return result;
}

/**
 * Get the layer base name
 * @param {String} str Layer name to convert
 */
export function getLayerBaseName(str) {
  return str.split(settings.separators.sublayer)[0];
}

/**
 * Get layer by prefix
 * @param  {Object} o options
 * @param {String} o.id Map id
 * @param {Object} o.map (optional) Map object
 * @param {String} o.prefix Prefix to search for
 * @param {Boolean} o.nameOnly Output layer id only (dedup)
 * @param {Boolean} o.base should return base layer only
 * @return {Array} Array of layer names / ids
 */
export function getLayerByPrefix(o) {
  o = Object.assign(
    {},
    {
      prefix: /^MX/,
      base: false,
      nameOnly: false,
    },
    o,
  );

  const map = o.map || getMap(o.id);

  if (!isRegExp(o.prefix)) {
    o.prefix = new RegExp("^" + o.prefix);
  }

  const layers = map
    .getStyle()
    .layers.filter((layer) => layer.id.match(o.prefix));

  if (o.nameOnly) {
    const layerNames = layers.map((l) =>
      o.base ? getLayerBaseName(l.id) : l.id,
    );
    return getArrayDistinct(layerNames);
  } else {
    return layers;
  }
}

/**
 * Get layer names by prefix
 */
export function getLayerNamesByPrefix(o) {
  o = Object.assign({}, { nameOnly: true }, o);
  return getLayerByPrefix(o);
}

/**
 * Remove multiple layers by prefix
 * @param {object} o options
 * @param {string} o.id Map element id
 * @param {Object} o.map (optional) Map object
 * @param {string} o.prefix Prefix to search for in layers, if something found, remove it
 * @return {array} List of removed layer
 */
export function removeLayersByPrefix(o) {
  const result = [];
  const map = o.map || getMap(o.id);

  if (!map) {
    return result;
  }

  const layers = getLayerNamesByPrefix({
    map: map,
    prefix: o.prefix,
  });

  for (const l of layers) {
    if (map.getLayer(l)) {
      map.removeLayer(l);
      result.push(l);
    }
  }
  return result;
}

/**
 * Search for registered maps and enable/disable position synchronisation
 * @param {object} o options
 * @param {boolean} [o.enabled=false]  Enable synchronisation
 */
export function syncAll(o) {
  let enabled, maps, ids;

  enabled = o.enabled;

  if (!enabled) {
    enabled = false;
  }

  ids = [];

  for (const m in maps) {
    ids.push(m);
  }

  ids.forEach(function (x) {
    let others, m, locked, exists, pos, m2;

    others = [];

    ids.forEach(function (i) {
      if (i !== x) {
        others.push(i);
      }
    });

    locked = false;
    m = maps[x].map;
    exists = maps[x].listener.sync;

    if (enabled) {
      if (!exists) {
        maps[x].listener.sync = function () {
          if (!locked) {
            pos = {
              center: m.getCenter(),
              zoom: m.getZoom(),
              pitch: m.getPitch(),
              bearing: m.getBearing(),
            };
            locked = true;
            others.forEach(function (o) {
              m2 = maps[o].map;
              m2.setCenter(pos.center);
              m2.setZoom(pos.zoom);
              m2.setPitch(pos.pitch);
              m2.setBearing(pos.bearing);
            });
            locked = false;
          }
        };
      }

      m.on("move", maps[x].listener.sync);
    } else {
      if (exists) {
        m.off("move", maps[x].listener.sync);
      }
    }
  });
}

/**
 *  Test if a key-value pair exist in a list
 * @param {object} li Object for the recursive search
 * @param {string} it Named key
 * @param {any} val Corresponding value
 * @param {boolean} [inverse=false] Return true if the key value pair is not found
 * @return {boolean} exists (or not depending of inverse)
 */
export function existsInList(li, it, val, inverse) {
  if (!inverse) {
    for (const i in li) {
      if (
        i === it &&
        (li[i] === val ||
          (typeof val === "object" &&
            JSON.stringify(li[i]) === JSON.stringify(val)))
      ) {
        return true;
      } else if (typeof li[i] === "object") {
        if (this.existsInList(li[i], it, val, inverse)) {
          return true;
        }
      }
    }
    return false;
  } else {
    for (const j in li) {
      if (
        j === it &&
        (li[j] !== val ||
          (typeof val === "object" &&
            JSON.stringify(li[j]) !== JSON.stringify(val)))
      ) {
        return true;
      } else if (typeof li[j] === "object") {
        if (this.existsInList(li[j], it, val, inverse)) {
          return true;
        }
      }
    }
    return false;
  }
}

/**
 * Add MapX view's layer on the map
 * @param {object} o Options
 * @param {string} o.id map id
 * @param {string} o.idView view id
 * @param {object} o.view view
 * @param {Element} o.elLegendContainer Legend container
 * @param {boolean} o.addTitle Add view title in legend
 * @param {string} o.before Layer before which insert this view layer(s)
 * @param
 */
export async function viewRender(o) {
  await viewClear(o);

  const m = getMapData(o.id);
  if (o.idView) {
    o.idView = o.idView.split(settings.separators.sublayer)[0];
  }
  if (!o.elLegendContainer && mx_local.panel_legend) {
    o.elLegendContainer = mx_local.panel_legend.getContainer();
  }
  const isStory = isStoryPlaying();
  const idLayerBefore = o.before
    ? getLayerNamesByPrefix({ prefix: o.before })[0]
    : settings.layerBefore;

  /**
   * Solve case where view is not set : try to fetch remote
   */
  const view = await getViewAuto(o.view || o.idView);

  /*
   * Validation
   */
  if (!isView(view)) {
    console.warn(
      "viewLayerAdd : view not found, locally or remotely. Options:",
      o,
    );
    return;
  }

  const idView = view.id;
  const idMap = o.id || settings.map.id;
  const idType = view.type;

  /**
   * Fire view add event
   * -> view_added when done
   */
  events.fire({
    type: "view_add",
    data: {
      idView: idView,
      view: getViewJson(view, { asString: false }),
    },
  });

  /*
   * Remove previous layer if needed
   */
  removeLayersByPrefix({
    id: idMap,
    prefix: idView,
  });

  /*
   * Remove modules if needed
   */
  await viewModulesRemove(view);

  /**
   * Add content
   */
  await viewUiContent(view);

  /**
   * Set/Reset filter
   */
  await viewFiltersInit(view);

  /**
   * Add source from view
   */
  await addSourceFromView({
    map: m.map,
    view: view,
  });

  /*
   * Add views layers
   */
  await handleLayer(idType);

  /**
   * Update layers order according to current list
   */
  layersOrderAuto("view_layer_add_vt");

  /**
   * Create dashboard.
   * - As story steps could manage dashboard state,
   *   it's rendered inside the story
   */
  if (!isStory) {
    await dashboard.createFromView(view);
    await dashboard.autoDestroy();
  }

  /**
   * View added fully : send event
   */
  view._added_at = Date.now();

  mx_local.views_active.add(view.id);

  events.fire({
    type: "view_added",
    data: {
      idView: view.id,
      time: view._added_at,
    },
  });

  return true;

  /**
   * handler based on view type
   */
  async function handleLayer(viewType) {
    let res;
    switch (viewType) {
      case "rt":
        res = await viewRenderRt({
          view: view,
          map: m.map,
          before: idLayerBefore,
          elLegendContainer: o.elLegendContainer,
          addTitle: o.addTitle,
        });
        break;
      case "cc":
        res = await viewRenderCc({
          view: view,
          map: m.map,
          before: idLayerBefore,
          elLegendContainer: o.elLegendContainer,
          addTitle: o.addTitle,
        });
        break;
      case "vt":
        res = await viewRenderVt({
          view: view,
          map: m.map,
          debug: o.debug,
          before: idLayerBefore,
          elLegendContainer: o.elLegendContainer,
          addTitle: o.addTitle,
        });
        break;
      case "gj":
        res = await viewRenderGj({
          view: view,
          map: m.map,
          before: idLayerBefore,
          elLegendContainer: o.elLegendContainer,
          addTitle: o.addTitle,
        });
      case "sm":
        res = true;
        break;
      default:
        res = false;
    }
    return res;
  }
}

/**
 * Get link to view, current mode/location
 * @param {String|Object} idView idView or view
 * @param {Boolean} useStatic
 * @return {String>} url to the view
 */
export function viewLink(idView, opt) {
  if (isView(idView)) {
    idView = idView.id;
  }
  const def = {
    useStatic: true,
    project: settings.project.id,
    asString: false,
    zoomToView: true,
  };

  /**
   * Apply options
   */
  opt = Object.assign({}, def, opt);

  const urlView = new URL(window.location);
  urlView.search = "";
  if (opt.useStatic) {
    urlView.pathname = settings.paths.static;
    urlView.searchParams.append("views", idView);
  } else if (opt.project) {
    urlView.searchParams.append("project", opt.project);
    urlView.searchParams.append("viewsOpen", idView);
  }

  /**
   * Use params from original parameters
   */
  const pInit = getQueryParametersInit();
  const pCurrent = getQueryParametersAsObject();
  const pAll = { ...pCurrent, ...pInit };

  const copyInit = [
    "useMaxBounds",
    "n",
    "s",
    "e",
    "w",
    "zoomMin",
    "zoomMax",
    "lng",
    "lat",
    "theme",
  ];

  for (const i of copyInit) {
    const v = pAll[i];
    if (isNotEmpty(v)) {
      urlView.searchParams.append(i, v);
    }
  }

  /**
   * Force zoomToViews
   */
  urlView.searchParams.append("zoomToViews", opt.zoomToView);

  /**
   * Return as string if required
   */
  if (opt.asString) {
    return urlView.toString();
  }
  return urlView;
}

/**
 * Get a legend object
 *
 * ⚠️  This was done to handle legends in legend container outside view element,
 * e.g. in static mode. This is fragile and probably too complex. Need
 * refactoring.
 *
 * @param {Object} view View
 * @param {Object} opt
 * @param {Boolean} opt.removeOld Remove old legend
 * @param {String} opt.type Type of view (vt, rt)
 * @param {Boolean} opt.addTitle Add title
 */
export function elLegendBuild(view, opt) {
  if (!isView(view)) {
    throw new Error("elLegend invalid view");
  }

  /**
   * Defaults
   */
  opt = Object.assign(
    {},
    {
      removeOld: true,
      type: "vt",
      addTitle: false,
      elLegendContainer: null,
      order: 0,
    },
    opt,
  );

  if (isEmpty(opt.order)) {
    const idViews = getQueryParameter("views");
    if (idViews.includes(view.id)) {
      opt.order = idViews.indexOf(view.id);
    }
  }

  const idView = view.id;
  const elView = getViewEl(view);
  const hasViewEl = isElement(elView);
  const idLegend = `view_legend_${idView}`;
  const hasExternalContainer = isElement(opt.elLegendContainer);

  /**
   * If no set external container, use container inside view element
   */
  if (hasViewEl && !hasExternalContainer) {
    opt.elLegendContainer = elView.querySelector(
      `#view_legend_container_${idView}`,
    );
  }

  /**
   * No container found in view or external
   */
  if (!opt.elLegendContainer) {
    console.warn("elLegend cant't find a legend container");
    return;
  }

  /**
   * Handle previous legends removal if needed
   */
  const elLegendContainer = opt.elLegendContainer;
  let hasLegend = elLegendContainer.childElementCount > 0;

  if (hasLegend && opt.removeOld) {
    if (view._elLegendGroup) {
      view._elLegendGroup.remove();
    }
    if (view._elLegend) {
      view._elLegend.remove();
    }
    hasLegend = elLegendContainer.childElementCount > 0;
  }

  /**
   * View title in legend
   * - static
   * - story
   */
  const title = getLabelFromObjectPath({
    obj: view,
    path: "data.title",
    defaultValue: "[ missing title ]",
  });

  const elLegendTitle = el(
    "span",
    {
      class: ["mx-legend-view-title", "text-muted", "hint--bottom"],
      "aria-label": `${title}`,
    },
    title,
  );

  const elLegendMeta = el(
    "span",
    {
      class: "hint--bottom",
      dataset: {
        view_action_key: "btn_opt_meta",
        view_action_target: view.id,
        lang_key: "btn_opt_meta",
        lang_type: "tooltip",
      },
    },
    el("i", {
      class: ["fa", "fa-info-circle", "text-muted", "mx-legend-btn-meta"],
    }),
  );

  /**
   * Legend element
   */
  const elLegend = el("div", {
    class: `mx-view-legend-${opt.type}`,
    id: idLegend,
  });

  /**
   * Legend group
   */
  const elLegendGroup = el(
    "div",
    {
      class: "mx-view-legend-group",
      dataset: { id_view: idView },
      style: { order: opt.order },
    },
    opt.addTitle ? [elLegendTitle, elLegend, elLegendMeta] : elLegend,
  );

  if (hasLegend) {
    /**
     * Stack legend in container
     */
    const elPreviousLegend = elLegendContainer.firstChild;
    elLegendContainer.insertBefore(elLegendGroup, elPreviousLegend);
  } else {
    /**
     * Add single legend
     */
    elLegendContainer.appendChild(elLegendGroup);
  }

  view._elLegend = elLegend;
  view._elLegendGroup = elLegendGroup;
  return elLegend;
}

/**
 * Get view legend as an image
 * @param {Options} opt Options
 * @param {String|View} opt.view View or view id
 * @param {String} opt.format image/jpeg, image/png Default = image/png
 * @return {String} Base64 Image
 */
export async function getViewLegendImage(opt) {
  opt = Object.assign({ format: "image/png" }, opt);
  const view = getView(opt.view);
  const isVt = isViewVt(view);
  const isRt = !isVt && isViewRt(view);
  const isValid = isVt || isRt;
  const isOpen = isViewOpen(view);

  let out = "";
  if (!isValid) {
    return Promise.reject("not valid");
  }

  if (isRt) {
    const legendUrl = path(view, "data.source.legend", null);
    if (!isUrl(legendUrl)) {
      return Promise.reject("no legend");
    }
    return urlToImageBase64(legendUrl);
  }

  if (isVt) {
    try {
      await viewAdd(view, "getViewLegendImage");

      const hasLegend = isElement(view._elLegend);

      if (!hasLegend) {
        close();
        return Promise.reject("no legend");
      }

      const elRules = view._elLegend.querySelector(".mx-legend-vt-rules");
      const hasRules = isElement(elRules);

      if (!hasRules) {
        close();
        return Promise.reject("no legend content");
      }
      const elRulesClone = elRules.cloneNode(true);
      document.body.appendChild(elRulesClone);
      elRulesClone.style.position = "absolute";
      elRulesClone.style.border = "none";
      elRulesClone.style.overflow = "visible";

      const html2canvas = await moduleLoad("html2canvas");
      const canvas = await html2canvas(elRulesClone, {
        logging: false,
      });
      close();
      elRulesClone.remove();
      out = canvas.toDataURL("image/png");

      return out;
    } catch (e) {
      close();
    }
  }
  /**
   * Helpers
   */
  function close() {
    if (!isOpen) {
      viewRemove(view);
    }
  }
}

/**
 * Parse view of type cc and add it to the map
 * @param {Object} o Options
 * @param {Object} o.view View data
 * @param {Object} o.map Map object
 * @param {Element} o.elLegendContainer Legend container
 * @param {Boolean} o.addTitle Add title to the legend
 * @param {String} o.before Name of an existing layer to insert the new layer(s) before.
 */
async function viewRenderCc(o) {
  const view = o.view;
  const map = o.map;
  const methods = path(view, "data.methods");

  if (isEmpty(methods)) {
    console.warn("Custom code view not initialized, skipping");
    return false;
  }

  const idView = view.id;
  const idSource = idView + "-SRC";
  const idListener = "listener_cc_" + view.id;

  if (view._onRemoveCustomView) {
    await view._onRemoveCustomView();
  }
  let cc;

  const elLegend = elLegendBuild(view, {
    type: "cc",
    elLegendContainer: o.elLegendContainer,
    addTitle: o.addTitle,
    removeOld: true,
  });

  try {
    /**
     * Remove comments
     */
    let strToEval = methods.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, "");

    /**
     * Test if script start with function
     */
    const hasFunction = /function handler/.test(strToEval);

    if (hasFunction) {
      strToEval = strToEval.substring(
        strToEval.indexOf("{") + 1,
        strToEval.lastIndexOf("}"),
      );
    }

    cc = new Function(strToEval)();
  } catch (e) {
    throw new Error("Failed to parse cc view", e.message);
  }

  if (
    !cc ||
    !(cc.onInit instanceof Function) ||
    !(cc.onClose instanceof Function)
  ) {
    return console.warn("Invalid custom code  view");
  }

  /**
   * Config
   */
  const opt = {
    _init: false,
    _closed: false,
    map: map,
    view: view,
    idView: idView,
    idSource: idSource,
    idLegend: elLegend.id,
    elLegend: elLegend,
    clear: clear,
    addSource: addSource,
    setLegend: setLegend,
    addLayer: addLayer,
    isClosed: isClosed,
    isInit: isInit,
  };

  opt.onInit = cc.onInit.bind(opt);
  opt.onClose = cc.onClose.bind(opt);

  /**
   * Preventive  clearing
   */
  clear();

  /**
   * Avoid event to propagate
   */
  listeners.addListener({
    group: idListener,
    target: elLegend,
    type: ["click", "mousedown", "change", "input"],
    callback: catchEvent,
  });

  /**
   * "destroy" usable by MapX
   */
  view._onRemoveCustomView = async function () {
    try {
      if (opt.isClosed()) {
        return;
      }
      if (!opt.isInit()) {
        console.warn("CC view : requested remove, but not yet initialized");
      }
      await opt.onClose(opt);
      clear();
    } catch (e) {
      console.error(e);
    } finally {
      delete view._onRemoveCustomView; // remove itself
      opt._closed = true;
    }
  };

  /**
   * Init custom map
   * clear, in case it's not done in custom script and previous version still
   * there.
   */
  await opt.onInit(opt);
  opt._init = true;
  return true;
  /**
   * Helpers
   */
  function catchEvent(e) {
    e.stopPropagation();
  }

  function clear() {
    listeners.removeListenerByGroup(idListener);
    removeLayers();
    removeSource();
  }

  function removeSource() {
    if (opt.map.getSource(opt.idSource)) {
      opt.map.removeSource(opt.idSource);
    }
  }

  function removeLayers() {
    removeLayersByPrefix({
      prefix: opt.idView,
      id: settings.map.id,
    });
  }

  function addSource(source) {
    removeLayers();
    removeSource();
    map.addSource(opt.idSource, source);
  }

  function addLayer(layer) {
    removeLayers();
    map.addLayer(layer, settings.layerBefore);
  }

  function setLegend(legend) {
    if (isHTML(legend) || isString(legend)) {
      legend = el("div", legend);
    }
    while (opt.elLegend.firstElementChild) {
      opt.elLegend.firstElementChild.remove();
    }
    opt.elLegend.appendChild(legend);
    return legend;
  }

  function isClosed() {
    return !!opt._closed;
  }
  function isInit() {
    return !!opt._init;
  }
}

/**
 * Parse view of type rt and add it to the map
 * @param {Object} o Options
 * @param {Object} o.view View data
 * @param {Object} o.map Map object
 * @param {Element} o.elLegendContainer Legend container
 * @param {Boolean} o.addTitle Add title to the legend
 * @param {String} o.before Name of an existing layer to insert the new layer(s) before.
 */
async function viewRenderRt(o) {
  const view = o.view;
  const map = o.map;
  const idView = view.id;
  const idSource = idView + "-SRC";
  const legendB64Default = require("../../../src/svg/no_legend.svg");
  const legendUrl = path(view, "data.source.legend", null);
  const tiles = path(view, "data.source.tiles", null);
  const useMirror = path(view, "data.source.useMirror", false);
  const hasTiles =
    isArray(tiles) && tiles.length > 0 && isArrayOf(tiles, isUrl);
  const legendTitle = getLabelFromObjectPath({
    obj: view,
    path: "data.source.legendTitles",
    defaultValue: null,
  });
  const hasLegendUrl = isUrl(legendUrl);
  const elLegendImageBox = el("div", { class: "mx-legend-box" });
  let isLegendDefault = false;

  if (!hasTiles) {
    return false;
  }
  const tilesCopy = [...tiles];

  if (useMirror) {
    for (let i = 0, iL = tilesCopy.length; i < iL; i++) {
      tilesCopy[i] = mirrorUrlCreate(tiles[i]);
    }
  }

  /**
   * LAYERS
   */
  map.addLayer(
    {
      id: idView,
      type: "raster",
      source: idSource,
      metadata: {
        idView: idView,
        priority: 0,
        position: 0,
      },
    },
    o.before,
  );

  /**
   * LEGENDS
   */

  /* Legend element */
  const elLegend = elLegendBuild(view, {
    type: "rt",
    elLegendContainer: o.elLegendContainer,
    addTitle: o.addTitle,
    removeOld: true,
  });

  if (!isElement(elLegend)) {
    return false;
  }

  /* Legend title  */
  if (legendTitle) {
    const elLabel = el(
      "span",
      {
        class: ["mx-legend-rt-title", "text-muted"],
      },
      legendTitle,
    );
    elLegend.appendChild(elLabel);
  }

  /*  Add legend to legend box */
  elLegend.appendChild(elLegendImageBox);

  /*  If no legend url is provided, use a minima */
  let legendB64 = null;

  if (!hasLegendUrl) {
    onNextFrame(() => {
      new RasterMiniMap({
        elContainer: elLegendImageBox,
        width: 40,
        height: 40,
        mapSync: map,
        tiles: tilesCopy,
        onAdded: (miniMap) => {
          view._miniMap = miniMap;
        },
        onLoad: () => {
          events.fire("view_legend_updated");
        },
      });
    });
    return true;
  }

  const legendUrlFetch = useMirror ? mirrorUrlCreate(legendUrl) : legendUrl;

  /* Get a base64 image from url */
  legendB64 = await urlToImageBase64(legendUrlFetch);

  /* If empty data or length < 'data:image/png;base64,' length */
  if (!isBase64img(legendB64)) {
    legendB64 = legendB64Default;
    isLegendDefault = true;
  }

  if (isLegendDefault) {
    /* Add tooltip 'missing legend' */
    elLegend.classList.add("hint--bottom");
    elLegend.dataset.lang_key = "noLegend";
    elLegend.dataset.lang_type = "tooltip";
    updateLanguageElements({
      el: o.elLegendContainer,
    });
  } else {
    /* Indicate that image can be zoomed */
    elLegend.style.cursor = "zoom-in";
  }
  /* Create an image with given source */
  const img = el("img", { alt: "Legend" });
  img.alt = "Legend";
  img.addEventListener("error", handleImgError);
  img.addEventListener("load", handleLoad, { once: true });
  if (!isLegendDefault) {
    img.addEventListener("click", handleClick);
  }
  /* Set base64 image as source */
  img.src = legendB64;

  return true;

  /**
   * Helpers
   */

  /*  Show a bigger image if clicked */
  function handleClick() {
    const title =
      legendTitle ||
      getLabelFromObjectPath({
        obj: view,
        path: "data.title",
        defaultValue: "[ missing title ]",
      });
    const imgModal = img.cloneNode();
    modal({
      title: title,
      id: "legend-raster-" + view.id,
      content: imgModal,
      addBackground: false,
    });
  }

  /*  Add image to image box */
  function handleLoad() {
    const dpr = window.devicePixelRatio;
    img.style.width = img.naturalWidth / dpr + "px";
    img.style.height = img.naturalHeight / dpr + "px";
    elLegendImageBox.appendChild(img);
    events.fire("view_legend_updated");
  }
  /* error callback */
  function handleImgError() {
    img.onerror = null;
    img.src = legendB64Default;
  }
}

/**
 * Parse view of type vt and add it to the map
 * @param {Object} o Options
 * @param {Object} o.view View
 * @param {Object} o.map Map object
 * @param {Boolean} o.addLegend
 * @param {Element} o.elLegendContainer Legend container
 * @param {Boolean} o.addTitle Add title to the legend
 * @param {String} o.before Name of an existing layer to insert the new layer(s) before.
 */
export async function viewRenderVt(o) {
  const view = getView(o.view);
  const addLegend = isEmpty(o.addLegend) ? true : !!o.addLegend;
  const out = await getViewMapboxLayers(view);
  const layers = out.layers;
  const rules = out.rules;
  /**
   * Add layer and legends
   */
  if (layers.length == 0) {
    return false;
  }
  /**
   * Apply filters for custom style
   * TODO: this could probably be done elsewhere
   */
  if (out.config.useStyleCustom && isFunction(view._setFilter)) {
    view._setFilter({
      filter: out?.config?.styleCustom.filter || ["all"],
      type: "custom_style",
    });
  }

  /**
   * Set legend
   */
  if (addLegend) {
    setVtLegend({
      rules: rules,
      view: view,
      elLegendContainer: o.elLegendContainer,
      addTitle: o.addTitle,
    });
    events.fire("view_legend_updated");
  }

  /*
   * Add layers to the map
   */
  await addLayers(layers, o.before);
  return true;
}

/**
 * Internal wrapper to set / update vt view legend
 *
 * @param {Object} options Options
 */
function setVtLegend(options) {
  if (isEmpty(options)) {
    options = {};
  }

  const {
    addTitle = false,
    rules = [],
    view = {},
    elLegendContainer = null, // elLegendBuild find it
  } = options;

  let pos = 0;
  const idRulesToRemove = [];
  for (const rule of rules) {
    const ruleNext = rules[++pos];
    const hasSprite = rule?.sprite !== "none";
    const nextHasSprite = !!ruleNext && ruleNext?.sprite !== "none";

    const isDuplicated =
      ruleNext &&
      ruleNext.value === rule.value &&
      ruleNext.value_to === rule.value_to;

    if (!hasSprite) {
      rule.sprite = null;
    }

    if (isDuplicated) {
      if (nextHasSprite) {
        rule.sprite = ruleNext.sprite;
      }
      idRulesToRemove.push(pos);
    }
  }

  while (idRulesToRemove.length) {
    const rulePos = idRulesToRemove.pop();
    rules.splice(rulePos, 1);
  }

  /**
   * Copy rules
   */
  view._style_rules = clone(rules);

  /*
   * Legend content
   */
  const elLegend = elLegendBuild(view, {
    type: "vt",
    removeOld: true,
    elLegendContainer: elLegendContainer,
    addTitle: addTitle,
  });

  if (isElement(elLegend)) {
    view._legend = new LegendVt(view, elLegend);
  }
}

/**
 * Add mutiple layers at once
 * @param {Array} layers Array of layers
 * @param {String} idBefore Id of the layer to insert before
 */
function addLayers(layers, idBefore) {
  return new Promise((resolve) => {
    const map = getMap();
    /**
     * Add bottom layers now
     */
    for (const layer of layers) {
      const hasLayer = map.getLayer(layer.id);
      const hasLayerBefore = map.getLayer(idBefore);

      if (hasLayer) {
        map.removeLayer(layer.id);
      }
      if (!hasLayerBefore) {
        idBefore = settings.layerBefore;
      }

      map.addLayer(layer, idBefore);
    }

    resolve(true);
  });
}

/**
 * Init view item content
 * -> Render templates for options, controls and filters
 * @param {String} id View id
 */
export async function viewUiContent(id) {
  const view = getView(id);
  if (!isView(view)) {
    return false;
  }

  const elView = getViewEl(view);
  const hasViewEl = isElement(elView);

  if (!hasViewEl) {
    return false;
  }

  /**
   * Options
   */
  const elOptions = elView.querySelector(
    `[data-view_options_for='${view.id}']`,
  );
  if (elOptions) {
    elOptions.innerHTML = templates.viewListOptions(view);
  }

  /**
   * Controls and filters
   */
  const elControls = elView.querySelector(`#view_contols_container_${view.id}`);
  const elFilters = elView.querySelector(`#view_filters_container_${view.id}`);

  if (elControls) {
    elControls.innerHTML = "";
    const elControlsList = await createViewControls(view);
    elControls.appendChild(elControlsList);
  }
  if (elFilters) {
    elFilters.innerHTML = templates.viewListFilters(view);
  }
  return true;
}

/**
 * Clean stored modules : dashboard, custom view, etc.
 */
export async function viewModulesRemove(view) {
  view = isViewId(view) ? getView(view) : view;

  if (!isView(view)) {
    return false;
  }

  const it = view._filters_tools || {};
  delete view._filters_tools;

  if (isFunction(view._onRemoveCustomView)) {
    await view._onRemoveCustomView();
  }

  if (isElement(view._elLegend)) {
    view._elLegend.remove();
    delete view._elLegend;
  }

  if (dashboard.hasViewWidgets(view)) {
    await dashboard.removeWidgetsFromView(view);
  }

  if (view._miniMap) {
    view._miniMap.destroy();
    delete view._miniMap;
  }

  if (it) {
    if (it.searchBox) {
      it.searchBox.destroy();
    }
    if (it.transparencySlider) {
      it.transparencySlider.destroy();
    }
    if (it.numericSlider) {
      it.numericSlider.destroy();
    }
    if (it.timeSlider) {
      it.timeSlider.destroy();
    }
  }
  return true;
}

export function viewsModulesRemove(views) {
  views = views instanceof Array ? views : [views];

  return Promise.all(views.map((v) => viewModulesRemove(v)));
}

/**
 * Parse view of type gejson (gj) and add it to the map
 * @param {Object} o Options
 * @param {Object} o.view View data
 * @param {Object} o.map Map object
 * @param {Element} o.elLegendContainer Legend container
 * @param {Boolean} o.addTitle Add title to the legend
 * @param {String} o.before Name of an existing layer to insert the new layer(s) before.
 * @return {Promise<boolean>} added
 */
export async function viewRenderGj(opt) {
  const layer = path(opt.view, "data.layer");

  if (!layer.metadata) {
    layer.metadata = {
      priority: 0,
      position: 0,
      idView: opt.view.id,
      filter: [],
    };
  }
  await addLayers([layer], opt.before);
  return true;
}

/**
 * Apply a filter on a layer
 * @param {object} o Options
 * @param {string} o.id Map id
 * @param {string} o.idView  view id
 * @param {array} o.filter Filter array to apply
 */
export function setFilter(o) {
  const m = getMap(o.id);
  m.setFilter(o.idView, o.filter);
}
/**
 * Apply a filter on country-code
 * @param {object} o Options
 * @param {string} o.id Map id
 * @param {string} o.idLayer layer id
 * @param {array} o.countries Array of countries code
 */
export function setHighlightedCountries(o) {
  o = Object.assign(
    {},
    {
      id: null,
      idLayer: "country-code",
      countries: [],
    },
    o,
  );

  const countries = o.countries;
  const m = getMap(o.id);
  const hasCountries = isArray(countries) && countries.length > 0;
  const hasWorld = hasCountries && countries.indexOf("WLD") > -1;
  const filter = ["any"];

  settings.highlightedCountries = hasCountries ? countries : [];

  if (!hasWorld && hasCountries) {
    filter.push(["==", ["get", "iso3code"], ""]);
    filter.push(["!", ["in", ["get", "iso3code"], ["literal", countries]]]);
  }

  return m.setFilter(o.idLayer, filter);
}

/**
 * Get estimated area of visible layer by prefix of layer names
 * @param {object} o options
 * @param {string} o.id map id
 * @param {string} o.prefix Prefix to find layers
 * @param {function} o.onMessage Function to deal with messages
 * @return {number} area in km2
 */
export function getRenderedLayersArea(o) {
  const map = getMap(o.id);

  if (map) {
    const calcAreaWorker = require("./calc_area.mxworkers.js");
    const layers = getLayerNamesByPrefix({
      id: o.id,
      prefix: o.prefix,
    });

    if (layers.length > 0) {
      const features = map.queryRenderedFeatures({ layers: layers });

      const geomTemp = {
        type: "FeatureCollection",
        features: [],
      };

      features.forEach(function (f) {
        geomTemp.features.push({
          type: "Feature",
          properties: {},
          geometry: f.geometry,
        });
      });

      const data = {
        geojson: geomTemp,
        bbox: getBoundsArray(o),
      };

      const worker = new calcAreaWorker();
      worker.postMessage(data);
      listeners.addListener({
        group: "compute_layer_area",
        target: worker,
        type: "message",
        callback: function (e) {
          if (e.data.message) {
            o.onMessage(e.data.message);
          }
          if (e.data.end) {
            o.onEnd(e.data.end);
            listeners.removeListenerByGroup("compute_layer_area");
          }
        },
      });
    }
  }
}

export function sendRenderedLayersAreaToUi(o) {
  const el = document.getElementById(o.idEl);
  if (el) {
    getRenderedLayersArea({
      id: o.id,
      prefix: o.prefix,
      onMessage: function (msg) {
        el.innerHTML = msg;
      },
      onEnd: function (msg) {
        el.innerHTML = "~ " + msg + " km2";
      },
    });
  }
}

/**
 * Get map bounds as array
 * @param {Object} o options
 * @param {String} o.id Map id
 * @param {Object} o.map Map (optional, overwrite id)
 */
export function getBoundsArray(o) {
  const map = getMap(o);
  const a = map.getBounds();
  return [a.getWest(), a.getSouth(), a.getEast(), a.getNorth()];
}

/**
 * Get view source attributes / properties, in correct order
 * @param {Object} view
 * @returns {Array} properties list
 */
export function getViewAttributes(
  view,
  excludeProp = ["gid", "mx_t0", "mx_t1"],
) {
  const attrSet = view?.data?.attribute?.names;

  // no attribute
  if (isEmpty(attrSet)) {
    return [];
  }
  // string attribute (back compatibility)
  if (isString(attrSet)) {
    return [attrSet];
  }

  const attr = attrSet.filter((n) => !excludeProp.includes(n)) || [];
  return attr;
}

/**
 * Query layers properties at point
 * @param {Object} opt Options
 * @param {Object||String} opt.map Map object or id of the map
 * @param {Object} opt.point
 * @param {String} opt.type Type : vt or rt
 * @param {String} opt.idView Use only given view id
 * @param {Boolean} opt.asObject Return an object of array `{a:[2,1]}` instead of an array of object `[{a:2},{a:1}]`.
 * @return {Object} Object with view id as keys
 */
export function getLayersPropertiesAtPoint(opt) {
  const map = getMap(opt.map);
  const hasViewId = isString(opt.idView);
  const modeObject = opt.asObject === true || false;
  const items = {};
  const excludeProp = ["mx_t0", "mx_t1", "gid"];
  let idViews = [];
  let type = opt.type || "vt" || "rt" || "gj" || "cc";
  type = isArray(type) ? type : [type];
  /**
   * Use id from idView as array OR get all mapx displayed base layer
   * to get array of view ID.
   */
  idViews = hasViewId
    ? [opt.idView]
    : getLayerNamesByPrefix({
        base: true,
      });

  if (idViews.length === 0) {
    return items;
  }

  const idViewsOrder = getViewsOrder();

  const idViewsSorted = sortByOrder(idViews, idViewsOrder);

  const sources = getMap().getStyle()?.sources;

  /**
   * Fetch view data for one or many views
   * and fetch properties
   */
  idViewsSorted
    .map((idView) => getView(idView))
    .filter((view) => type.includes(view?.type))
    .forEach((view) => {
      if (!isView(view)) {
        console.warn("Not a view:", view, " opt:", opt);
        return;
      }
      const idView = view.id;
      for (const id in sources) {
        const reg = new RegExp(`^${idView}`);

        if (reg.test(id)) {
          const type = sources[id].type;
          switch (type) {
            case "raster":
              items[idView] = fetchRasterProp(view, sources[id]);
              break;
            case "vector":
            case "geojson":
              items[view.id] = fetchVectorProp(view);
              break;
          }
        }
      }
    });

  return items;

  /**
   * Fetch properties on raster WMS layer
   */
  async function fetchRasterProp(view, source) {
    const out = modeObject ? {} : [];
    try {
      const tiles = view?.data?.source?.tiles || source?.tiles || [];
      const url = tiles[0];

      if (!isUrl(url)) {
        return out;
      }

      const params = getQueryParametersAsObject(url, { lowerCase: true });
      const useMirror = view?.data?.source?.useMirror || false;
      const parts = url.split("?");
      const endpoint = parts[0];

      /**
       * Check if this is a WMS valid param object
       */
      const isWms = isUrlValidWms(url, { layers: true, styles: true });

      if (!isWms) {
        return out;
      }

      const res = await wmsQuery({
        point: opt.point,
        layers: params.layers,
        styles: params.styles,
        url: endpoint,
        asObject: modeObject,
        optGetCapabilities: {
          useMirror: useMirror,
          searchParams: {
            /**
             * timestamp : Used to invalidate getCapabilities cache
             */
            timestamp: view?.date_modified,
          },
        },
      });
      if (!isEmpty(res)) {
        return res;
      }
      return out;
    } catch (e) {
      console.warn(e);
      return out;
    }
  }

  /**
   * Fetch properties on vector layer
   */
  function fetchVectorProp(view) {
    return new Promise((resolve) => {
      const id = view.id;
      let attributes = view?.data?.attribute?.names || [];
      if (isString(attributes)) {
        // vector of 1 in R -> string during r->json conversion
        attributes = [attributes];
      }
      const layers = getLayerNamesByPrefix({
        map: map,
        prefix: id,
      });

      const features = map.queryRenderedFeatures(opt.point, {
        layers: layers,
      });

      const out = modeObject ? {} : [];

      features.forEach((f) => {
        /**
         * Fill null
         * -> tiles can't contain nulls
         * -> nulls expected in popup and widget clicked feature
         */
        for (const a of attributes) {
          if (isEmpty(f.properties[a])) {
            f.properties[a] = "$NULL";
          }
        }

        if (modeObject) {
          for (const p in f.properties) {
            /**
             * Exclude prop (time, gid, etc)
             */
            if (!excludeProp.includes(p)) {
              /**
               * Aggregate value by attribute
               */
              let value = f.properties[p];
              let values = out[p] || [];
              values = values.concat(value);
              out[p] = getArrayDistinct(values);
            }
          }
        } else {
          /*
           * Raw properties
           */
          out.push(f.properties);
        }
      });

      resolve(out);
    });
  }
}

/**
 * Add a new layer
 * @param {object} o Options
 * @param {string} o.id Map id
 * @param {object} o.layer Layer object
 * @param {string} o.before
 * @param {string} o.after
 */
export function addLayer(o) {
  const map = getMap(o.id);

  if (map) {
    if (map.getLayer(o.layer.id)) {
      map.removeLayer(o.layer.id);
    }
    if (o.after) {
      /**
       * Add after : find next layer
       */
      var layers = map.getStyle().layers;
      var found = false;
      layers.forEach((l, i) => {
        if (!found && l.id === o.after) {
          found = true;
          var layerNext = layers[i + 1];
          var idBefore = layerNext ? layerNext.id : null;
          map.addLayer(o.layer, idBefore);
        }
      });
    } else {
      /**
       * Add before, if specified else use default
       */
      if (!map.getLayer(o.before)) {
        o.before = settings.layerBefore;
      }
      map.addLayer(o.layer, o.before);
    }
  }
}

/**
 * Fly to view id using geometry extent
 * @param {Object|String} o options or idView
 * @param {String} o.idView view id
 */
export async function zoomToViewId(o) {
  try {
    if (isViewId(o)) {
      o = {
        idView: o,
      };
    }

    const hasArray = isArray(o.idView);
    if (hasArray) {
      console.warn(
        "zoomToViewId requires a single view or view id. Using the first",
      );
      o.idView = o.idView[0];
    }
    if (isView(o.idView)) {
      o.idView = o.idView.id;
    }
    const idView = o.idView.split(settings.separators.sublayer)[0];
    const view = getView(idView);

    if (!isView(view)) {
      console.warn("zoomToViewId : view object required");
      return;
    }

    const ext = await getViewExtent(view);

    const llb = new mapboxgl.LngLatBounds(
      [ext.lng1, ext.lat2],
      [ext.lng2, ext.lat1],
    );

    const done = fitMaxBounds(llb);

    return done;
  } catch (e) {
    throw new Error(e);
  }
}

/**
 * Retrieves the geographical extent of a given view.
 * If the extent is not found in the cache, it fetches from a remote source.
 * The function will return an empty array if it times out or if no valid extent is found.
 *
 * @param {View} view - The view object for which the extent is to be fetched.
 * @returns {Promise<Object>} Promise resolving to the extent / bbox.
 */
export async function getViewExtent(view) {
  const timeout = settings.maxTimeFetchQuick;
  let cancelByTimeout = false;

  const def = {
    lat1: -80,
    lat2: 80,
    lng1: -180,
    lng2: 180,
  };

  const ext = await Promise.race([
    getExtent(),
    waitTimeoutAsync(timeout, cancel),
  ]);

  return ext || def;

  async function cancel() {
    cancelByTimeout = true;
    return;
  }

  async function getExtent() {
    const summaryCache = await getViewSourceSummary(view, { useCache: true });

    const extent = path(summaryCache, "extent_sp", null);

    if (cancelByTimeout) {
      return;
    }

    if (isBbox(extent)) {
      return extent;
    }
    const summaryRemote = await getViewSourceSummary(view, { useCache: false });
    const extentRemote = path(summaryRemote, "extent_sp", null);
    if (cancelByTimeout) {
      return;
    }
    if (!isBbox(extentRemote)) {
      console.warn(`zoomToViewId no extent found for ${view.id}`);
      return;
    }
    return extentRemote;
  }
}

/**
 * Find bounds of a series of views
 * @param {Array} views Array of views
 * @return {Object} MapBox gl bounds object
 */
export async function getViewsBounds(views) {
  views = views.constructor === Array ? views : [views];

  const init = {
    lat1: 80,
    lat2: -80,
    lng1: 180,
    lng2: -180,
  };

  const extents = await Promise.all(views.map((view) => getViewExtent(view)));

  const extent = extents.reduce((a, ext) => {
    if (ext) {
      a.lat1 = ext.lat1 < a.lat1 ? ext.lat1 : a.lat1;
      a.lat2 = ext.lat2 > a.lat2 ? ext.lat2 : a.lat2;
      a.lng1 = ext.lng1 < a.lng1 ? ext.lng1 : a.lng1;
      a.lng2 = ext.lng2 > a.lng2 ? ext.lng2 : a.lng2;
    }
    return a;
  }, init);

  return [
    [extent.lng1, extent.lat1],
    [extent.lng2, extent.lat2],
  ];
}

/**
 * Fly to view id using rendered features
 * @param {object} o options
 * @param {string} o.idView view id
 */
export async function zoomToViewIdVisible(o) {
  const bbox = await moduleLoad("turf-bbox");

  let geomTemp, idLayerAll, features;

  geomTemp = {
    type: "FeatureCollection",
    features: [],
  };

  const map = getMap();

  idLayerAll = getLayerNamesByPrefix({
    id: o.id,
    prefix: o.idView,
  });

  features = map.queryRenderedFeatures({
    layers: idLayerAll,
  });

  features.forEach(function (x) {
    geomTemp.features.push(x);
  });

  let done;
  if (geomTemp.features.length > 0) {
    const bbx = bbox(geomTemp);
    const sw = new mapboxgl.LngLat(bbx[0], bbx[1]);
    const ne = new mapboxgl.LngLat(bbx[2], bbx[3]);
    const llb = new mapboxgl.LngLatBounds(sw, ne);
    done = fitMaxBounds(llb);
  } else {
    done = zoomToViewId(o);
  }
  return done;
}

/**
 * Reload view
 * @param {Object} o options
 * @param {String} o.id  Map id (optional)
 * @param {String | Object} o.idView  View id ( or view )
 */
export async function resetViewStyle(o) {
  if (!isViewId(o.idView) && !isView(o.idView)) {
    return;
  }

  const view = getView(o.idView);

  const isOpen = isViewOpen(view);

  updateLanguageElements({
    el: view._el,
  });

  if (isOpen) {
    await viewRender({
      view: view,
    });

    layersOrderAuto("reset_view_style");
  }
}

/**
 * Fly to a specified location and zoom level on a map.
 *
 * @param {object} opt - The options for the function.
 * @param {string} opt.id - The map ID.
 * @param {number} [opt.duration=2000] - Optional duration for the animation, in milliseconds. Defaults to 2000ms.
 * @param {object} opt.param - The parameters for the function.
 * @param {number} [opt.param.w=0] - West coordinate of the bounding box.
 * @param {number} [opt.param.s=0] - South coordinate of the bounding box.
 * @param {number} [opt.param.e=0] - East coordinate of the bounding box.
 * @param {number} [opt.param.n=0] - North coordinate of the bounding box.
 * @param {number} [opt.param.lng=0] - Longitude of the center of the map.
 * @param {number} [opt.param.lat=0] - Latitude of the center of the map.
 * @param {number} [opt.param.zoom=1] - Zoom level for the map. Defaults to 1.
 * @param {boolean} [opt.param.useMaxBounds=false] - Whether to apply the maximum bounds after flying to the location. Defaults to false.
 * @param {boolean} [opt.param.fitToBounds=false] - Whether to fit the map to the specified bounds. Defaults to false.
 * @param {boolean} [opt.param.jump=false] - Whether to jump to the location without animation. Defaults to false.
 */
export async function setMapPos(opt) {
  try {
    const map = getMap(opt.id);
    const p = opt.param;
    if (p.useMaxBounds) {
      p.jump = true;
    }
    const duration = p.jump ? 0 : isNotEmpty(p.duration) ? o.duration : 1000;
    const bounds = new mapboxgl.LngLatBounds([
      [p.w || 0, p.s || 0],
      [p.e || 0, p.n || 0],
    ]);

    const center = new mapboxgl.LngLat(p.lng || 0, p.lat || 0);
    map.setMaxBounds(null);

    if (isBoolean(p.globe)) {
      await controls.get("btn_globe").action(p.globe ? "enable" : "disable");
    }

    if (p.fitToBounds) {
      map.fitBounds(bounds, {
        duration,
      });
    } else {
      map.flyTo({
        center: center,
        zoom: p.zoom || p.z || 1,
        bearing: p.bearing || p.b || 0,
        pitch: p.pitch || p.p || 0,
        duration: duration,
      });
    }

    if (p.useMaxBounds) {
      /**
       * Don't let the user zoom before the animation is done
       */
      map.scrollZoom.disable();

      /**
       * Ignore fitToBounds settings :
       * -> if false, setMaxBounds could
       *    create a small gaps in animation
       */
      p.fitToBounds = true;

      /**
       * a) timeout vs event
       *   -> could use once('idle') but
       *      could sometimes, there is some inertia
       *   -> setTimeout make it clear
       * b) use bounds vs getBounds
       *   -> using "bounds" produced a small gap in
       *      animation. Saved in a screen size, rendered in another
       *   -> getBounds() make sure it will not
       *   -> but if zoom is set by something else during this
       *      "duration" -> inaccurate bounds...
       */
      await waitTimeoutAsync(duration);
      map.setMaxBounds(map.getBounds());
      map.scrollZoom.enable();
    }

    if (p.theme) {
      await theme.set(p.theme, { force: true });
    }

    await events.fire("set_map_pos", p);

    return true;
  } catch (e) {
    console.error(e);
  }
}

/**
 * Fit bounds if not overlaping max bounds
 * @param {LngLatBounds} bounds
 * @param {Object} opt Options MaboxGL animation options
 * @return {boolean} Fitted
 */
export function fitMaxBounds(bounds, opt) {
  const map = getMap();
  const validBBounds = bounds instanceof mapboxgl.LngLatBounds;
  if (!validBBounds) {
    bounds = validateBounds(bounds);
    bounds = new mapboxgl.LngLatBounds(bounds);
  }
  let valid = true;
  const maxBounds = map.getMaxBounds();
  const currentBounds = map.getBounds();

  if (maxBounds) {
    valid = isBoundsInsideBounds(bounds, maxBounds);
  }

  if (valid) {
    map.fitBounds(bounds, opt);
  } else {
    const outer = isBoundsInsideBounds(currentBounds, bounds);
    const angle = outer ? 0 : boundsAngleRelation(currentBounds, bounds);
    new FlashItem({ icon: outer ? "arrows-alt" : "arrow-up", angle: angle });

    //map.fitBounds(maxBounds);//glitchy
    const elMap = map.getContainer();
    shake(elMap);
  }
  return valid;
}

/**
 * Validates and corrects a bounds array, ensuring it meets the specified constraints.
 *
 * @param {number[]} bounds - An array of bounding box coordinates in the format [west, south, east, north].
 * @returns {number[]} The corrected bounds array, with values adjusted to meet the specified constraints.
 * @throws {Error} If the input bounds array does not have exactly 4 elements.
 */
export function validateBounds(bounds) {
  // Define the maximum and minimum limits for longitude and latitude
  const maxLongitude = 180;
  const minLongitude = -180;
  const maxLatitude = 90;
  const minLatitude = -90;

  // Define the minimum difference between coordinates
  const minDelta = 0.5;

  // array of array -> flatten
  if (isArrayOf(bounds, isArray)) {
    bounds = bounds.flat();
  }
  // Ensure the bounds array has exactly 4 elements
  if (bounds.length !== 4) {
    throw new Error("Bounds array should have exactly 4 elements.");
  }

  // Extract the coordinates from the input bounds array
  let [west, south, east, north] = bounds;

  // Check if west and east are within the limits and ensure west < east
  if (west <= east) {
    west = Math.max(minLongitude, west);
    east = Math.min(maxLongitude, east);

    if (east - west < minDelta) {
      east = Math.min(maxLongitude, west + minDelta);
    }
  } else {
    // Swap west and east values if west > east
    [west, east] = [Math.max(minLongitude, east), Math.min(maxLongitude, west)];
  }

  // Check if north and south are within the limits and ensure north > south
  if (north >= south) {
    north = Math.min(maxLatitude, north);
    south = Math.max(minLatitude, south);

    if (north - south < minDelta) {
      north = Math.min(maxLatitude, south + minDelta);
    }
  } else {
    // Swap north and south values if north < south
    [north, south] = [
      Math.min(maxLatitude, south),
      Math.max(minLatitude, north),
    ];
  }

  return [west, south, east, north];
}

/**
 * Calculates the angle in degrees between the centroids of two LngLatBounds.
 * @param {mapboxgl.LngLatBounds} bounds1 - First LngLatBounds.
 * @param {mapboxgl.LngLatBounds} bounds2 - Second LngLatBounds.
 * @returns {number} Angle in degrees between the centroids of the bounds.
 */
export function boundsAngleRelation(bounds1, bounds2) {
  if (
    !(bounds1 instanceof mapboxgl.LngLatBounds) ||
    !(bounds2 instanceof mapboxgl.LngLatBounds)
  ) {
    throw new Error(
      "Invalid input: both arguments must be LngLatBounds instances.",
    );
  }

  const centroid1 = bounds1.getCenter();
  const centroid2 = bounds2.getCenter();

  const deltaY = centroid2.lat - centroid1.lat;
  const deltaX = centroid2.lng - centroid1.lng;
  let angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;

  // Adjust angle for compass directions
  angle = 90 - angle;

  // Normalize the angle to the range [0, 360)
  if (angle < 0) {
    angle += 360;
  }

  return angle;
}

/**
 * Set map projection
 * @param {Object} opt options
 * @param {String} opt.id map id
 * @param {String} opt.globe
 * @param {String} opt.name
 * @param {Array} opt.center
 * @param {Array} opt.parallels
 * @param {String} opt.origin Origin for debugging
 * @param {Boolean} opt.cancelEvent Don't propagate
 */
export async function setMapProjection(opt) {
  try {
    const map = getMap(opt.id);
    const current = map.getProjection();

    // update proj name using "globe" option value
    if (isNotEmpty(opt.globe)) {
      switch (opt.globe) {
        case "enable":
          opt.name = "globe";
          break;
        case "disable":
          opt.name = "mercator";
          break;
        default:
          // toggle
          if (current.name === "globe") {
            opt.name = "mercator";
          } else {
            opt.name = "globe";
          }
      }
    }

    const def = {
      name: current.name,
      center: current.center || [0, 0],
      parallels: current.parallels || [0, 0],
    };

    const proj = {
      name: opt.name,
      center: opt.center || [0, 0],
      parallels: opt.parallels || [0, 0],
    };

    settings.projection = Object.assign(settings.projection, def, proj);

    map.setProjection(settings.projection.name, {
      center: settings.projection.center,
      parallels: settings.projection.parallels,
    });

    if (!opt.skipEvent) {
      await events.fire("set_map_projection", settings.projection);
    }
  } catch (e) {
    console.error(e);
  }
  return settings.projection;
}

/**
 * Set theme ( from shiny )
 * @param {Object} opt options
 * @param {String} opt.id Theme id
 */
export async function setTheme(opt) {
  if (theme.isValidId(opt.id)) {
    await theme.set(opt.id, { save_url: true });
  }
}

/**
 * getMercCoords
 *
 * NOTE: https://github.com/mapbox/whoots-js/
 *
 * @param    {Number}  x  Pixel coordinate x
 * @param    {Number}  y  Pixel coordinate y
 * @param    {Number}  z  Tile zoom
 * @returns  {Array}   [x, y]
 */
export function getMercCoords(x, y, z) {
  const resolution = (2 * Math.PI * 6378137) / 256 / Math.pow(2, z),
    merc_x = x * resolution - (2 * Math.PI * 6378137) / 2.0,
    merc_y = y * resolution - (2 * Math.PI * 6378137) / 2.0;

  return [merc_x, merc_y];
}

/**
 * Get a view title by id or view object
 * @param {Object|String} iview View id or view
 * @param {String} lang Optional. Language : e.g. fr, en, sp ..
 * @return {String} title
 */
export function getViewTitle(view, lang) {
  const langs = getLanguagesAll();
  if (!isView(view)) {
    view = getView(view);
  }
  lang = lang || getLanguageCurrent();
  return getLabelFromObjectPath({
    obj: view,
    path: "data.title",
    lang: lang,
    langs: langs,
    defaultValue: "[ missing title ]",
  });
}
/* get view title  */
export function getViewTitleNormalized(view, lang) {
  if (!isView(view)) {
    view = getView(view);
  }
  let title = getLabelFromObjectPath({
    lang: lang || getLanguageCurrent(),
    obj: view,
    path: "data.title",
    defaultValue: "",
  });
  title = cleanDiacritic(title).toLowerCase().trim();
  return title;
}

/**
 * Get group of views title, normalized
 * @param {Array} views Array of views or views id
 * @param {String} lang Optional. Language : e.g. fr, en, sp ..
 * @return {Array} Array of titles
 */
export function getViewsTitleNormalized(views, lang) {
  views = isArrayOfViews(views) || isArrayOfViewsId(views) ? views : getViews();
  return views.map((v) => getViewTitleNormalized(v, lang));
}

/**
 * Get view date modified
 * @param {Object} view View or view id
 * @return {String} date of the last modification
 */
export function getViewDateModified(view) {
  if (!isView(view)) {
    view = getView(view);
  }
  return view.date_modified;
}
/**
 * Get a view desc by id or view object
 * @param {String|Object} id  View id or view
 * @param {String} lang Optional. Language : e.g. fr, en, sp ..
 * @return {String} desc
 */
export function getViewDescription(id, lang) {
  let view = id;
  if (typeof id === "string") {
    view = getView(id);
  }
  lang = lang || getLanguageCurrent();
  const langs = getLanguagesAll();

  return getLabelFromObjectPath({
    obj: view,
    path: "data.abstract",
    lang: lang,
    langs: langs,
    defaultValue: "",
  });
}

/**
 * Get a view's legends or clone.
 * (Used in MapComposer)
 * @param {String||Object} id of the legend or view object
 * @param {Object} opt Options
 * @param {Boolean} opt.clone Clone the legend. Default true
 * @param {Boolean} opt.input Keep working inputs. Default false
 * @param {Boolean} opt.class Keep classes. Default true
 * @param {Boolean} opt.style Keep style. Default false
 */
export function getViewLegend(id, opt) {
  opt = Object.assign(
    {},
    { clone: true, input: false, class: true, style: false },
    opt,
  );

  if (isView(id)) {
    id = id.id;
  }
  const view = getView(id);
  const elLegend = view._elLegend;
  const hasLegend = isElement(elLegend);
  const useClone = opt.clone === true;
  const hasMiniMap = view._miniMap instanceof RasterMiniMap;

  if (!hasLegend) {
    return el("div");
  }

  if (!useClone) {
    return elLegend;
  }

  const elLegendClone = elLegend.cloneNode(true);
  if (hasMiniMap) {
    const img = view._miniMap.getImage();
    const elImg = el("img", { src: img });
    elLegendClone.appendChild(elImg);
  }
  if (opt.input === false) {
    elLegendClone.querySelectorAll("input").forEach((e) => e.remove());
  }
  if (opt.style === false) {
    elLegendClone.style = "";
  }
  if (opt.class === false) {
    elLegendClone.className = "";
  }
  return elLegendClone;
}

/**
 * Get a map object by id
 * @param {String|Object} idMap Id of the map or the map itself.
 * @return {MapboxMap} map
 */
export function getMap(idMap) {
  idMap = idMap || settings.map.id;

  let map;
  const isId = typeof idMap === "string";
  const hasMap = !isId && isMap(idMap);

  if (hasMap) {
    return idMap;
  }

  if (isId && maps[idMap]) {
    map = maps[idMap].map;
    map.id = idMap;
  }

  if (isMap(map)) {
    return map;
  }
}

/**
 * Get a map data object (map and views) by id of the map
 * @param {String} idMap Id of the map
 * @return {Object} data
 */
export function getMapData(idMap) {
  idMap = idMap || settings.map.id;
  const data = maps[idMap || settings.map.id];
  data.id = idMap;
  return data;
}

/**
 * Get view list object
 * @return {ViewsList} ViewList
 */
export function getViewsList(o) {
  const data = getMapData(o);
  return data.viewsList;
}

/**
 * Get list of views' id
 * @return {Array} Ids of view
 */
export function getViewsListId() {
  return getViews().map((m) => m.id);
}

/**
 * Get a random view by type and common selector
 * @param {Object} config
 * @param {Array} config.type Array of type to select eg. ['cc']
 * @param {Boolean} config.rtHasTiles: false,
 * @param {Boolean} config.vtHasRules: false,
 * @param {String} config.vtHasAttributeType: null,'string',number
 * @param {Boolean} config.rtHasLegendLink: false,
 * @param {Boolean} config.isEditable: false,
 * @param {Boolean} config.isLocal: false,
 * @return {Promise<Object>} A view
 */
const _get_random_view_default = {
  type: ["vt", "rt"],
  rtHasTiles: false,
  vtHasRules: false,
  vtAttributeType: null,
  rtHasLegendLink: false,
  hasDashboard: false,
  isEditable: false,
  isDownloadable: false,
  isLocal: false,
};
export async function getViewRandom(config) {
  // Merge user config with default settings
  const opt = {
    ..._get_random_view_default,
    ...config,
  };

  // Ensure opt.type is an array
  if (!isArray(opt.type)) {
    opt.type = [opt.type];
  }

  // Retrieve all views
  const views = getViews();
  const filteredViews = [];

  // Filter views based on criteria
  for (const view of views) {
    const { type } = view;

    // Check if the view type is among the types we're interested in
    if (!opt.type.includes(type)) {
      continue;
    }

    // Check if the view should be editable
    if (opt.isEditable && !isViewEditable(view)) {
      continue;
    }

    // Check if the view should be local
    if (opt.isLocal && !isViewLocal(view)) {
      continue;
    }

    // Check if the view should be downloadable
    if (opt.isDownloadable) {
      const isDownloadable = await isViewDownloadableRemote(view);
      if (!isDownloadable) {
        continue;
      }
    }

    // Check if the view should have a dashboard
    if (opt.hasDashboard && !isViewDashboard(view)) {
      continue;
    }

    // Additional checks for specific types
    if (type === "vt") {
      if (opt.vtHasRules && !isViewVtWithRules(view)) {
        continue;
      }
      if (
        opt.vtAttributeType &&
        !isViewVtWithAttributeType(view, opt.vtAttributeType)
      ) {
        continue;
      }
    }

    if (type === "rt") {
      if (opt.rtHasTiles && !isViewRtWithTiles(view)) {
        continue;
      }
      if (opt.rtHasLegendLink && !isViewRtWithLegend(view)) {
        continue;
      }
    }

    // If all checks pass, add the view to the filtered list
    filteredViews.push(view);
  }

  // Select a random view from the filtered list
  if (filteredViews.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * filteredViews.length);
  return filteredViews[randomIndex];
}

/**
 * Get view vt source id
 * @param {Object} view
 * @return {String} idSource
 */
export function getViewVtSourceId(view) {
  view = getView(view);
  const idSource = view?.data?.source?.layerInfo?.name;
  if (!isSourceId(idSource)) {
    return null;
  }
  return idSource;
}

/**
 * Test remotely if the source of a vt view is downloadable.
 * @param {String} idView View id
 * @return {Promise<Boolean>} downloadable
 */
export async function isViewDownloadableRemote(idView) {
  const view = await getViewAuto(idView);

  const { type } = view;
  switch (type) {
    case "sm":
      return false;
    case "rt":
    case "cc":
      return hasDownloadUrlItemsFromViewMeta(view);
    case "vt":
      const idSource = getViewVtSourceId(view);
      return isSourceDownloadable(idSource);
  }
  return false;
}

/**
 * Test remotely if a source is downloadable.
 * @param {String} idSource Source id
 * @return {Promise<Boolean>} downloadable
 */
export async function isSourceDownloadable(idSource) {
  if (!isSourceId(idSource)) {
    return false;
  }
  const res = await ws.emitAsync(
    "/client/source/get/services",
    { method: "is_downloadable", config: { idSource } },
    10e3,
  );
  return res;
}

/**
 * Test source current services
 * @param {String} idSource Source id
 * @return {Promise<Array>} services
 */
export async function getSourceServices(idSource) {
  const res = await ws.emitAsync(
    "/client/source/get/services",
    { method: "get_services", config: { idSource } },
    10e3,
  );
  return res;
}

/**
 * Check if view is local
 * @note Deprecated, use is_test / mx_valid isViewLocal
 * @return {Boolean} is local
 */
export function hasViewLocal(id) {
  return !!getView(id);
}
/**
 * Get view list object
 * @return {Object} ViewList
 */
export function getViewsFilter(o) {
  const data = getMapData(o);
  return data.viewsFilter;
}

/**
 * Get map position summary
 * @param {object} o options
 * @param {string} o.id map id
 */
export function getMapPos(o) {
  o = o || {};
  const map = getMap(o.id);
  const bounds = map.getBounds();
  const center = map.getCenter();
  const zoom = map.getZoom();
  const bearing = map.getBearing();
  const pitch = map.getPitch();
  const modeSat = controls.get("btn_theme_sat").isActive();
  const mode3d = controls.get("btn_3d_terrain").isActive();
  const modeGlobe = controls.get("btn_globe").isActive();
  const idTheme = theme.id();
  const out = {
    n: round(bounds.getNorth()),
    s: round(bounds.getSouth()),
    e: round(bounds.getEast()),
    w: round(bounds.getWest()),
    lat: round(center.lat),
    lng: round(center.lng),
    b: round(bearing),
    p: round(pitch),
    z: round(zoom),
    sat: modeSat,
    t3d: mode3d,
    theme: idTheme,
    globe: modeGlobe,
  };
  return out;
}

/**
 * Reset max bounds
 * @return {void}
 */
export function resetMaxBounds() {
  const map = getMap();
  map.setMaxBounds(null);
}

/**
 * Replaces existing views with new ones and reloads them.
 * @param {Object[]} viewsNew - Array of new view objects to replace existing views.
 * @return {Promise<boolean>} Promise resolving to true if replacement is successful, false otherwise.
 */
export async function viewsReplace(viewsNew) {
  try {
    const valid = isArrayOfViews(viewsNew);
    if (!valid) {
      console.error("viewsReplace: expecting an array of views");
      return false;
    }
    const views = getViews();
    const idViews = views.map((view) => view.id);
    for (const newView of viewsNew) {
      const { id } = newView;
      const pos = idViews.indexOf(id);
      if (pos === -1) {
        continue;
      }
      const oldView = views[pos];
      Object.assign(oldView, newView);
      await resetViewStyle({ idView: id });
    }
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

/**
 * Create views array or object with id as key, or single view if idView is provided in options
 * @param {Object | Array} o options || array of views id
 * @param {String} o.id map id ( if null default map )
 * @param {String|Array} o.idView Optional. Filter view(s) to return. Default = all.
 * @return {Array} array of views
 */
export function getViews(o) {
  const isAV = isArrayOfViewsId(o);
  const opt = Object.assign({}, isAV ? { idView: o } : o);
  const d = getMapData(opt.id);
  const views = d.views || [];
  if (opt.idView) {
    opt.idView = isArray(opt.idView) ? opt.idView : [opt.idView];
    return opt.idView.map((id) => views.find((v) => v.id === id));
  } else {
    return views;
  }
}
export function getViewsForJSON(o) {
  const views = getViews(o);
  return views.map((view) => getViewJson(view, { asString: false }));
}

/**
 * Get JSON representation of a view ( same as the one dowloaded );
 * @param {String} idView Id of the view;
 * @param {Object} opt Options
 * @param {Boolean} opt.asString As string
 * @return {String} JSON string with view data (or cleaned view object);
 */
export function getViewJson(idView, opt) {
  opt = Object.assign({}, { asString: true }, opt);
  const view = getView(idView);
  const keys = [
    "id",
    "editor",
    "target",
    "date_modified",
    "data",
    "type",
    "pid",
    "project",
    "readers",
    "editors",
    "_edit",
  ];
  const out = {};

  for (const key of keys) {
    out[key] = view[key];
    if (key === "data" && isObject(out[key]?.style)) {
      delete out[key]?.style._sld;
      delete out[key]?.style._mapbox;
      delete out[key]?.attribute?.table;
      delete out[key]?.attribute?.sample;
    }
  }

  if (opt.asString) {
    return JSON.stringify(out);
  }

  return out;
}

/**
 * Return a single view
 * @param {String|Object} id Id of the view or view object or view list
 */
export function getView(id) {
  if (isView(id)) {
    return id;
  }
  if (isObject(id) && isViewId(id.idView)) {
    id = id.idView;
  }
  if (!isViewId(id)) {
    console.warn("No  valid id given. Received ", id);
    return;
  }
  return getViews({ idView: id })[0];
}

/**
 * Get view position in views array
 * @param {String} id of the view
 * @param {String} idMap Id of the map
 */
export function getViewIndex(id) {
  const view = getView(id);
  const d = getMapData();
  const views = d.views || [];
  return views.indexOf(view);
}

/**
 * Toy function to make layer move
 */
export function makeLayerJiggle(mapId, prefix) {
  const layersName = getLayerNamesByPrefix({
    id: mapId,
    prefix: prefix,
  });

  if (layersName.length > 0) {
    const varTranslate = {
      line: "line-translate",
      fill: "fill-translate",
      circle: "circle-translate",
      symbol: "icon-translate",
    };

    const m = getMap(mapId);

    layersName.forEach(function (x) {
      const l = m.getLayer(x);
      const t = l.type;
      const o = varTranslate[t];
      const max = 20;
      const time = 200;
      const dist = [
        [-20, 0],
        [20, 0],
      ];
      let n = 0;
      const interval = setInterval(function () {
        if (n < max) {
          n++;
          m.setPaintProperty(x, o, dist[n % 2]);
        } else {
          m.setPaintProperty(x, o, [0, 0]);
          clearInterval(interval);
        }
      }, time);
    });
  }
}

/**
 * Toogle immersive mode : hide ALL panels.
 * @aram {Object} opt Options
 * @param {Boolean} opt.enable Force enable
 * @param {Boolean} opt.toggle Toggle
 * @return {Boolean} enabled
 */
export function setImmersiveMode(opt) {
  opt = Object.assign({}, { enable: null, toggle: true, disable: null }, opt);
  if (isBoolean(opt.disable)) {
    opt.enable = !opt.disable;
  }
  const force = opt.toggle === false || isBoolean(opt.enable);
  const isImmersive = getImmersiveMode();
  let immersive = false;
  if (force) {
    immersive = opt.enable === true;
  } else {
    immersive = !isImmersive;
  }
  if (immersive) {
    panels.hideAll();
  } else {
    panels.showAll();
  }
  return immersive;
}

/**
 * Get immersive mode state
 * @return {Boolean} Enabled
 */
export function getImmersiveMode() {
  // assmue all hidden === immersive mode
  return panels.areAllhidden();
}

/**
 * Take every layer and randomly change the color
 * @param {string} mapId Map identifier
 */
export function randomUiColorAuto() {
  const max = 200;
  const id = setInterval(random, 200);
  let i = 0;
  function random() {
    if (i++ > max) {
      clearInterval(id, random);
    }
    randomUicolor();
  }
}

/**
 * Notify binding for shiny
 * @param {Object} NotifyCenter notify options
 */
export async function shinyNotify(opt) {
  if (nc instanceof NotifCenter) {
    nc.notify(opt.notif);
  }
}

/**
 * Fetch search API, using user id and token stored in config
 * @return {Promise<String>} Search api key
 */
async function getSearchApiKey() {
  try {
    const s = settings;
    const urlKey = new URL(getApiUrl("getSearchKey"));
    urlKey.searchParams.set("idUser", s.user.id);
    urlKey.searchParams.set("token", s.user.token);
    const r = await fetch(urlKey);
    if (r.ok) {
      const keyData = await r.json();
      if (keyData?.type === "error") {
        throw new Error(keyData.message);
      }
      return keyData.key;
    } else {
      throw new Error("getSearchKey failed");
    }
  } catch (e) {
    console.error(e);
  }
}

/**
 * Magnifier
 */
export function toggleMagnifier() {
  const map = getMap();
  if (map._has_mg) {
    mg.hide();
    map._has_mg = false;
  } else {
    if (mg.isInit) {
      mg.show();
    } else {
      mg.init(map);
    }
    map._has_mg = true;
  }
}

/**
 * Simple chaos test
 */
export async function chaosTest(opt) {
  const chaos = new ChaosTest(opt);
  const res = await chaos.start();
  return res;
}

/**
 * Debug style road
 */
export function debugRoad() {
  const map = getMap();
  const enabled =
    map.getLayoutProperty("road-debug", "visibility") === "visible";
  map.setLayoutProperty(
    "road-debug",
    "visibility",
    enabled ? "none" : "visible",
  );
}
