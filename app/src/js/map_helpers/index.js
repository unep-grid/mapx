import { ws, nc, events, listeners, theme } from "./../mx.js";
import { settings } from "./../settings";
import { featuresToPopup } from "./features_to_popup.js";
import { RadialProgress } from "./../radial_progress";
import { handleViewClick } from "./../views_click";
import { ButtonPanel } from "./../button_panel";
import { RasterMiniMap } from "./../raster_mini_map";
import { el, elSpanTranslate } from "./../el_mapx/index.js";
import { MainPanel } from "./../panel_main";
import { MapInfoBox } from "./../map_info_box";
import { Search } from "./../search";
import {
  MapxLogo,
  MapControlLiveCoord,
  MapControlScale,
} from "./../map_controls";
import { ControlsPanel } from "./../panel_controls";
import { MapxDraw } from "./../draw";
import { NotifCenter } from "./../notif_center/";
import { cleanDiacritic } from "./../string_util/";
import chroma from "chroma-js";
import { mirrorUrlCreate } from "./../mirror_util";
import { getAppPathUrl } from "./../api_routes/index.js";
import { isStoryPlaying, storyRead } from "./../story_map/index.js";
import { fetchViews } from "./../mx_helper_map_view_fetch.js";
import { wmsQuery } from "./../wms/index.js";
import { clearMapxCache, getVersion } from "./../app_utils";
import { onNextFrame } from "./../animation_frame/index.js";
import {
  handleMapDragOver,
  handleMapDrop,
} from "./../mx_helper_map_dragdrop.js";
import {
  getProjectViewsCollectionsShiny,
  updateViewsFilter,
  viewsListRenderNew,
  viewsListAddSingle,
} from "./../mx_helper_map_view_ui.js";
import { initLog } from "./../mx_helper_log.js";
import { dashboardHelper } from "./../dashboards/dashboard_instances.js";
import {
  date,
  updateIfEmpty,
  round,
  setBusy,
  clone,
  path,
  urlToImageBase64,
  showSelectProject,
  showSelectLanguage,
  showLogin,
  debounce,
  updateTitle,
  childRemover,
  getClickHandlers,
  setClickHandler,
  cssTransformFun,
  xyToDegree,
} from "./../mx_helper_misc.js";
import {
  modal,
  modalGetAll,
  modalCloseAll,
  modalConfirm,
} from "./../mx_helper_modal.js";
import { errorHandler } from "./../error_handler/index.js";
import { waitTimeoutAsync } from "./../animation_frame";
import { getArrayDiff, getArrayDistinct } from "./../array_stat/index.js";
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
} from "./../url_utils";
import { fetchSourceMetadata } from "./../mx_helper_map_view_metadata";
import { buildLegendVt } from "./../legend_vt/index.js";
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
  isNumeric,
  isString,
  isFunction,
  isBoolean,
  isViewOpen,
  isSourceId,
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
  isViewDownloadable,
  isViewRtWithLegend,
  isViewVtWithAttributeType,
} from "./../is_test_mapx/index.js";

/**
 * Storage
 */
const viewsActive = new Set();

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
    const download = await moduleLoad("downloadjs");
    const data = JSON.stringify(geojson);
    await download(data, filename);
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
    (urlItem) => isObject(urlItem) && isUrl(urlItem.url)
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
            hasLabel ? item.label : item.url
          )
        )
      );
      return elItem;
    })
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
    opt
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
  const hasShiny = window.Shiny;
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
  const hasShiny = window.Shiny;
  opt = Object.assign({}, { askConfirmIfModal: true, askConfirm: false }, opt);
  const idCurrentProject = path(mx, "settings.project.id");

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
      title: elSpanTranslate("modal_check_confirm_project_change_title"),
      content: elSpanTranslate("modal_check_confirm_project_change_txt"),
    });
  }
  if (changeNow) {
    await viewsCloseAll();
    const res = await change();
    return res;
  }

  /**
   * Change confirmed : remove all views, close modals, send
   * selected project to shiny
   */
  async function change() {
    modalCloseAll();
    setQueryParametersInitReset();
    if (hasShiny) {
      Shiny.onInputChange("selectProject", idProject);
    }
    const r = await Promise.all([
      events.once("settings_project_change"),
      events.once("views_list_updated"),
    ]);

    const idProjectNew = path(r[0], "new_project");
    const idProjectOld = path(r[0], "old_project");

    if (idProjectNew === idProjectOld) {
      console.warn("Project did not change", { idProjectNew, idProjectOld });
      return false;
    }
    if (isFunction(opt.onSuccess)) {
      opt.onSuccess();
    }
    events.fire({
      type: "project_change",
      data: {
        new_project: idProject,
        old_project: idCurrentProject,
      },
    });
    return true;
  }
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
    getQueryParameterInit("noViews")[0] === "true" ||
    getQueryParameterInit("modeLocked")[0] === "true";

  return !!modeLocked;
}

/**
 * Init global listener
 */

export function initListenerGlobal() {
  const map = getMap();
  /**
   * Handle view click
   */
  listeners.addListener({
    target: document.body,
    type: "click",
    idGroup: "view_list",
    callback: handleViewClick,
  });

  /*
   * Fire session start
   */
  events.fire({
    type: "session_start",
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
    ],
    idGroup: "update_share_modale",
    callback: updateSharingTool,
  });
  events.on({
    type: ["story_start", "story_close"],
    idGroup: "update_share_modale_story",
    callback: resetSharingTool,
  });
  map.on("move", updateSharingTool);
  map.on("styledata", updateSharingTool);

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
  /**
   *  Other listener
   */
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

  events.on({
    type: "project_change",
    idGroup: "project_change",
    callback: async function () {
      /**
       * Project change
       */
      await ws.connect();
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
    type: ["settings_user_change", "settings_change"],
    idGroup: "mapx_base",
    callback: updateUiSettings,
  });
  updateUiSettings();

  events.on({
    type: "views_list_updated",
    idGroup: "view_list_updated",
    callback: function () {
      getProjectViewsCollectionsShiny({
        idInput: "viewsListCollections",
      });
    },
  });

  events.on({
    type: ["view_created", "view_deleted"],
    idGroup: "clean_history_and_state",
    callback: () => {
      updateViewsFilter();
      viewsCheckedUpdate();
    },
  });

  events.on({
    type: ["views_list_updated", "view_add", "view_remove", "mapx_ready"],
    idGroup: "update_btn_filter_view_activated",
    callback: updateBtnFilterActivated,
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
      if (mx.search) {
        return mx.search.showApiConfig();
      }
    },
    group: "mapx_base",
  });

  listeners.addListener({
    target: document.getElementById("btnResetPanelSize"),
    type: "click",
    callback: () => {
      if (window._button_panels) {
        _button_panels.forEach((p) => p.resetSize());
      }
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
  if (window.Shiny) {
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
export async function updateUiSettings() {
  const langDef = getLanguageDefault();
  const lang = getLanguageCurrent();
  /**
   * Update app title (project or default)
   */
  updateTitle();

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
  const elBtnProject = document.getElementById("btnShowProjectLabel");
  const elBtnProjectPrivate = document.getElementById("btnShowProjectPrivate");
  const title = path(mx, "settings.project.title");
  elBtnProject.innerText = title[lang] || title[langDef] || settings.project.id;
  if (settings.project.public) {
    elBtnProjectPrivate.classList.remove("fa-lock");
  } else {
    elBtnProjectPrivate.classList.add("fa-lock");
  }

  /**
   * Language
   */
  await updateLanguage();
  const elBtnLanguage = document.getElementById("btnShowLanguageLabel");
  elBtnLanguage.innerText = await getDictItem(lang);
}

/**
 * Check if there is view activated and disable button if needed
 */
export function updateBtnFilterActivated() {
  const views = getViews();
  const elFilterActivated = document.getElementById("btnFilterChecked");
  /**
   * Check displayed views element
   */
  const hasViewsActivated = views.reduce((a, v) => {
    if (!v._vb) {
      return a || false;
    }
    let elView = v._vb.getEl();
    let isOpen = v._vb.isOpen();
    let style = window.getComputedStyle(elView);
    let isVisible = style.display !== "none";

    return a || (isOpen && isVisible);
  }, false);

  /**
   * Set elFilter disabled class
   */
  const isActivated = elFilterActivated.classList.contains("active");
  if (isActivated || hasViewsActivated) {
    elFilterActivated.classList.remove("disabled");
  } else {
    elFilterActivated.classList.add("disabled");
  }
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
 * @param {Object} o.mapPosition.bounds Mapbox bounds object
 * @param {Boolean} o.mapPosition.fitToBounds fit map to bounds
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
  mx.mapboxgl.accessToken = o.token || settings.map.token;

  /**
   * MapX map data : views, config, etc..
   */
  mx.maps[o.id] = Object.assign(
    {
      map: {},
      views: [],
    },
    mx.maps[o.id]
  );

  /**
   * Set mode
   */
  if (!o.modeStatic && getQueryParameter("storyAutoStart")[0] === "true") {
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
  if (getQueryParameter("closePanels")[0] === "true") {
    settings.initClosedPanels = true;
  }

  settings.mode.static = o.modeStatic || settings.mode.storyAutoStart;
  settings.mode.app = !settings.mode.static;

  /**
   * Update  sprites path
   */
  settings.style.sprite = getAppPathUrl("sprites");
  settings.style.glyphs = getAppPathUrl("fontstack");

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
  if (!mx.mapboxgl.supported()) {
    alert(
      "This website will not work with your browser. Please upgrade it or use a compatible one."
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

  if (queryLat) {
    mp.center = null;
    mp.lat = queryLat * 1 || 0;
  }
  if (queryLng) {
    mp.center = null;
    mp.lng = queryLng * 1 || 0;
  }
  if (queryZoom) {
    mp.z = queryZoom * 1 || 0;
  }
  if (queryPitch) {
    mp.p = queryPitch * 1 || 0;
  }
  if (queryBearing) {
    mp.b = queryBearing * 1 || 0;
  }
  /* map options */
  const mapOptions = {
    container: o.id, // container id
    style: settings.style, // mx default style
    maxZoom: settings.map.maxZoom,
    minZoom: settings.map.minZoom,
    preserveDrawingBuffer: false,
    attributionControl: false,
    crossSourceCollisions: true,
    zoom: mp.z || mp.zoom || 0,
    bearing: mp.b || mp.bearing || 0,
    pitch: mp.p || mp.pitch || 0,
    center: mp.center || [mp.lng || 0, mp.lat || 0],
  };
  /*
   * Create map object
   */
  const map = new mx.mapboxgl.Map(mapOptions);
  const elCanvas = map.getCanvas();
  elCanvas.setAttribute("tabindex", "-1");

  // Multiple maps were originally planned, never happened.
  // -> many function have an option for getting the map by id, but
  //    only one really exists. TODO: refactoring
  o.map = map;
  mx.maps[o.id].map = map;

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
      theme.set(idTheme, { save_url: true });
    }
  }

  if (!settings.mode.static) {
    /**
     * Init left panel
     */
    mx.panel_main = new MainPanel({
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
        container_style: {
          width: "470px",
          height: "90%",
          minWidth: "340px",
          minHeight: "450px",
        },
      },
    });
    if (!settings.initClosedPanels) {
      mx.panel_main.panel.open();
    }

    /**
     * Build theme config inputs only when settings tab is displayed
     */
    mx.panel_main.on("tab_change", (id) => {
      if (id === "tools") {
        const elInputs = document.getElementById("mxInputThemeColors");
        theme.linkInputs(elInputs);
      }
    });

    /**
     * Configure search tool
     */
    const key = await getSearchApiKey();
    mx.search = new Search({
      key: key,
      container: "#mxTabPanelSearch",
      host: settings.search.host,
      protocol: settings.search.protocol,
      port: settings.search.port,
      language: getLanguageCurrent(),
      index_template: "views_{{language}}",
    });

    /**
     * On tab change to search, perform a search
     */
    mx.panel_main.on("tab_change", async (id) => {
      if (id === "search") {
        await mx.search.initCheck();
        mx.search._elInput.focus();
      }
    });

    /**
     * On language change, update
     */
    events.on({
      type: "language_change",
      idGroup: "search_index",
      callback: (data) => {
        if (mx.search) {
          mx.search.setLanguage({
            language: data?.new_language,
          });
        }
      },
    });

    events.on({
      type: ["view_ui_open", "view_ui_close", "view_deleted"],
      idGroup: "search_index",
      callback: () => {
        mx.search._update_toggles_icons();
      },
    });
  }

  /**
   * Add map controls + left bar toolbox
   */
  mx.panel_tools = new ControlsPanel({
    panel: {
      id: "controls_panel",
      elContainer: document.body,
      position: "top-right",
      noHandles: true,
      button_text: getDictItem("btn_panel_controls"),
      button_lang_key: "btn_panel_controls",
      tooltip_position: "bottom-left",
      handles: ["free"],
      container_classes: ["button-panel--container-no-full-width"],
      item_content_classes: [
        "button-panel--item-content-transparent-background",
      ],
      panel_style: {
        marginTop: "40px",
      },
      container_style: {
        width: "100px",
        height: "400px",
        minWidth: "49px",
        minHeight: "49px",
      },
    },
  });

  if (!settings.initClosedPanels) {
    mx.panel_tools.panel.open();
  }

  /**
   * Initial mode terrain 3d / Sat
   */
  const ctrls = mx.panel_tools.controls;
  const enable3d = getQueryParameter("t3d")[0] === "true";
  const enableSat = getQueryParameter("sat")[0] === "true";
  if (enable3d) {
    ctrls.getButton("btn_3d_terrain").action("enable");
  }
  if (enableSat) {
    ctrls.getButton("btn_theme_sat").action("enable");
  }

  /**
   * Add mapx draw handler
   */
  mx.draw = new MapxDraw({
    map: map,
    panel_tools: mx.panel_tools,
    url_help: settings.links.repositoryWikiDrawTool,
  });
  mx.draw.on("enable", () => {
    setClickHandler({
      type: "draw",
      enable: true,
    });
  });
  mx.draw.on("disable", () => {
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
  mx.infobox = new MapInfoBox(map);

  /**
   * Add controls
   */
  map.addControl(new MapControlLiveCoord(), "bottom-right");
  map.addControl(new MapControlScale(), "bottom-right");
  map.addControl(new MapxLogo(), "bottom-left");

  /**
   * Init global listeners
   */
  initLog();
  initListenerGlobal();
  initMapListener(map);
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
  mx.highlighter.init(map);

  events.on({
    type: ["view_add", "view_remove", "story_step", "story_close"],
    idGroup: "highlight_clear",
    callback: () => {
      mx.highlighter.clean();
    },
  });

  theme.on("set_colors", (colors) => {
    mx.highlighter.setOptions({
      highlight_color: colors.mx_map_feature_highlight.color,
    });
    if (window.jed && jed.aceEditors) {
      for (const e of jed.aceEditors) {
        e._set_theme_auto();
      }
    }
  });

  map.on("mousemove", (e) => {
    if (0) {
      /**
       * Change illuminaion direction accoding to mouse position
       * - Quite intensive on GPU.
       * - setPaintProperty seems buggy
       */
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
        deg
      );
    }

    const layers = getLayerNamesByPrefix({
      id: map.id,
      prefix: "MX", // custom code could be MXCC ...
    });
    /**
     * Change cursor when hovering mapx layers : invite for click
     */
    const features = map.queryRenderedFeatures(e.point, { layers: layers });
    map.getCanvas().style.cursor = features.length ? "pointer" : "";
  });
}

export async function initMapxStatic(o) {
  const map = getMap();
  const mapData = getMapData();
  const zoomToViews = getQueryParameter("zoomToViews")[0] === "true";
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

  /**
   * Update language
   */
  await updateLanguage(language);

  /**
   * If no views, send mapx_ready early
   */

  if (idViews.length) {
    /**
     * Get view and set order
     */
    mapData.views = await getViewsRemote(idViews);

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
  mx.panel_legend = new ButtonPanel({
    id: "button_legend",
    elContainer: document.body,
    panelFull: true,
    position: "top-left",
    tooltip_position: "right",
    button_text: getDictItem("button_legend_button"),
    button_lang_key: "button_legend_button",
    button_classes: ["fa", "fa-list-ul"],
    container_style: {
      width: "300px",
      height: "300px",
      minWidth: "200px",
      minHeight: "200px",
    },
  });

  /**
   * If there is view, render all
   */

  if (mapData.views && mapData.views.length) {
    /**
     * Extract all views bounds
     */
    if (zoomToViews) {
      const bounds = await getViewsBounds(mapData.views);
      map.fitBounds(bounds);
    }

    /**
     * Display views
     */
    for (const view of mapData.views) {
      await viewLayersAdd({
        view: view,
        elLegendContainer: mx.panel_legend.elPanelContent,
        addTitle: true,
      });
    }
    await viewsLayersOrderUpdate({
      order: idViews.reverse(),
    });
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
  const hasShiny = !!window.Shiny;

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
  const addPopup = !(hasCC || hasSdk || hasDraw || hasDashboard);
  const addHighlight = !hasDraw;

  const retrieveAttributes = addPopup || hasSdk;

  if (!hasLayer && type !== "click") {
    return;
  }

  if (retrieveAttributes) {
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

    /**
     * Dispatch to event
     */
    await attributesToEvent(layersAttributes, e);

    if (addPopup) {
      /**
       * Click event : make a popup with attributes
       */
      const popup = new mx.mapboxgl.Popup()
        .setLngLat(map.unproject(e.point))
        .addTo(map);

      events.once({
        type: [
          "view_remove",
          "view_add",
          "story_step",
          "story_lock",
          "story_close",
        ],
        idGroup: "click_popup",
        callback: () => {
          popup.remove();
        },
      });

      /**
       * Remove highlighter too
       */
      popup.on("close", () => {
        mx.highlighter.clean();
      });

      /**
       * NOTE: see features_popup.js
       */
      featuresToPopup({
        layersAttributes: layersAttributes,
        popup: popup,
      });
    }
  }

  if (addHighlight) {
    /**
     * Update highlighter after displaying popup:
     * The popup, when closed **on map click**, should remove highlighting : this should
     * be done BEFORE updating highlighter.
     * onNextFrame seems to do the job by delaying the upadte to the next animation frame.
     */
    onNextFrame(() => {
      mx.highlighter.update(e);
    });
  }
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
 * Get local forage item and send it to shiny server
 * @param {Object} o options
 * @param {String} o.idStore Id/Name of the store
 * @param {String} o.idKey Key to retrieve
 * @param {String} o.idInput Which id to trigger in Shiny
 */
export function getLocalForageData(o) {
  const db = mx.data[o.idStore];
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
      lang
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

/**
 * Add source from view object
 * @param {Object} o options
 * @param {Object|String} o.map Map object or map id
 * @param {Oject} o.view View object
 * @param {Boolean} o.noLocationCheck Don't check for location matching
 */
export async function addSourceFromView(o) {
  const p = path;

  const vType = p(o.view, "type");
  const isVt = vType === "vt";
  const isRt = vType === "rt";
  const isGj = vType === "gj";
  const validType = isVt || isRt || isGj;
  const hasSource = !!p(o.view, "data.source");

  if (!validType || !hasSource) {
    return;
  }

  const idSource = `${o.view.id}-SRC`;
  const project = p(mx, "settings.project.id");
  const projectView = p(o.view, "project");
  const projectsView = p(o.view, "data.projects", []);
  const useMirror = p(o.view, "data.source.useMirror");
  const isEditable = isViewEditable(o.view);
  const isLocationOk =
    o.noLocationCheck ||
    projectView === project ||
    projectsView.indexOf(project) > -1;

  if (!isLocationOk && isEditable) {
    /*
     * This should be handled in DB. TODO:check why this is needed here...
     */
    o.view._edit = false;
  }

  if (isVt) {
    const urlBase = getApiUrl("getTile");
    const useServerCache = settings.tiles.vector.useCache;
    // Per source settings: set in mx_sources -> services ->'mx_postgis_tiler'
    const usePostgisTiles = isEmpty(settings.tiles.vector.usePostgisTiles)
      ? o.view._use_postgis_tiler
      : settings.tiles.vector.usePostgisTiles;
    // NOTE: Can't use URL() : contains {x}/{y}/{z} = escaped.
    const url =
      `${urlBase}?view=${o.view.id}&` +
      // Server cache invalidation
      `skipCache=${!useServerCache}&` +
      // By defautl, geojson-vt is used alternative: postgis asmvt
      `usePostgisTiles=${!!usePostgisTiles}&` +
      // Browser cache invalidation using view timestamp
      `timestamp=${o.view.date_modified}`;

    o.view.data.source.tiles = [url, url];
    o.view.data.source.promoteId = "gid";
  }

  if (isGj) {
    /**
     * Add gid property if it does not exist
     */
    const features = path(o.view, "data.source.data.features", []);
    let gid = 1;
    features.forEach((f) => {
      if (!f.properties) {
        f.properties = {};
      }
      if (!f.properties.gid) {
        f.properties.gid = gid++;
      }
    });
    o.view.data.source.promoteId = "gid";
  }

  const sourceExists = !!o.map.getSource(idSource);

  if (sourceExists) {
    /**
     * Handle case when old layers remain in map
     * This could prevent source removal
     */
    removeLayersByPrefix({
      prefix: o.view.id,
      map: o.map,
    });
    /**
     * Remove old source
     */
    o.map.removeSource(idSource);
  }

  const source = clone(o.view.data.source);

  if (isRt && useMirror) {
    const tiles = source.tiles;
    for (let i = 0, iL = tiles.length; i < iL; i++) {
      tiles[i] = mirrorUrlCreate(tiles[i]);
    }
  }

  o.map.addSource(idSource, source);
}

/**
 * Get remote view from latest views table
 * @param {String} idView id of the view
 * @return {Promise} Promise resolving to object
 */
export async function getViewRemote(idView) {
  const apiUrlViews = getApiUrl("getView");
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
 * Get multipler remote views from latest views table
 * @param {Array} idViews array of views id
 * @return {Promise} Promise resolving to abject
 */
export async function getViewsRemote(idViews) {
  const views = [];
  for (let id of idViews) {
    const view = await getViewRemote(id);
    if (isView(view)) {
      views.push(view);
    }
  }
  return views;
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
      }, state)
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
      if (idViewsOpen.length) {
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

      await viewsLayersOrderUpdate();
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
      childRemover(elProgContainer);
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
  await mx.data.geojson.iterate((value) => {
    const view = value.view;
    if (view.project === project) {
      out.push(view);
    }
  });
  return out;
}

/**
 * TODO: Early/historic code. Refactor this and integrate into a view class
 */
export async function viewsCheckedUpdate(o) {
  o = o || {};

  const vToAdd = [];
  const vToRemove = [];
  const vVisible = [];
  const vChecked = [];
  const proms = [];

  let isChecked, id;

  /**
   * Get views checked
   */
  const els = document.querySelectorAll(
    "[data-view_action_key='btn_toggle_view']"
  );

  for (var i = 0; i < els.length; i++) {
    id = els[i].dataset.view_action_target;
    isChecked = els[i].checked === true;
    if (isChecked) {
      vChecked.push(id);
    }
  }

  /**
   * Update views groups
   */
  vVisible.push(...getViewsOpen());
  vToRemove.push(...getArrayDiff(vVisible, vChecked));
  vToAdd.push(...getArrayDiff(vChecked, vVisible));

  /**
   * View to add
   */
  proms.push(...vToAdd.map(viewAdd));

  /**
   * View to remove
   */
  proms.push(...vToRemove.map(viewRemove));

  /**
   * Inform Shiny about the state
   */
  if (true) {
    const summary = {
      vVisible: getViewsLayersVisibles(),
      vChecked: vChecked,
      vToRemove: vToRemove,
      vToAdd: vToAdd,
    };
    Shiny.onInputChange("mx_client_views_status", summary);
  }

  /**
   * Wait add/remove views operations to be completed
   */
  const done = await Promise.all(proms);

  /**
   * Set layer order
   */
  await viewsLayersOrderUpdate(o);

  /**
   * Fire event
   */
  events.fire({
    type: "views_list_ordered",
  });
  return done;
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
    "input[data-view_action_key='btn_toggle_view']"
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
 * Update layer order based on view list position
 * @param {Object} o Options
 * @param {String} o.id Id of the map
 * @param {Array} o.order Array of layer base name. If empty, use `getViewsOrder`
 * @return {Promise}
 */

export function viewsLayersOrderUpdate(o) {
  o = o || {};
  return new Promise((resolve) => {
    /**
     * Get order list by priority :
     * 1) Given order
     * 2) Order of displayed views (ui, list)
     * 3) Views list
     */
    const map = getMap(o.id);
    const views = getViews({ id: o.id });
    const order = o.order || getViewsOrder() || views.map((v) => v.id) || null;

    if (!order || order.length === 0) {
      resolve(order);
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
      const layersView = layersDiplayed.filter(
        (d) => path(d, "metadata.idView", d.id) === idView
      );

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
    resolve(order);
  });
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
export function getViewsOrder() {
  const viewContainer = document.querySelector(".mx-views-list");
  if (!viewContainer) {
    return [];
  }
  const els = viewContainer.querySelectorAll(".mx-view-item");
  const res = [];
  for (let el of els) {
    res.push(el.dataset.view_id);
  }
  return res;
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
  keys.forEach((k) => {
    let value = view[k];
    if (value) {
      out[k] = value;
    }
  });
  if (opt.asString) {
    return JSON.stringify(out);
  } else {
    return out;
  }
}

/**
 * Create and listen to transparency sliders
@param {Object} o Options
@param {Object} o.view View data
@param {String} o.idMap Map id
*/
export async function makeTransparencySlider(o) {
  const view = o.view;
  const el = document.querySelector(
    "[data-transparency_for='" + view.id + "']"
  );

  if (!el) {
    return;
  }

  const noUiSlider = await moduleLoad("nouislider");
  const oldSlider = view._filters_tools.transparencySlider;
  if (oldSlider) {
    oldSlider.destroy();
  }

  const slider = noUiSlider.create(el, {
    range: { min: 0, max: 100 },
    step: 1,
    start: 0,
    tooltips: false,
  });

  slider._view = view;

  /*
   * Save the slider in the view
   */
  view._filters_tools.transparencySlider = slider;

  /*
   *
   */
  slider.on(
    "update",
    debounce((n, h) => {
      const view = slider._view;
      const opacity = 1 - n[h] * 0.01;
      view._setOpacity({ opacity: opacity });
    }, 10)
  );
}

/**
 * Create and listen to numeric sliders
@param {Object} o Options
@param {Object} o.view View data
@param {String} o.idMap Map id
*/
export async function makeNumericSlider(o) {
  const view = o.view;

  const el = document.querySelector(
    "[data-range_numeric_for='" + view.id + "']"
  );

  if (!el) {
    return;
  }

  const oldSlider = view._filters_tools.numericSlider;
  if (oldSlider) {
    oldSlider.destroy();
  }

  const summary = await getViewSourceSummary(view);

  let min = path(summary, "attribute_stat.min", 0);
  let max = path(summary, "attribute_stat.max", min);

  if (view && min !== null && max !== null) {
    if (min === max) {
      min = min - 1;
      max = max + 1;
    }

    const range = {
      min: min,
      max: max,
    };
    const noUiSlider = await moduleLoad("nouislider");

    const slider = noUiSlider.create(el, {
      range: range,
      step: (min + max) / 1000,
      start: [min, max],
      connect: true,
      behaviour: "drag",
      tooltips: false,
    });

    slider._view = view;
    slider._elMin = el.parentElement.querySelector(".mx-slider-range-min");
    slider._elMax = el.parentElement.querySelector(".mx-slider-range-max");
    slider._elDMax = el.parentElement.querySelector(".mx-slider-dyn-max");
    slider._elDMin = el.parentElement.querySelector(".mx-slider-dyn-min");

    /**
     * update min / max range
     */
    slider._elMin.innerText = range.min;
    slider._elMax.innerText = range.max;

    /*
     * Save the slider in the view
     */
    view._filters_tools.numericSlider = slider;

    /*
     *
     */
    slider.on(
      "update",
      debounce((n) => {
        const view = slider._view;
        const elDMin = slider._elDMin;
        const elDMax = slider._elDMax;
        const k = path(view, "data.attribute.name", "");

        /* Update text values*/
        if (n[0]) {
          elDMin.innerHTML = n[0];
        }
        if (n[1]) {
          elDMax.innerHTML = " – " + n[1];
        }

        const filter = [
          "any",
          ["!=", ["typeof", ["get", k]], "number"],
          ["all", ["<=", ["get", k], n[1] * 1], [">=", ["get", k], n[0] * 1]],
        ];

        if (isArray(view._null_filter)) {
          filter.push(view._null_filter);
        }

        view._setFilter({
          filter: filter,
          type: "numeric_slider",
        });
      }, 100)
    );
  }
}

/**
 * Create and listen to time sliders
 */
export async function makeTimeSlider(o) {
  const k = {};
  k.t0 = "mx_t0";
  k.t1 = "mx_t1";

  const view = o.view;
  const elView = getViewEl(view);
  let el;
  if (elView) {
    el = elView.querySelector('[data-range_time_for="' + view.id + '"]');
    if (!el) {
      return;
    }
  }
  const oldSlider = view._filters_tools.timeSlider;
  if (oldSlider) {
    oldSlider.destroy();
  }

  const summary = await getViewSourceSummary(view);
  const extent = path(summary, "extent_time", {});
  const attributes = path(summary, "attributes", []);

  /*
   * Create a time slider for each time enabled view
   */
  /* from slider to num */
  const fFrom = function (x) {
    return x;
  };
  /* num to slider */
  const fTo = function (x) {
    return Math.round(x);
  };

  if (extent.min || extent.max) {
    const start = [];

    if (extent.min && extent.max) {
      const hasT0 = attributes.indexOf(k.t0) > -1;
      const hasT1 = attributes.indexOf(k.t1) > -1;
      let min = extent.min * 1000;
      let max = extent.max * 1000;

      if (min === max) {
        min = min - 1;
        max = max + 1;
      }

      const range = {
        min: min,
        max: max,
      };

      start.push(min);
      start.push(max);

      const noUiSlider = await moduleLoad("nouislider");

      const slider = noUiSlider.create(el, {
        range: range,
        step: 24 * 60 * 60 * 1000,
        start: start,
        connect: true,
        behaviour: "drag",
        tooltips: false,
        format: {
          to: fTo,
          from: fFrom,
        },
      });

      /**
       * Save slider in the view and view ref in target
       */
      slider._view = view;
      slider._elDMin = el.parentElement.querySelector(".mx-slider-dyn-min");
      slider._elDMax = el.parentElement.querySelector(".mx-slider-dyn-max");
      slider._elMin = el.parentElement.querySelector(".mx-slider-range-min");
      slider._elMax = el.parentElement.querySelector(".mx-slider-range-max");

      slider._elMin.innerText = date(range.min);
      slider._elMax.innerText = date(range.max);

      view._filters_tools.timeSlider = slider;

      slider.on(
        "update",
        debounce((t) => {
          const view = slider._view;
          const elDMax = slider._elDMax;
          const elDMin = slider._elDMin;
          /* Update text values*/
          if (t[0]) {
            elDMin.innerHTML = date(t[0]);
          }
          if (t[1]) {
            elDMax.innerHTML = " – " + date(t[1]);
          }

          const filterAll = ["all"];

          const filter = [
            "any",
            ["==", ["typeof", ["get", k.t0]], "string"],
            ["==", ["typeof", ["get", k.t1]], "string"],
          ];

          //filter.push(["==", ["get", k.t0], -9e10]);
          //filter.push(["==", ["get", k.t1], -9e10]);

          if (hasT0 && hasT1) {
            filterAll.push(
              ...[
                ["<=", ["get", k.t0], t[1] / 1000],
                [">=", ["get", k.t1], t[0] / 1000],
              ]
            );
          } else if (hasT0) {
            filterAll.push(
              ...[
                [">=", ["get", k.t0], t[0] / 1000],
                ["<=", ["get", k.t0], t[1] / 1000],
              ]
            );
          }
          filter.push(filterAll);

          view._setFilter({
            filter: filter,
            type: "time_slider",
          });
        }, 100)
      );
    }
  }
}

/**
 * Handle view data text filter listener
 * @param {object} o options
 * @param {string} o.id map id
 */
export function handleViewValueFilterText(o) {
  /*
   * Set listener for each view search input
   * NOTE: keyup is set globaly, on the whole view list
   */
  return function (event) {
    let action, el, idView, search, options;
    el = event.target;

    idView = el.dataset.view_action_target;
    action = el.dataset.view_action_key;

    if (!idView || action !== "view_search_value") {
      return;
    }

    search = event.target.value;

    options = {
      id: o.id,
      idView: idView,
      search: search,
    };

    filterViewValues(options);
  };
}

/**
 * Remove view from views list and geojson database
 * @param {Object} view View to remove from the list
 */
export async function viewDelete(view) {
  const mData = getMapData();
  const views = getViews();
  view = getView(view);
  const exists = views.includes(view);
  if (!exists) {
    return;
  }
  const vIndex = views.indexOf(view);
  const geojsonData = mx.data.geojson;

  await viewLayersRemove({
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
export async function viewLayersRemove(o) {
  const view = o.view || getView(o.idView);
  o.id = o.id || settings.map.id;

  if (!isView(view)) {
    return false;
  }

  const now = Date.now();
  const viewDuration = now - view._added_at || 0;
  delete view._added_at;

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

  await viewModulesRemove(view);

  viewsActive.delete(view.id);

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
 * Enable/open view from the list
 * @param {Object} view View to open
 */
function _viewUiOpen(view) {
  view = getView(view);
  if (!isView(view)) {
    return;
  }
  if (view._vb) {
    view._vb.open();
  }
  view._open = true;
  events.fire({
    type: "view_ui_open",
    data: {
      idView: view.id,
    },
  });
  return true;
}

/**
 * Close / uncheck view – if exists – in view list
 * @param {String|View} idView id of the view or view object
 */
async function _viewUiClose(view) {
  view = getView(view);
  if (!isView(view)) {
    return;
  }
  if (view._vb) {
    view._vb.close();
  }
  view._open = false;
  events.fire({
    type: "view_ui_close",
    data: {
      idView: view.id,
    },
  });
  return true;
}

/**
 * Get view, open it and add layers if any
 * @param {Object} view View to open
 * @return {Promise} Boolean
 */
export async function viewAdd(view) {
  try {
    view = getView(view);
    if (!isView(view)) {
      return;
    }
    /**
     * Open ui before layers :
     * - Layers can take a while
     * - Search list need quickly an
     *   event to trigger toggles
     */
    _viewUiOpen(view);
    await viewLayersAdd({
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
 * Removed both view UI and layers, handle view_removed event
 * @param {Object} view
 * @return {Promise<Boolean>} Boolean
 */
export async function viewRemove(view) {
  try {
    view = getView(view);
    if (!isView(view)) {
      return;
    }
    _viewUiClose(view);
    await viewLayersRemove({
      idView: view.id,
    });
    return true;
  } catch (e) {
    console.warn(e);
    return false;
  }
}

/**
 * Get id of all view opened
 * @return {Array}
 */
export function getViewsOpen() {
  const open = [];
  const viewOrder = getViewsOrder();
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
  return Array.from(viewsActive);
}

/**
 * Get view el
 * @param {Object} view View
 */
export function getViewEl(view) {
  return view._el || document.querySelector("[data-view_id='" + view.id + "']");
}

/**
 * Filter current view and store rules
 * @param {Object} o Options
 * @param {Array} o.filter Array of filter
 * @param {String} o.type Type of filter : style, legend, time_slider, search_box or numeric_slider
 */
export function viewSetFilter(o) {
  o = o || {};
  const m = getMap();
  const view = this;
  const idView = view.id;
  const filterView = view._filters;
  const filter = o.filter;
  const type = o.type ? o.type : "default";
  const layers = getLayerByPrefix({ prefix: idView });
  const hasFilter = isArray(filter) && filter.length > 1;
  const filterNew = [];

  events.fire({
    type: "view_filter",
    data: {
      idView: idView,
      filter: filter,
    },
  });

  /**
   * Add filter to filter type e.g. {legend:["all"],...} -> {legend:["all",["==","value","a"],...}
   * ... or reset to default null
   */
  filterView[type] = hasFilter ? filter : null;

  /**
   * Filter object to filter array
   */
  for (let t in filterView) {
    let f = filterView[t];
    if (f) {
      filterNew.push(f);
    }
  }

  /**
   * Apply filters to each layer, in top of base filters
   */

  for (let layer of layers) {
    let filterOrig = path(layer, "metadata.filter", null);
    let filterFinal = [];
    if (!filterOrig) {
      filterFinal.push("all", ...filterNew);
    } else {
      filterFinal.push(...filterOrig, ...filterNew);
    }
    m.setFilter(layer.id, filterFinal);
  }

  events.fire({
    type: "view_filtered",
    data: {
      idView: idView,
      filter: filterView,
    },
  });
}

/**
 * Set this view opacity
 * @param {Object} o Options
 * @param {Array} o.opacity
 */
export function viewSetOpacity(o) {
  o = o || {};
  const view = this;
  const idView = view.id;
  const opacity = o.opacity;
  const idMap = view._idMap ? view._idMap : settings.map.id;
  const map = getMap(idMap);
  const layers = getLayerByPrefix({
    map: map,
    prefix: idView,
  });

  layers.forEach((layer) => {
    const type = layer.type === "symbol" ? "icon" : layer.type;
    const property = type + "-opacity";
    try {
      map.setPaintProperty(layer.id, property, opacity);
    } catch (e) {
      console.error(e);
    }
  });
}

/**
 * Plot distribution
 * @param {Object} o options
 * @param {Object} o.data Object containing year "year" and value "n"
 * @param {Element} o.el Element where to append the plot
# @param {string} o.type Type of plot. By default = density
*/
export function plotTimeSliderData(o) {
  const data = o.data;
  const el = o.el;
  o.type = o.type ? o.type : "density";

  if (!data || !data.year || !data.n) {
    return;
  }

  const obj = {
    labels: data.year,
    series: [data.n],
  };

  const options = {
    seriesBarDistance: 100,
    height: "30px",
    showPoint: false,
    showLine: false,
    showArea: true,
    fullWidth: true,
    showLabel: false,
    axisX: {
      showGrid: false,
      showLabel: false,
      offset: 0,
    },
    axisY: {
      showGrid: false,
      showLabel: false,
      offset: 0,
    },
    chartPadding: 0,
    low: 0,
  };

  divPlot = document.createElement("div");
  divPlot.className = "ct-chart ct-square mx-slider-chart";
  el.append(divPlot);
  cL = new Chartist.Line(divPlot, obj, options);
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
    o
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
      o.base ? getLayerBaseName(l.id) : l.id
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

  maps = mx.maps;
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
export async function viewLayersAdd(o) {
  const dh = dashboardHelper;
  const m = getMapData(o.id);
  if (o.idView) {
    o.idView = o.idView.split(settings.separators.sublayer)[0];
  }
  if (!o.elLegendContainer && mx.panel_legend) {
    o.elLegendContainer = mx.panel_legend.elPanelContent;
  }
  const isStory = isStoryPlaying();
  const idLayerBefore = o.before
    ? getLayerNamesByPrefix({ prefix: o.before })[0]
    : settings.layerBefore;
  let view = o.view || getView(o.idView) || {};

  /**
   * Solve case where view is not set : try to fetch remote
   */
  if (!isView(view) && isViewId(o.idView)) {
    view = await getViewRemote(o.idView);
  }

  /*
   * Validation
   */
  if (!isView(view)) {
    console.warn(
      "viewLayerAdd : view not found, locally or remotely. Options:",
      o
    );
    return;
  }

  const idView = view.id;
  const idMap = o.id || settings.map.id;
  const idType = view.type;

  /**
   * Fire view add event
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
   * Create dashboard.
   * - As story steps could manage dashboard state,
   *   it's rendered inside the story
   */
  if (!isStory) {
    await dh.viewAutoDashboardAsync(view);
    await dh.autoDestroy();
  }

  /**
   * View aded fully : send event
   */
  view._added_at = Date.now();

  viewsActive.add(view.id);

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
        res = await viewLayersAddRt({
          view: view,
          map: m.map,
          before: idLayerBefore,
          elLegendContainer: o.elLegendContainer,
          addTitle: o.addTitle,
        });
        break;
      case "cc":
        res = await viewLayersAddCc({
          view: view,
          map: m.map,
          before: idLayerBefore,
          elLegendContainer: o.elLegendContainer,
          addTitle: o.addTitle,
        });
        break;
      case "vt":
        res = await viewLayersAddVt({
          view: view,
          map: m.map,
          debug: o.debug,
          before: idLayerBefore,
          elLegendContainer: o.elLegendContainer,
          addTitle: o.addTitle,
        });
        break;
      case "gj":
        res = await viewLayersAddGj({
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
    },
    opt
  );

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
      `#view_legend_container_${idView}`
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

  const title = getLabelFromObjectPath({
    obj: view,
    path: "data.title",
    defaultValue: "[ missing title ]",
  });

  const elLegendTitle = el("div", [
    el(
      "div",
      {
        class: ["mx-legend-view-title-container"],
      },
      el(
        "span",
        {
          class: ["mx-legend-view-title", "text-muted", "hint--bottom"],
          "aria-label": `${title}`,
        },
        opt.addTitle ? title : ""
      ),
      el(
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
        })
      )
    ),
  ]);

  /**
   * Legend element
   */
  const elLegend = el("div", {
    class: "mx-view-legend-" + opt.type,
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
      style: { order: 0 },
    },
    opt.addTitle ? elLegendTitle : null,
    elLegend
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
  const isOpen = isValid && isViewOpen(view);

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
      await viewAdd(view);

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
async function viewLayersAddCc(o) {
  const view = o.view;
  const map = o.map;
  const methods = path(view, "data.methods");

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
    cc = new Function(methods)();
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
    map.addLayer(layer, mx.settings.layerBefore);
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
async function viewLayersAddRt(o) {
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
    o.before
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
      legendTitle
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
          /* Raster MiniMap added, here */
          view._miniMap = miniMap;
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
export async function viewLayersAddVt(o) {
  const view = getView(o.view);
  const addLegend = isEmpty(o.addLegend) ? true : !!o.addLegend;
  const out = await getViewMapboxLayers(view);
  const layers = out.layers;
  const rules = out.rules;
  /**
   * Add layer and legends
   */
  if (layers.length > 0) {
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
    }

    /*
     * Add layers to the map
     */
    await addLayers(layers, o.before);
    await viewsLayersOrderUpdate();
  } else {
    return false;
  }
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

  /**
   * Clean rules;
   * - If next rules is identical, remove it from legend
   * - Set sprite path
   */
  /*if (config.useStyleNull) {*/
  /*rulesLegend.push(ruleNulls);*/
  /*}*/

  let pos = 0;
  const idRulesToRemove = [];
  for (const rule of rules) {
    const ruleNext = rules[++pos];
    const hasSprite = rule?.sprite !== "none";
    const nextHasSprite = !!ruleNext && ruleNext?.sprite !== "none";

    const isDuplicated =
      ruleNext &&
      ruleNext.value === rule.value &&
      ruleNext.color === rule.color;

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
   * Add legend using template
   */
  const elLegend = elLegendBuild(view, {
    type: "vt",
    removeOld: true,
    elLegendContainer: elLegendContainer,
    addTitle: addTitle,
  });
  if (isElement(elLegend)) {
    /**
     * viewLayersAddVt rendering time :
     * el + ecoregion2017
     * 606 ms
     * 534 ms
     * 504 ms
     * 403 ms
     *
     * dot + ecoregion2017
     * 517 ms
     * 725 ms
     * 928 ms
     * 660 ms
     */
    /**
     * el
     */
    const elLegendContent = buildLegendVt(view);
    elLegend.appendChild(elLegendContent);
    /*
     * dot
     */
    //elLegend.innerHTML = mx.templates.viewListLegend(view);
  }
}

/**
 * Add mutiple layers at once
 * TODO: convert MapX layers to datadriven layers.
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
 * Add filtering system to views
 * @param {String|Object} idView id or View to update
 * @return {Promise}
 */
export function viewFiltersInit(idView) {
  const view = getView(idView);
  if (!isView(view)) {
    return;
  }
  /**
   * Add methods
   */
  view._filters = {
    style: ["all"],
    legend: ["all"],
    time_slider: ["all"],
    search_box: ["all"],
    numeric_slider: ["all"],
    custom_style: ["all"],
  };
  view._setFilter = viewSetFilter;
  view._setOpacity = viewSetOpacity;
}

export async function viewUiContent(id) {
  const view = getView(id);
  if (!isView(view)) {
    return;
  }

  const elView = getViewEl(view);
  const hasViewEl = isElement(elView);

  if (hasViewEl) {
    const elOptions = elView.querySelector(
      `[data-view_options_for='${view.id}']`
    );

    if (elOptions) {
      elOptions.innerHTML = mx.templates.viewListOptions(view);
    }
    const elControls = elView.querySelector(
      `#view_contols_container_${view.id}`
    );
    if (elControls) {
      elControls.innerHTML = mx.templates.viewListControls(view);
    }
    const elFilters = elView.querySelector(
      `#view_filters_container_${view.id}`
    );
    if (elFilters) {
      elFilters.innerHTML = mx.templates.viewListFilters(view);
    }
    return true;
  }
}

/**
 * Add sliders and searchbox
 * @param {String|Object} id id or View to update
 */
export async function viewFilterToolsInit(id, opt) {
  opt = Object.assign({}, { clear: false }, opt);
  try {
    const view = getView(id);
    if (!isView(view)) {
      return;
    }
    const idMap = settings.map.id;
    if (view._filters_tools) {
      return;
    }
    view._filters_tools = {};
    const proms = [];
    /**
     * Add interactive module
     */
    proms.push(makeTimeSlider({ view: view, idMap: idMap }));
    proms.push(makeNumericSlider({ view: view, idMap: idMap }));
    proms.push(makeTransparencySlider({ view: view, idMap: idMap }));
    proms.push(makeSearchBox({ view: view, idMap: idMap }));
    await Promise.all(proms);
  } catch (e) {
    throw new Error(e);
  }
}

/**
 * Clean stored modules : dashboard, custom view, etc.
 */
export async function viewModulesRemove(view) {
  const dh = dashboardHelper;

  view = isViewId(view) ? getView(view) : view;

  if (!isView(view)) {
    return false;
  }

  const it = view._filters_tools || {};
  delete view._filters_tools;

  if (isFunction(view._onRemoveCustomView)) {
    await view._onRemoveCustomView();
    console.log("remove cc module");
  }

  if (isElement(view._elLegend)) {
    view._elLegend.remove();
    delete view._elLegend;
  }

  if (dh.viewHasWidget(view)) {
    await dh.viewRmWidgets(view);
    await dh.autoDestroy();
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
 */
export function viewLayersAddGj(opt) {
  return new Promise((resolve) => {
    const layer = path(opt.view, "data.layer");

    if (!layer.metadata) {
      layer.metadata = {
        priority: 0,
        position: 0,
        idView: opt.view.id,
        filter: [],
      };
    }

    opt.map.addLayer(layer, opt.before);
    resolve(true);
  });
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
    o
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
  //const excludeProp = [];
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

  const sources = getMap().getStyle()?.sources;

  /**
   * Fetch view data for one or many views
   * and fetch properties
   */
  idViews
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

      const layers = getLayerNamesByPrefix({
        map: map,
        prefix: id,
      });

      const features = map.queryRenderedFeatures(opt.point, {
        layers: layers,
      });

      const out = modeObject ? {} : [];

      features.forEach((f) => {
        if (modeObject) {
          for (const p in f.properties) {
            /**
             * Exclude prop (time, gid, etc)
             */
            if (excludeProp.indexOf(p) === -1) {
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

/*selectize version*/
export async function makeSearchBox(o) {
  const view = o.view;
  const el = document.querySelector(`[data-search_box_for='${view.id}']`);
  if (!el) {
    return;
  }
  const elViewParent = getViewEl(view).parentElement;

  await moduleLoad("selectize");

  const attr = path(view, "data.attribute.name");

  const summary = await getViewSourceSummary(view);

  const choices = summaryToChoices(summary);

  const searchBox = $(el)
    .selectize({
      dropdownParent: elViewParent,
      placeholder: "Search",
      choices: choices,
      valueField: "value",
      labelField: "label",
      searchField: ["label"],
      options: choices,
      onChange: selectOnChange,
    })
    .data().selectize;

  /**
   * Save selectr object in the view
   */
  searchBox.view = view;
  view._filters_tools.searchBox = searchBox;

  return searchBox;

  function selectOnChange() {
    const view = this.view;
    const listObj = this.getValue();
    const filter = ["any"];
    listObj.forEach(function (x) {
      filter.push(["==", ["get", attr], x]);
    });
    view._setFilter({
      filter: filter,
      type: "search_box",
    });
  }

  function summaryToChoices(summary) {
    const table = path(summary, "attribute_stat.table", []);
    return table.map((r) => {
      return {
        value: r.value,
        label: `${r.value} (${r.count})`,
      };
    });
  }
}

export function filterViewValues(o) {
  const search = path(o, "search", "").trim();
  const attr = o.attribute;
  const idView = o.idView;
  const operator = o.operator || ">=";
  const filterType = o.filterType || "filter";
  const hasNumeric = isNumeric(search);
  const view = getView(idView);
  const map = getMap();
  const idSource = `${idView}-SRC`;
  const filter = ["all"];

  if (search) {
    if (hasNumeric) {
      filter.push([operator, ["get", attr], search * 1]);
    } else {
      const features = map.querySourceFeatures(idSource, {
        sourceLayer: idView,
      });

      const values = {};
      for (const f of features) {
        const value = f.properties[attr];
        const splited = value.split(/\s*,\s*/);
        if (splited.includes(search)) {
          values[value] = true;
        }
      }

      const valuesDistinct = Object.keys(values);

      if (isNotEmpty(valuesDistinct)) {
        filter.push(["in", ["get", attr], ...valuesDistinct]);
      }
    }
  }

  view._setFilter({
    filter: filter,
    type: filterType,
  });
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
    const map = getMap();
    const timeout = 3 * 1000;
    let cancelByTimeout = false;

    if (isViewId(o)) {
      o = {
        idView: o,
      };
    }

    const hasArray = isArray(o.idView);
    o.idView = hasArray ? o.idView[0] : o.idView;
    o.idView = o.idView.split(settings.separators.sublayer)[0];
    const view = getView(o.idView);

    if (!isView(view)) {
      console.warn("zoomToViewId : view object required");
      return;
    }

    const res = await Promise.race([zoom(), waitTimeoutAsync(timeout, cancel)]);

    if (res === "timeout") {
      console.warn(
        `zoomToViewId for ${view.id}, was canceled ( ${timeout} ms )`
      );
    }

    async function zoom() {
      const conf = {
        sum: await getViewSourceSummary(view, { useCache: true }),
      };
      conf.extent = path(conf.sum, "extent_sp", null);

      if (cancelByTimeout) {
        return;
      }

      if (!isBbox(conf.extent)) {
        conf.sum = await getViewSourceSummary(view, { useCache: false });
        conf.extent = path(conf.sum, "extent_sp", null);
        if (cancelByTimeout) {
          return;
        }
        if (!isBbox(conf.extent)) {
          console.warn(`zoomToViewId no extent found for ${view.id}`);
          return;
        }
      }

      const llb = new mx.mapboxgl.LngLatBounds(
        [conf.extent.lng1, conf.extent.lat1],
        [conf.extent.lng2, conf.extent.lat2]
      );

      map.fitBounds(llb);
      return true;
    }

    function cancel() {
      cancelByTimeout = true;
    }
  } catch (e) {
    throw new Error(e);
  }
}

/**
 * Find bounds of a series of views
 * @param {Array} views Array of views
 * @return {Object} MapBox gl bounds object
 */
export async function getViewsBounds(views) {
  views = views.constructor === Array ? views : [views];
  let set = false;
  const def = {
    lat1: 80,
    lat2: -80,
    lng1: 180,
    lng2: -180,
  };

  let summaries = await Promise.all(views.map(getViewSourceSummary));
  let extents = summaries.map((s) => s.extent_sp);

  let extent = extents.reduce(
    (a, ext) => {
      if (ext) {
        set = true;
        a.lat1 = ext.lat1 < a.lat1 ? ext.lat1 : a.lat1;
        a.lat2 = ext.lat2 > a.lat2 ? ext.lat2 : a.lat2;
        a.lng1 = ext.lng1 < a.lng1 ? ext.lng1 : a.lng1;
        a.lng2 = ext.lng2 > a.lng2 ? ext.lng2 : a.lng2;
      }
      return a;
    },
    {
      lat1: 80,
      lat2: -80,
      lng1: 180,
      lng2: -180,
    }
  );

  if (!set) {
    extent = def;
  }

  return [
    [extent.lng1, extent.lat1],
    [extent.lng2, extent.lat2],
  ];

  /*return new mx.mapboxgl.LngLatBounds(*/
  /*[extent.lng1, extent.lat1],*/
  /*[extent.lng2, extent.lat2]*/
  /*);*/
}

/**
 * Fly to view id using rendered features
 * @param {object} o options
 * @param {string} o.id map id
 * @param {string} o.idView view id
 */
export async function zoomToViewIdVisible(o) {
  const bbox = await moduleLoad("turf-bbox");

  let geomTemp, idLayerAll, features;

  geomTemp = {
    type: "FeatureCollection",
    features: [],
  };

  const map = getMap(o.id);

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

  if (geomTemp.features.length > 0) {
    const bbx = bbox(geomTemp);
    const sw = new mx.mapboxgl.LngLat(bbx[0], bbx[1]);
    const ne = new mx.mapboxgl.LngLat(bbx[2], bbx[3]);
    const llb = new mx.mapboxgl.LngLatBounds(sw, ne);
    map.fitBounds(llb);
  } else {
    zoomToViewId(o);
  }
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

  updateLanguageElements({
    el: view._el,
  });
  await viewLayersAdd({
    view: view,
  });
  await viewsLayersOrderUpdate(o);
}

/**
 * Fly to location and zoom
 * @param {object} o options
 * @param {string} o.id map id
 * @param {boolean} o.jump
 * @param {number} o.param Parameters to use
 */
export function flyTo(o) {
  const map = getMap(o.id);

  if (map) {
    const p = o.param;

    if (!o.fromQuery && p.fitToBounds === true && !p.jump) {
      map.fitBounds([p.w || 0, p.s || 0, p.e || 0, p.n || 0]);
    } else {
      const opt = {
        center: [p.lng || 0, p.lat || 0],
        zoom: p.zoom || 0,
        jump: p.jump || false,
        duration: o.duration || 3000,
      };

      if (opt.jump) {
        map.jumpTo(opt);
      } else {
        map.flyTo(opt);
      }
    }
  }
}

/**
 * Set map projection
 * @param {Object} opt options
 * @param {String} opt.id map id
 * @param {String} opt.name
 * @param {Array} opt.center
 * @param {Array} opt.parallels
 */
export function setMapProjection(opt) {
  const map = getMap(opt.id);
  const def = {
    name: "mercator",
    center: [0, 0],
    parallels: [0, 0],
  };
  opt = Object.assign({}, def, opt);
  if (map) {
    map.setProjection(opt.name, {
      center: opt.center,
      parallels: opt.parallels,
    });
  }
}

/**
 * Set theme ( from shiny )
 * @param {Object} opt options
 * @param {String} opt.id Theme id
 */
export function setTheme(opt) {
  if (theme.isValidId(opt.id)) {
    theme.set(opt.id, { save_url: true });
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
    opt
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
 * @return {Object} map
 */
export function getMap(idMap) {
  idMap = idMap || settings.map.id;

  let map;
  const isId = typeof idMap === "string";
  const hasMap = !isId && isMap(idMap);

  if (hasMap) {
    return idMap;
  }

  if (isId && mx.maps[idMap]) {
    map = mx.maps[idMap].map;
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
  const data = mx.maps[idMap || settings.map.id];
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
 * @param {Boolean | String} config.vtHasAttributeType: false,
 * @param {Boolean} config.rtHasLegendLink: false,
 * @param {Boolean} config.isEditable: false,
 * @param {Boolean} config.isLocal: false,
 * @return {Object} A view
 */
const _get_random_view_default = {
  type: ["vt", "rt"],
  rtHasTiles: false,
  vtHasRules: false,
  vtHasAttributeType: false,
  rtHasLegendLink: false,
  hasDashboard: false,
  isEditable: false,
  isDownloadble: false,
  isLocal: false,
};
export function getViewRandom(config) {
  const opt = Object.assign({}, _get_random_view_default, config);
  if (!isArray(opt.type)) {
    opt.type = [opt.type];
  }
  const out = [];
  const views = getViews();

  for (const view of views) {
    const type = view.type;
    const hasType = opt.type.includes(type);

    if (!hasType) {
      continue;
    }

    if (opt.isEditable && !isViewEditable(view)) {
      continue;
    }

    if (opt.isLocal && !isViewLocal(view)) {
      continue;
    }

    if (opt.isDownloadble && !isViewDownloadable(view)) {
      continue;
    }

    if (opt.hasDashboard && !isViewDashboard(view)) {
      continue;
    }

    if (type === "vt") {
      if (opt.vtHasRules && !isViewVtWithRules(view)) {
        continue;
      }
      if (
        opt.vtHasAttributeType &&
        !isViewVtWithAttributeType(view, opt.hasAttributeType)
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
    out.push(view);
  }
  const pos = Math.floor(Math.random() * (out.length - 1));
  return out[pos];
}

/**
 * Test remotely if the source of a vt view is downloadable.
 * @param {String} idView View id
 * @return {Promise<Boolean>} downloadable
 */
export async function isViewVtDownloadableRemote(idView) {
  const view = getView(idView) || (await getViewRemote(idView));
  const idSource = view?.data?.source?.layerInfo?.name;
  return isSourceDownloadable(idSource);
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
  const meta = await fetchSourceMetadata(idSource);
  const isDownloadable = !!meta?._services?.includes("mx_download");
  return isDownloadable;
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
  const ctrls = mx.panel_tools.controls;
  const map = getMap(o.id);
  const bounds = map.getBounds();
  const center = map.getCenter();
  const zoom = map.getZoom();
  const bearing = map.getBearing();
  const pitch = map.getPitch();
  const modeSat = ctrls.getButton("btn_theme_sat").isActive();
  const mode3d = ctrls.getButton("btn_3d_terrain").isActive();
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
  };
  return out;
}

/**
 * Create views array or object with id as key, or single view if idView is provided in options
 * @param {Object | String} o options || id of the map
 * @param {String} o.id map id
 * @param {String|Array} o.idView Optional. Filter view(s) to return. Default = all.
 * @return {Array} array of views
 */
export function getViews(o) {
  o = o || {};
  const d = getMapData(o.id);
  const views = d.views || [];

  if (o.idView) {
    o.idView = isArray(o.idView) ? o.idView : [o.idView];
    return views.filter((v) => o.idView.indexOf(v.id) > -1);
  } else {
    return views;
  }
}
export function getViewsForJSON() {
  const views = getViews();
  const f = [
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

  const viewsClean = views.map((v) => {
    return f.reduce((a, k) => {
      a[k] = v[k];
      return a;
    }, {});
  });
  return viewsClean;
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
  const panels = window._button_panels;
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
  if (panels) {
    for (let panel of panels) {
      if (immersive) {
        panel.hide();
      } else {
        panel.show();
      }
    }
  }
  return immersive;
}

/**
 * Get immersive mode state
 * @return {Boolean} Enabled
 */
export function getImmersiveMode() {
  const panels = window._button_panels;
  let isImmersive = false;
  if (panels) {
    isImmersive = panels.every((p) => !p.isVisible());
  }
  return isImmersive;
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

export async function chaosTest(opt) {
  opt = Object.assign({}, { run: 5, batch: 5, run_timeout: 10 * 1000 }, opt);
  const views = getViews();
  const layersBefore = getLayerNamesByPrefix();
  const viewsBefore = getViewsOpen();

  for (let i = 0; i < opt.run; i++) {
    const tt = [];
    for (let j = 0; j < opt.batch; j++) {
      tt.push(t());
    }
    const promOk = Promise.all(tt);
    const promFail = stopIfTimeout(opt.run_timeout);
    await Promise.race([promOk, promFail]);
    await wait(100);
  }

  return valid();

  /**
   * Helpers
   */
  function valid() {
    /*
     * Check state before adding
     */
    const layersAfter = getLayerNamesByPrefix();
    const viewsAfter = getViewsOpen();

    /**
     * Validation
     */
    const validLN = layersBefore.length === layersAfter.length;
    const validVN = viewsBefore.length === viewsAfter.length;

    if (!validLN || !validVN) {
      return false;
    }

    const hasLayers = layersBefore.reduce(
      (a, c) => a && layersAfter.includes(c),
      true
    );

    const hasViews = viewsBefore.reduce(
      (a, c) => a && viewsAfter.includes(c),
      true
    );

    if (!hasLayers || !hasViews) {
      return false;
    }

    return true;
  }

  async function stopIfTimeout(t) {
    await wait(t);
    throw new Error(`Run Timeout after : + ${t * 1} ms`);
  }

  async function t() {
    const pos = Math.floor(Math.random() * views.length);
    const view = views[pos];
    await viewAdd(view);
    await wait(rt(1000));
    await viewRemove(view);
  }
  function wait(t) {
    return new Promise((r) => setTimeout(r, t || 100));
  }
  function rt(t) {
    return Math.round(Math.random() * t);
  }
}
