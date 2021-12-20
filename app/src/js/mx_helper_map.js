import {RadialProgress} from './radial_progress';
import {handleViewClick} from './views_click';
import {ButtonPanel} from './button_panel';
import {RasterMiniMap} from './raster_mini_map';
import {modalConfirm} from './mx_helper_modal.js';
import {elSpanTranslate} from './el_mapx/index.js';
import {Highlighter} from './features_highlight/';
import {WsHandler} from './ws_handler/';
import {MainPanel} from './panel_main';
import {Search} from './search';
import {MapxLogo, MapControlLiveCoord, MapControlScale} from './map_controls';
import {ControlsPanel} from './panel_controls';
import {MapxDraw} from './draw';
import {NotifCenter} from './notif_center/';
import {cleanDiacritic} from './string_util/';
import chroma from 'chroma-js';
import {mirrorUrlCreate} from './mirror_util';
import {setBusy} from './mx_helper_misc.js';
import {modal, modalGetAll, modalCloseAll} from './mx_helper_modal.js';
import {errorHandler} from './error_handler/index.js';

/**
 * Convert point in  degrees to meter
 * @lngLat {PointLike} lngLat
 * @return {PointLike} reprojected point
 */
export function degreesToMeters(lngLat) {
  const x = (lngLat.lng * 20037508.34) / 180;
  let y =
    Math.log(Math.tan(((90 + lng.lat) * Math.PI) / 360)) / (Math.PI / 180);
  y = (y * 20037508.34) / 180;
  return {
    x: x,
    y: y
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
    lng: lng
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
  opt = Object.assign({}, {idView: null, mode: 'data'}, opt);
  const h = mx.helpers;
  const view = h.getView(opt.idView);

  if (!h.isView(view)) {
    throw new Error(`No view with id ${opt.idView}`);
  }
  const geojson = h.path(view, 'data.source.data');
  let filename = h.path(view, 'data.title.en');
  if (filename.search(/.geojson$/) === -1) {
    filename = `${view.id}.geojson`;
  }
  if (opt.mode === 'file') {
    const download = await h.moduleLoad('downloadjs');
    const data = JSON.stringify(geojson);
    await download(data, filename);
  }
  if (opt.mode === 'data') {
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
  const h = mx.helpers;
  const urlItems = h.path(view, 'data.source.meta.origin.source.urls', []);

  if (urlItems.length === 0) {
    /**
     * Manual support for previous method to store the dl url
     * NOTE: should match the schema
     */
    const legacyUrl = h.path(view, 'data.source.urlDownload');
    if (legacyUrl) {
      urlItems.push({
        url: legacyUrl,
        is_download_link: true,
        label: 'Download'
      });
    }
  }
  const urlItemsClean = urlItems.filter(
    (urlItem) => h.isObject(urlItem) && h.isUrl(urlItem.url)
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
  opt = Object.assign({}, {idView: null, mode: null}, opt);
  const h = mx.helpers;
  const view = h.getView(opt.idView);

  if (!h.isView(view)) {
    throw new Error(`No view with id ${idView}`);
  }

  /*
   * Retrieve urls list
   */

  const urlItemsClean = getDownloadUrlItemsFromViewMeta(view);

  /**
   * Warn if there is an no valid url
   */
  if (h.isEmpty(urlItemsClean)) {
    h.modal({
      title: await h.getDictItem('source_raster_download_error_title'),
      content: await h.getDictItem('source_raster_download_error'),
      addBackground: true
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
  const elContent = h.el(
    'div',
    {
      class: 'list-group'
    },
    urlItemsClean.map((item) => {
      const isDl = item.is_download_link === true;
      const hasLabel = h.isNotEmpty(item.label);
      const elItem = h.el(
        'button',
        {
          on: ['click', dl],
          class: 'list-group-item',
          dataset: {url: item.url}
        },
        h.el(
          'div',
          {
            style: {
              display: 'flex',
              justifyContent: 'space-between'
            }
          },
          h.el('i', {class: ['fa', isDl ? 'fa-download' : 'fa-external-link']}),
          h.el(
            'span',
            {
              style: {
                maxWidth: '80%',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }
            },
            hasLabel ? item.label : item.url
          )
        )
      );
      return elItem;
    })
  );

  const elModal = h.modal({
    title: await h.getDictItem('meta_source_url_download'),
    content: elContent,
    addBackground: true
  });

  return opt;

  function dl(e) {
    /**
     * Open a new windows, let the browser handle the dl or page load
     */

    const url = e.currentTarget.dataset?.url;
    window.open(url, '_blank');
    elModal.close();
  }
}

/**
 * Download source for vector view : show modal panel
 * @param {Object} opt Options
 * @param {String} opt.idView Id of the vector view
 * @return {Object} input options
 */
export async function downloadViewVector(opt) {
  opt = Object.assign({}, {idView: null}, opt);
  const h = mx.helpers;
  const view = h.getView(opt.idView);

  if (!h.isView(view)) {
    throw new Error(`No view with id ${idView}`);
  }

  Shiny.onInputChange(`mx_client_view_action`, {
    target: view.id,
    action: 'btn_opt_download',
    time: new Date()
  });
  return opt;
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
    {n: 101, latRange: [-85, 85], lngRange: [-180, 180]},
    opt
  );

  const features = [];

  for (var i = 0; i < opt.n; i++) {
    features.push(feature());
  }

  return {
    type: 'FeatureCollection',
    features: features
  };

  function feature() {
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Point',
        coordinates: [randomInRange(opt.lngRange), randomInRange(opt.latRange)]
      }
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
  const s = mx.settings;
  return {
    idUser: s.user.id,
    idProject: s.project.id,
    isGuest: s.user.guest,
    token: s.user.token,
    language: s.language
  };
}

/**
 * Get url for service
 * @param {String} id Id of service : api, search .. .
 * @param {String} route Additional route id, if exists in config
 * @return {String} url
 */
export function getServiceUrl(id, route) {
  const s = mx.settings;
  const service = s[id];
  if (location.protocol === 'https:') {
    service.protocol = 'https:';
  }
  const urlBase = `${service.protocol}//${service.host_public}:${
    service.port_public
  }`;
  if (!route) {
    return urlBase;
  }
  return urlBase + (service.routes[route] || route);
}
export function getApiUrl(route) {
  return getServiceUrl('api', route);
}
export function getSearchUrl() {
  return getServiceUrl('search');
}

/**
 * Set mapx API host info when started without server app
 */
const regexDefaultSubDomain = new RegExp(/^(app|dev)\..*\.[a-z]{1,}$/);
export function setApiUrlAuto() {
  const loc = new URL(window.location.href);
  const hasDefaultSubDomain = regexDefaultSubDomain.test(loc.hostname);
  /**
   * Use mx.settings default or,
   * if has default subdomain, webpack variables OR
   * modified url based on standard
   */
  if (hasDefaultSubDomain) {
    /**
     * If no webpack variables found, replace by defaults
     */
    const apiHost =
      typeof API_HOST_PUBLIC === 'undefined'
        ? loc.hostname.replace(/^(app|dev)\./, 'api.')
        : API_HOST_PUBLIC;
    const apiPortPublic =
      typeof API_PORT_PUBLIC === 'undefined' ? loc.port : API_PORT_PUBLIC;

    /**
     * Set API url based on current location
     */
    Object.assign(mx.settings.api, {
      host_public: apiHost,
      protocol: loc.protocol,
      port_public: apiPortPublic
    });
  }
}

/**
 * Get url for path relative to the app
 * @param {String} id Id of the path : sprite, download, etc
 */
export function getAppPathUrl(id) {
  const s = mx.settings;
  const loc = window.location.origin;
  return loc + '/' + s.paths[id];
}

/**
 * Set the project manually
 * @param {String} idProject project to load
 * @param {Object} opt Options
 * @param {Function} opt.onSuccess : Optional callback if project is changed
 * @return null
 */
export async function setProject(idProject, opt) {
  const h = mx.helpers;
  const hasShiny = window.Shiny;
  opt = Object.assign({}, {askConfirmIfModal: true, askConfirm: false}, opt);
  const idCurrentProject = h.path(mx, 'settings.project.id');

  if (idProject === idCurrentProject) {
    return false;
  }
  /**
   * Check if some modal are still there
   */
  const modals = modalGetAll({ignoreSelectors: ['#uiSelectProject']});
  const askConfirm =
    opt.askConfirm || (opt.askConfirmIfModal && modals.length > 0);
  let changeNow = true;

  if (askConfirm) {
    changeNow = await modalConfirm({
      title: elSpanTranslate('modal_check_confirm_project_change_title'),
      content: elSpanTranslate('modal_check_confirm_project_change_txt')
    });
  }
  if (changeNow) {
    await h.viewsCloseAll();
    const res = await change();
    return res;
  }

  /**
   * Change confirmed : remove all views, close modals, send
   * selected project to shiny
   */
  async function change() {
    modalCloseAll();
    h.setQueryParametersInitReset();
    if (hasShiny) {
      Shiny.onInputChange('selectProject', idProject);
    }
    const r = await Promise.all([
      mx.events.once('settings_project_change'),
      mx.events.once('views_list_updated')
    ]);
    const idProjectNew = h.path(r[0], 'new_project');
    if (idProjectNew !== idProject) {
      console.warn('Project did not change', {idProjectNew, idProject});
      return false;
    }
    if (h.isFunction(opt.onSuccess)) {
      opt.onSuccess();
    }
    mx.events.fire({
      type: 'project_change',
      data: {
        new_project: idProject,
        old_project: idCurrentProject
      }
    });
  }
}

/**
 * Wrapper around set project for use with shiny binding
 * @param {Object} opt Options
 * @param {String} opt.idProject id of the project
 */
export function updateProject(opt) {
  return mx.helpers.setProject(opt.idProject, opt);
}

/**
 * Trigger an membership request event in mapx Shiny app
 * @param {String} idProject id of the project
 */
export function requestProjectMembership(idProject) {
  Shiny.onInputChange('requestProjectMembership', {
    id: idProject,
    date: new Date()
  });
}

/**
 * Check if query paramater noViews or modeLocked is set to 'true'
 * In such mode, no view can be added
 */
export function isModeLocked() {
  const h = mx.helpers;
  let modeLocked =
    h.getQueryParameterInit('noViews')[0] === 'true' ||
    h.getQueryParameterInit('modeLocked')[0] === 'true';

  return !!modeLocked;
}

/**
 * Init global listener
 */

export function initListenerGlobal() {
  const h = mx.helpers;
  /**
   * Handle view click
   */
  mx.listeners.addListener({
    target: document.body,
    type: 'click',
    idGroup: 'view_list',
    callback: handleViewClick
  });

  /*
   * Fire session start
   */
  mx.events.fire({
    type: 'session_start'
  });

  /*
   * Fire session end
   */
  mx.listeners.addListener({
    target: window,
    type: 'beforeunload',
    idGroup: 'base',
    callback: () => {
      mx.events.fire({
        type: 'session_end'
      });
    }
  });

  mx.listeners.addListener({
    target: window,
    type: ['error', 'unhandledrejection'],
    idGroup: 'base',
    callback: errorHandler
  });
}

/**
 * Init app listeners
 */
export function initListenersApp() {
  const h = mx.helpers;

  /**
   *  Other listener
   */
  mx.listeners.addListener({
    target: document.getElementById('btnShowProject'),
    type: 'click',
    callback: h.showSelectProject,
    group: 'mapx_base'
  });

  mx.listeners.addListener({
    target: document.getElementById('btnShowLanguage'),
    type: 'click',
    callback: h.showSelectLanguage,
    group: 'mapx_base'
  });

  mx.listeners.addListener({
    target: document.getElementById('btnShowLogin'),
    type: 'click',
    callback: h.showLogin,
    group: 'mapx_base'
  });

  mx.events.on({
    type: 'language_change',
    idGroup: 'view_filter_tag_lang',
    callback: function() {
      const mData = h.getMapData();
      if (mData.viewsFilter) {
        mData.viewsFilter.updateCheckboxesOrder();
      }
    }
  });

  /**
   * When user change, re-init notifications.
   * The message will be cleaared and a  new localforage
   * will be loaded for that user,
   */

  mx.events.on({
    type: ['settings_user_change'],
    idGroup: 'notif',
    callback: (data) => {
      if (data.delta.id) {
        mx.nc.init({
          config: {
            id: data.new_user.id
          }
        });
      }
    }
  });

  mx.events.on({
    type: 'project_change',
    idGroup: 'project_change',
    callback: function() {
      const clActive = 'active';
      const clHide = 'mx-hide';
      const elBtn = document.getElementById('btnFilterShowPanel');
      const isActive = elBtn.classList.contains(clActive);
      const elPanel = document.getElementById('viewsFilterPanel');
      if (isActive) {
        elPanel.classList.add(clHide);
        elBtn.classList.remove(clActive);
      }
    }
  });

  mx.events.on({
    type: ['settings_user_change', 'settings_change'],
    idGroup: 'mapx_base',
    callback: h.updateUiSettings
  });
  h.updateUiSettings();

  mx.events.on({
    type: 'views_list_updated',
    idGroup: 'view_list_updated',
    callback: function() {
      h.getProjectViewsCollectionsShiny({
        idInput: 'viewsListCollections'
      });
    }
  });

  mx.events.on({
    type: ['view_created', 'view_deleted'],
    idGroup: 'clean_history_and_state',
    callback: () => {
      h.updateViewsFilter();
      h.viewsCheckedUpdate();
    }
  });

  mx.events.on({
    type: ['views_list_updated', 'view_added', 'view_removed', 'mapx_ready'],
    idGroup: 'update_btn_filter_view_activated',
    callback: updateBtnFilterActivated
  });

  mx.listeners.addListener({
    target: document.getElementById('btnClearCache'),
    type: 'click',
    callback: h.clearMapxCache,
    group: 'mapx_base'
  });

  mx.listeners.addListener({
    target: document.getElementById('btnShowSearchApiConfig'),
    type: 'click',
    callback: () => {
      if (mx.search) {
        return mx.search.showApiConfig();
      }
    },
    group: 'mapx_base'
  });

  mx.listeners.addListener({
    target: document.getElementById('btnResetPanelSize'),
    type: 'click',
    callback: () => {
      if (window._button_panels) {
        _button_panels.forEach((p) => p.resetSize());
      }
    },
    group: 'mapx_base'
  });

  mx.listeners.addListener({
    target: document.getElementById('btnFilterShowPanel'),
    type: 'click',
    callback: (e) => {
      let elBtn = e.target;
      let clHide = 'mx-hide';
      let clActive = 'active';
      let elPanel = document.getElementById('viewsFilterPanel');
      let isHidden = elPanel.classList.contains(clHide);
      if (isHidden) {
        elPanel.classList.remove(clHide);
        elBtn.classList.add(clActive);
      } else {
        elPanel.classList.add(clHide);
        elBtn.classList.remove(clActive);
      }
    },
    group: 'mapx_base'
  });

  /**
   * Redirect Shiny events
   */
  if (window.Shiny) {
    $(document).on('shiny:connected', () => {
      mx.events.fire('mapx_connected');
    });
    $(document).on('shiny:disconnected', () => {
      mx.events.fire('mapx_disconnected');
    });
  }
}

/**
 * Update element and button text that could not be translated automatically
 * after a settings change
 */
export async function updateUiSettings() {
  const h = mx.helpers;
  const langDef = mx.settings.languages[0];
  const lang = mx.settings.language;
  /**
   * User / login labels
   */
  const elBtnLogin = document.getElementById('btnShowLoginLabel');
  const sUser = h.path(mx, 'settings.user', {});
  const sRole = h.path(mx, 'settings.user.roles', {});

  if (sUser.guest) {
    elBtnLogin.innerText = await h.getDictItem('login_label');
  } else {
    const role = sRole.admin
      ? 'admin'
      : sRole.publisher
      ? 'publisher'
      : sRole.member
      ? 'member'
      : 'public';

    const roleLabel = await h.getDictItem(role);
    elBtnLogin.innerText = `${sUser.email} – ${roleLabel}`;
  }

  /**
   * Project labels
   */
  const elBtnProject = document.getElementById('btnShowProjectLabel');
  const elBtnProjectPrivate = document.getElementById('btnShowProjectPrivate');
  const title = h.path(mx, 'settings.project.title');
  elBtnProject.innerText =
    title[lang] || title[langDef] || mx.settings.project.id;
  if (mx.settings.project.public) {
    elBtnProjectPrivate.classList.remove('fa-lock');
  } else {
    elBtnProjectPrivate.classList.add('fa-lock');
  }

  /**
   * Language
   */
  await h.updateLanguage();
  const elBtnLanguage = document.getElementById('btnShowLanguageLabel');
  elBtnLanguage.innerText = await h.getDictItem(lang);
}

/**
 * Check if there is view activated and disable button if needed
 */
export function updateBtnFilterActivated() {
  const h = mx.helpers;
  const views = h.getViews();
  const elFilterActivated = document.getElementById('btnFilterChecked');
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
    let isVisible = style.display !== 'none';

    return a || (isOpen && isVisible);
  }, false);

  /**
   * Set elFilter disabled class
   */
  const isActivated = elFilterActivated.classList.contains('active');
  if (isActivated || hasViewsActivated) {
    elFilterActivated.classList.remove('disabled');
  } else {
    elFilterActivated.classList.add('disabled');
  }
}
/**
 * Initial mgl and mapboxgl
 * @param {Object} o options
 * @param {String} o.id Id of the map. Default to mx.settings.map.id
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
 * @param {String} o.idTheme  Id of the theme to use
 * @param {Boolean} o.useQueryFilters Use query filters for fetch views
 */
export async function initMapx(o) {
  const h = mx.helpers;
  let mp;
  o = o || {};
  o.id = o.id || mx.settings.map.id;
  mp = o.mapPosition || {};
  /**
   * Set mapbox gl token
   */
  mx.mapboxgl.accessToken = o.token || mx.settings.map.token;

  /**
   * MapX map data : views, config, etc..
   */
  mx.maps[o.id] = Object.assign(
    {
      map: {},
      views: []
    },
    mx.maps[o.id]
  );

  /**
   * Set mode
   */
  if (!o.modeStatic && h.getQueryParameter('storyAutoStart')[0] === 'true') {
    /**
     * Temporary hack : force redirect here. URL rewrite in Traefik does
     * not allow lookaround : it's not possible to have non trivial redirect.
     */
    const url = new URL(window.location);
    url.searchParams.set('storyAutoStart', false);
    url.pathname = '/static.html';
    window.location = url.href;
    return;
  }

  /**
   * Update closed panel setting
   */
  if (h.getQueryParameter('closePanels')[0] === 'true') {
    mx.settings.initClosedPanels = true;
  }

  mx.settings.mode.static = o.modeStatic || mx.settings.mode.storyAutoStart;
  mx.settings.mode.app = !mx.settings.mode.static;

  /**
   * Update  sprites path
   */
  mx.settings.style.sprite = h.getAppPathUrl('sprites');
  mx.settings.style.glyphs = h.getAppPathUrl('fontstack');

  /**
   * Handle socket io session
   */
  mx.ws = new WsHandler({
    url: getApiUrl(),
    auth: getLoginInfo, // evaluated for each connect
    handlers: {
      job_state: async (m) => {
        await mx.nc.notify(m); // wrap avoid double bind
      },
      server_state: () => {},
      error: console.warn
    }
  });
  /**
   * TEst if mapbox gl is supported
   */
  if (!mx.mapboxgl.supported()) {
    alert(
      'This website will not work with your browser. Please upgrade it or use a compatible one.'
    );
    return;
  }

  /*
   * Check url for lat, lng and zoom
   */
  const queryLat = h.getQueryParameter('lat')[0];
  const queryLng = h.getQueryParameter('lng')[0];
  const queryZoom = h.getQueryParameter(['z', 'zoom'])[0];

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

  /* map options */
  const mapOptions = {
    container: o.id, // container id
    style: mx.settings.style, // mx default style
    maxZoom: mx.settings.map.maxZoom,
    minZoom: mx.settings.map.minZoom,
    preserveDrawingBuffer: false,
    attributionControl: false,
    crossSourceCollisions: true,
    zoom: mp.z || mp.zoom || 0,
    bearing: mp.bearing || 0,
    pitch: mp.pitch || 0,
    center: mp.center || [mp.lng || 0, mp.lat || 0]
  };

  /*
   * Create map object
   */
  o.map = new mx.mapboxgl.Map(mapOptions);
  mx.maps[o.id].map = o.map;
  const elCanvas = o.map.getCanvas();
  elCanvas.setAttribute('tabindex', '-1');

  /**
   * Wait for map to be loaded
   */
  await o.map.once('load');

  /**
   * Link theme to map
   */
  mx.theme.linkMap(o.map);

  if (!mx.settings.mode.static) {
    /**
     * Init left panel
     */
    mx.panel_main = new MainPanel({
      mapx: {
        version: h.getVersion()
      },
      panel: {
        id: 'main_panel',
        elContainer: document.body,
        position: 'top-left',
        button_text: h.getDictItem('btn_panel_main'),
        button_lang_key: 'btn_panel_main',
        tooltip_position: 'bottom-right',
        button_classes: ['fa', 'fa-list-ul'],
        container_style: {
          width: '470px',
          height: '90%',
          minWidth: '340px',
          minHeight: '450px'
        }
      }
    });
    if (!mx.settings.initClosedPanels) {
      mx.panel_main.panel.open();
    }

    /**
     * Build theme config inputs only when settings tab is displayed
     */
    mx.panel_main.on('tab_change', (id) => {
      if (id === 'tools') {
        const elInputs = document.getElementById('mxInputThemeColors');
        mx.theme.linkInputs(elInputs);
      }
    });

    /**
     * Configure search tool
     */
    const key = await getSearchApiKey();
    mx.search = new Search({
      key: key,
      container: '#mxTabPanelSearch',
      host: mx.settings.search.host,
      protocol: mx.settings.search.protocol,
      port: mx.settings.search.port,
      language: mx.settings.language,
      index_template: 'views_{{language}}'
    });

    /**
     * On tab change to search, perform a search
     */
    mx.panel_main.on('tab_change', async (id) => {
      if (id === 'search') {
        await mx.search.initCheck();
        mx.search._elInput.focus();
      }
    });

    /**
     * On language change, update
     */
    mx.events.on({
      type: 'language_change',
      idGroup: 'search_index',
      callback: (data) => {
        if (mx.search) {
          mx.search.setLanguage({
            language: data?.new_language
          });
        }
      }
    });

    mx.events.on({
      type: ['view_ui_open', 'view_ui_close', 'view_deleted'],
      idGroup: 'search_index',
      callback: () => {
        mx.search._update_toggles_icons();
      }
    });
  }

  /**
   * Add map controls + left bar toolbox
   */
  mx.panel_tools = new ControlsPanel({
    panel: {
      id: 'controls_panel',
      elContainer: document.body,
      position: 'top-right',
      noHandles: true,
      button_text: h.getDictItem('btn_panel_controls'),
      button_lang_key: 'btn_panel_controls',
      tooltip_position: 'bottom-left',
      handles: ['free'],
      container_classes: ['button-panel--container-no-full-width'],
      item_content_classes: [
        'button-panel--item-content-transparent-background'
      ],
      panel_style: {
        marginTop: '40px'
      },
      container_style: {
        width: '100px',
        height: '340px',
        minWidth: '49px',
        minHeight: '49px'
      }
    }
  });
  if (!mx.settings.initClosedPanels) {
    mx.panel_tools.panel.open();
  }

  /**
   * Add mapx draw handler
   */
  mx.draw = new MapxDraw({
    map: o.map,
    panel_tools: mx.panel_tools,
    url_help: mx.settings.links.repositoryWikiDrawTool
  });
  mx.draw.on('enable', () => {
    mx.helpers.setClickHandler({
      type: 'draw',
      enable: true
    });
  });
  mx.draw.on('disable', () => {
    mx.helpers.setClickHandler({
      type: 'draw',
      enable: false
    });
  });

  /**
   * Add controls
   */
  o.map.addControl(new MapControlLiveCoord(), 'bottom-right');
  o.map.addControl(new MapControlScale(), 'bottom-right');
  o.map.addControl(new MapxLogo(), 'bottom-left');

  /**
   * Notification center
   */
  mx.nc = new NotifCenter({
    config: {
      id: mx.settings.user.id,
      on: {
        add: (nc) => {
          mx.theme.on('mode_changed', nc.setMode);
        },
        remove: (nc) => {
          mx.theme.off('mode_changed', nc.setMode);
        }
      }
    },
    ui: {
      mode: mx.theme.mode
    },
    panel: {
      id: 'notif_center',
      elContainer: document.body,
      container_style: {
        width: '470px', // same as MainPanel
        height: '40%',
        minWidth: '340px',
        minHeight: '100px'
      }
    }
  });

  /**
   * Init global listeners
   */
  h.initLog();
  h.initListenerGlobal();
  h.initMapListener(o.map);
  /**
   * Load mapx app or static
   */
  if (mx.settings.mode.static) {
    await h.initMapxStatic(o);
  } else {
    await h.initMapxApp(o);
  }

  return o;
}

export function initMapListener(map) {
  const h = mx.helpers;

  /**
   * Error handling
   */
  map.on('error', (e) => {
    errorHandler(e);
  });

  /**
   * Click event : build popup, ignore or redirect
   */
  map.on('click', (e) => {
    h.handleClickEvent(e, map.id);
  });

  /**
   * Move north arrow
   */
  map.on('rotate', () => {
    const r = -map.getBearing();
    const northArrow = document.querySelector('.mx-north-arrow');
    northArrow.style[h.cssTransformFun()] = 'rotateZ(' + r + 'deg) ';
  });

  /**
   * Highlight on event
   */
  mx.highlighter = new Highlighter(map, {
    use_animation: true,
    register_listener: false, //use  same click as for popup
    highlight_color: mx.theme.get('mx_map_feature_highlight').color,
    regex_layer_id: /^MX/ // Highlighter will not work with feature without id : regex layer accordingly,
  });

  mx.events.on({
    type: ['view_add', 'view_remove', 'story_step', 'story_close'],
    idGroup: 'highlight_clear',
    callback: (d) => {
      mx.highlighter.clean();
    }
  });

  mx.theme.on('set_colors', (colors) => {
    mx.highlighter.setOptions({
      highlight_color: colors.mx_map_feature_highlight.color
    });
    if (window.jed && jed.aceEditors) {
      jed.aceEditors.forEach((e) => e._set_theme_auto());
    }
  });

  /**
   * Mouse move handling
   */
  map.on('mousemove', (e) => {
    //    if (false) {
    /**
     * Change illuminaion direction accoding to mouse position
     * Quite intensive on GPU.
     */
    //const elCanvas = map.getCanvas();
    //const dpx = window.devicePixelRatio || 1;
    //const wMap = elCanvas.width;
    //const hMap = elCanvas.height;
    //const x = e.point.x - wMap / (2 * dpx);
    //const y = hMap / (2 * dpx) - e.point.y;
    //const deg = h.xyToDegree(x, y);

    //map.setPaintProperty(
    //'hillshading',
    //'hillshade-illumination-direction',
    //deg
    //);
    //}

    const layers = h.getLayerNamesByPrefix({
      id: map.id,
      prefix: 'MX' // custom code could be MXCC ...
    });
    const features = map.queryRenderedFeatures(e.point, {layers: layers});
    map.getCanvas().style.cursor = features.length ? 'pointer' : '';
  });
}

export async function initMapxStatic(o) {
  const h = mx.helpers;
  const map = h.getMap();
  const settings = mx.settings;
  const mapData = h.getMapData();
  const zoomToViews = h.getQueryParameter('zoomToViews')[0] === 'true';
  const language = h.getQueryParameter('language')[0] || settings.languages[0];
  /**
   * NOTE: all views are
   */
  const idViewsQuery = h.getQueryParameter([
    'views',
    'viewsOpen',
    'idViews',
    'idViewsOpen'
  ]);

  const idViews = h.getArrayDistinct(idViewsQuery).reverse();

  /**
   * Update language
   */
  await h.updateLanguage(language);

  /**
   * If no views, send mapx_ready early
   */

  if (idViews.length) {
    /**
     * Get view and set order
     */
    mapData.views = await h.getViewsRemote(idViews);

    /*
     * If a story is found, ignore other options
     */
    const story = mapData.views.find((v) => v.type === 'sm');
    if (story) {
      h.storyRead({
        id: o.id,
        idView: story.id,
        save: false,
        autoStart: true
      });
      return;
    }
  }

  /**
   * Create button panel for legends
   * -> Story module add its own legend panel.
   */
  mx.panel_legend = new ButtonPanel({
    id: 'button_legend',
    elContainer: document.body,
    panelFull: true,
    position: 'top-left',
    tooltip_position: 'right',
    button_text: h.getDictItem('button_legend_button'),
    button_lang_key: 'button_legend_button',
    button_classes: ['fa', 'fa-list-ul'],
    container_style: {
      width: '300px',
      height: '300px',
      minWidth: '200px',
      minHeight: '200px'
    }
  });

  /**
   * If there is view, render all
   */

  if (mapData.views && mapData.views.length) {
    /**
     * Extract all views bounds
     */
    if (zoomToViews) {
      const bounds = await h.getViewsBounds(mapData.views);
      map.fitBounds(bounds);
    }

    /**
     * Display views
     */
    for (const view of mapData.views) {
      await h.viewLayersAdd({
        view: view,
        elLegendContainer: mx.panel_legend.elPanelContent,
        addTitle: true
      });
    }
    await h.viewsLayersOrderUpdate({
      order: idViews.reverse()
    });
  }

  mx.events.fire({
    type: 'mapx_ready'
  });
  return;
}

/**
 * Init full app mode
 */
export async function initMapxApp(opt) {
  const h = mx.helpers;
  const map = opt.map;
  const elMap = map.getContainer();
  const hasShiny = !!window.Shiny;

  /**
   * Init app listeners: view add, language, project change, etc.
   */
  h.initListenersApp();

  /*
   * Fetch views
   */
  await h.updateViewsList({
    useQueryFilters: opt.useQueryFilters
  });

  /**
   * Fire ready event
   */
  mx.events.fire({
    type: 'mapx_ready'
  });

  /*
   * If shiny, trigger read event
   */
  if (hasShiny) {
    Shiny.onInputChange('mx_client_ready', new Date());
  }

  /**
   * Handle drop view or spatial dataset
   */
  if (h.handleMapDragOver && h.handleMapDrop) {
    /**
     * Allow view to be dropped when global drag mode is enabled
     */
    elMap.classList.add('li-keep-enable-drop');

    /**
     * Listen to drag/drop
     */
    mx.listeners.addListener({
      target: elMap,
      type: 'dragover',
      callback: h.handleMapDragOver,
      group: 'map_drag_over',
      bind: mx
    });
    mx.listeners.addListener({
      target: elMap,
      type: 'drop',
      callback: h.handleMapDrop,
      group: 'map_drag_over',
      bind: mx
    });
  }

  /**
   * From now, query parameter should be requested using
   * getQueryParameterInit
   */
  h.cleanTemporaryQueryParameters();
}

/**
 * Handle click event
 * @param {Object} e Mapboxgl event object
 */
export async function handleClickEvent(e, idMap) {
  const type = e.type;
  const h = mx.helpers;
  const hasLayer = h.getLayerNamesByPrefix().length > 0;
  const map = h.getMap(idMap);
  const clickModes = h.getClickHandlers();
  const hasDashboard = clickModes.includes('dashboard');
  const hasDraw = clickModes.includes('draw');
  const hasSdk = clickModes.includes('sdk');
  const hasCC = clickModes.includes('cc');
  const addPopup = !(hasCC || hasSdk || hasDraw || hasDashboard);
  const addHighlight = !hasDraw;

  const retrieveAttributes = addPopup || hasSdk;

  if (!hasLayer && type !== 'click') {
    return;
  }

  if (retrieveAttributes) {
    /*
     * Extract attributes, return an object with idView
     * as key and prmises as value
     */
    const layersAttributes = await h.getLayersPropertiesAtPoint({
      map: map,
      point: e.point,
      type: ['vt', 'gj', 'cc', 'rt'],
      asObject: true
    });
    if (h.isEmpty(layersAttributes)) {
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

      mx.events.once({
        type: [
          'view_remove',
          'view_add',
          'story_step',
          'story_lock',
          'story_close'
        ],
        idGroup: 'click_popup',
        callback: () => {
          popup.remove();
        }
      });

      /**
       * Remove highlighter too
       */
      popup.on('close', () => {
        mx.highlighter.clean();
      });

      /**
       * NOTE: see mx_helper_map_features_popup.js
       */
      h.featuresToPopup({
        layersAttributes: layersAttributes,
        popup: popup
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
    h.onNextFrame(() => {
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
  const h = mx.helpers;
  const isValid = h.isObject(layersAttributes) && h.isObject(e);

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
    mx.events.fire({
      type: 'click_attributes',
      data: {
        part: ++processed,
        nPart: nViews,
        idView: idView,
        attributes: attributes,
        point: e.point,
        lngLat: e.lngLat
      }
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
      time: new Date()
    });
  });
}

/**
 * Geolocate user on click
 * @return null
 */
export function geolocateUser() {
  const h = mx.helpers;
  const lang = mx.settings.language;
  const hasGeolocator = !!navigator.geolocation;

  const o = {idMap: mx.settings.map.id};
  const map = getMap(o.idMap);
  const options = {
    enableHighAccuracy: false,
    timeout: 5000,
    maximumAge: 0
  };

  if (hasGeolocator) {
    setBusy(true);
    navigator.geolocation.getCurrentPosition(success, error, options);
  } else {
    error({message: 'Browser not compatible'});
  }

  function success(pos) {
    setBusy(false);
    const crd = pos.coords;
    map.flyTo({center: [crd.longitude, crd.latitude], zoom: 10});
  }

  function error(err) {
    h.getDictItem(
      ['error_cant_geolocate_msg', 'error_geolocate_issue'],
      lang
    ).then((it) => {
      setBusy(false);
      modal({
        id: 'geolocate_error',
        title: it[1],
        content: '<p> ' + it[0] + '</p> <p> ( ' + err.message + ' ) </p>'
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
  const h = mx.helpers;
  const views = h.getViews();
  /*
   * Close and remove layers
   */
  const removed = views.map((view) => {
    return h.viewRemove(view.id);
  });
  return Promise.all(removed);
}

/**
 * Add source from views array
 * @param {Object} o options
 * @param {Object} o.map Map object
 * @param {Array} o.views Views array
 */
export function addSourceFromViews(o) {
  const h = mx.helpers;
  if (h.isArray(o.views)) {
    o.views.forEach((v) => {
      h.addSourceFromView({
        map: o.map,
        view: v
      });
    });
  }
}

/**
 * Add source from view object
 * @param {Object} o options
 * @param {Object|String} o.map Map object or map id
 * @param {Oject} o.view View object
 * @param {Boolean} o.noLocationCheck Don't check for location matching
 */
export async function addSourceFromView(o) {
  const h = mx.helpers;
  const p = h.path;

  const vType = p(o.view, 'type');
  const isVt = vType === 'vt';
  const isRt = vType === 'rt';
  const isGj = vType === 'gj';
  const validType = isVt || isRt || isGj;
  const hasSource = !!p(o.view, 'data.source');

  if (!validType || !hasSource) {
    return;
  }
  const project = p(mx, 'settings.project.id');
  const projectView = p(o.view, 'project');
  const projectsView = p(o.view, 'data.projects', []);
  const useMirror = p(o.view, 'data.source.useMirror');
  const isEditable = h.isViewEditable(o.view);
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

  const idSource = o.view.id + '-SRC';

  if (isVt) {
    /**
     * When adding source, we request the timestamp via ['base'] stat,
     * without cache to be sure to have the latest value.
     */
    const summary = await h.getViewSourceSummary(o.view, {
      stats: ['base'],
      useCache: false
    });
    const baseUrl = h.getApiUrl('getTile');
    const srcTimestamp = p(summary, 'timestamp', null);
    let url = `${baseUrl}?view=${o.view.id}`;
    if (srcTimestamp) {
      url = `${url}&timestamp=${srcTimestamp}`;
    }
    o.view.data.source.tiles = [url, url];
    o.view.data.source.promoteId = 'gid';
  }

  if (isGj) {
    /**
     * Add gid property if it does not exist
     */
    const features = h.path(o.view, 'data.source.data.features', []);
    let gid = 1;
    features.forEach((f) => {
      if (!f.properties) {
        f.properties = {};
      }
      if (!f.properties.gid) {
        f.properties.gid = gid++;
      }
    });
    o.view.data.source.promoteId = 'gid';
  }

  const sourceExists = !!o.map.getSource(idSource);

  if (sourceExists) {
    /**
     * Handle case when old layers remain in map
     * This could prevent source removal
     */
    h.removeLayersByPrefix({
      prefix: o.view.id,
      map: o.map
    });
    /**
     * Remove old source
     */
    o.map.removeSource(idSource);
  }

  const source = h.clone(o.view.data.source);

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
  const h = mx.helpers;
  const apiUrlViews = mx.helpers.getApiUrl('getView');

  if (!idView || !apiUrlViews) {
    throw new Error('Missing id or fetch URL');
  }

  /* get view, force update */
  const keyNet = `${apiUrlViews}${idView}?date=${Date.now()}`;

  const res = await fetch(keyNet);
  if (res.status !== 200) {
    return null;
  }
  const view = await res.json();

  if (h.isView(view)) {
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
  const h = mx.helpers;
  const views = await Promise.all(idViews.map((id) => getViewRemote(id)));
  return views.reduce((a, v) => {
    if (h.isView(v)) {
      a.push(v);
    }
    return a;
  }, []);
}

/**
 * Save view list to views
 * @param {Object} opt options
 * @param {String} opt.id ID of the map
 * @param {String} opt.project ID of the project
 * @param {Array} opt.viewList views list
 * @param {Boolean} opt.render Render given view
 * @param {Boolean} opt.resetView Reset given view
 * @param {Boolean} opt.useQueryFilters In fetch all mode, use query filters
 */
export async function updateViewsList(opt) {
  const h = mx.helpers;
  const views = [];
  let elProgContainer;
  let nCache = 0,
    nNetwork = 0,
    nTot = 0,
    prog;

  /*
   * See default used:
   * - app/src/r/server/view_update_client.R
   * - app/src/r/helpers/binding_mgl.R
   */
  const def = {
    id: 'map_main',
    project: h.path(mx, 'settings.project.id'),
    viewsList: [],
    render: false,
    resetViews: false,
    useQueryFilters: true
  };
  opt = h.updateIfEmpty(opt, def);

  const viewsToAdd = opt.viewsList;
  const hasViewsList = h.isArrayOfViews(viewsToAdd) && h.isNotEmpty(viewsToAdd);

  if (hasViewsList) {
    nTot = viewsToAdd.length;
  }

  /**
   * Set fetch mode
   */
  if (hasViewsList) {
    views.push(viewsToAdd);
    await addLocal(viewsToAdd);
  } else {
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
    const viewsGeoJSON = await h.getGeoJSONViewsFromStorage({
      project: opt.project
    });
    views.push(...viewsGeoJSON);

    /**
     * Remote views
     */
    const data = await h.fetchViews({
      onProgress: updateProgress,
      project: opt.project,
      useQueryFilters: opt.useQueryFilters
    });
    views.push(...data.views);
    state.push(
      ...data.states.reduce((a, s) => {
        if (s.id === 'default') {
          return s.state;
        } else {
          return a;
        }
      }, state)
    );

    /**
     * Render
     */
    await h.viewsListRenderNew({
      id: opt.id,
      views: views,
      state: state
    });

    /**
     * Add additional logic if query param should be used
     */

    if (opt.useQueryFilters) {
      const conf = h.getQueryInit();
      const viewsList = h.getViewsList();

      /**
       * Set flat mode (hide categories)
       */
      if (conf.isFlatMode) {
        viewsList.setModeFlat(true, {permanent: true});
      }
      const idViewsOpen = conf.idViewsOpen;
      const idViews = conf.idViews;
      const isFilterActivated = conf.isFilterActivated;
      /**
       * Add/open views
       */
      for (const id of idViewsOpen) {
        await h.viewAdd(id);
      }

      /**
       * If any view requested to be open, filter activated
       */
      if (isFilterActivated && idViewsOpen.length > 0) {
        const viewsFilter = h.getViewsFilter();
        viewsFilter.filterActivated(true);
      }

      /**
       * set order
       */
      if (idViews.length) {
        viewsList.sortGroup(null, {
          mode: 'ids',
          asc: true,
          ids: idViews
        });
      }
    }

    mx.events.fire({
      type: 'views_list_updated'
    });

    return views;
  }

  /* Add single view object, typically after an update */
  async function addLocal(view) {
    if (h.isArrayOfViews(view)) {
      view = view[0];
    }
    await h.viewsListAddSingle(view, {
      open: true,
      render: true
    });
    mx.events.fire({
      type: 'views_list_updated'
    });
    mx.events.fire({
      type: 'view_created'
    });
    return view;
  }

  /* Update progress */
  function updateProgress(d) {
    d = d || {
      loaded: nCache + nNetwork,
      total: nTot
    };

    /**
     * Init
     */

    if (!elProgContainer) {
      elProgContainer = document.querySelector('.mx-views-list');
    }

    if (!prog && elProgContainer) {
      h.childRemover(elProgContainer);
      prog = new RadialProgress(elProgContainer, {
        radius: 30,
        stroke: 4,
        strokeColor: '#f00'
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
 * @return {Array} array of views;
 */
export async function getGeoJSONViewsFromStorage(o) {
  const out = [];

  const project = o.project || mx.settings.project.id;
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
  const h = mx.helpers;
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
  vVisible.push(...h.getViewsOpen());
  vToRemove.push(...h.getArrayDiff(vVisible, vChecked));
  vToAdd.push(...h.getArrayDiff(vChecked, vVisible));

  /**
   * View to add
   */
  proms.push(...vToAdd.map(h.viewAdd));

  /**
   * View to remove
   */
  proms.push(...vToRemove.map(h.viewRemove));

  /**
   * Inform Shiny about the state
   */
  if (true) {
    const summary = {
      vVisible: getViewsLayersVisibles(),
      vChecked: vChecked,
      vToRemove: vToRemove,
      vToAdd: vToAdd
    };
    Shiny.onInputChange('mx_client_views_status', summary);
  }

  /**
   * Wait add/remove views operations to be completed
   */
  const done = await Promise.all(proms);

  /**
   * Set layer order
   */
  await h.viewsLayersOrderUpdate(o);
  return done;
}

/**
 * Get id of views with visible layers on map
 * @return {Array}
 */
export function getViewsLayersVisibles() {
  const h = mx.helpers;
  return h.getLayerNamesByPrefix({
    prefix: 'MX-',
    base: true
  });
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

  if (o.action === 'check' && elInput && !elInput.checked) {
    el.checked = true;
  }

  if (o.action === 'uncheck' && elInput && elInput.checked) {
    el.checked = false;
  }
}

/**
 * Get sprite / image data from mapbox imageManager
 * @param {String} id Sprite id
 * @return {Object} Sprite {<height>,<width>,<widthDrp>,<heightDpr>,<url()>}
 */
export function getSpriteImage(id) {
  if (!id) {
    return;
  }
  const map = mx.helpers.getMap();
  const sprite = map.style.imageManager.images[id];
  if (!sprite) {
    console.warn(`Unknown sprite ${id}`);
  }
  const out = {
    widthDpr: sprite.data.width,
    heightDpr: sprite.data.height,
    width: sprite.data.width / sprite.pixelRatio,
    height: sprite.data.height / sprite.pixelRatio
  };

  out.url = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = out.widthDpr;
    canvas.height = out.heightDpr;
    canvas.style.height = `${out.height}px`;
    canvas.style.width = `${out.width}px`;
    const imData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    imData.data.set(sprite.data.data);
    ctx.putImageData(imData, 0, 0);
    return canvas.toDataURL('image/png');
  };

  return out;
}

/**
 * Create a simple layer
 * @param {object} opt Options
 * @param {string} opt.id Id of the layer
 * @param {string} opt.idSuffix Suffix of the layer id
 * @param {number} opt.priority Set inner priority in case of layer group. 0 important, > 0 less important
 * @param {string} opt.idSourceLayer Id of the source layer / id of the view
 * @param {string} opt.idView id of the view
 * @param {string} opt.idAfter Id of the layer after
 * @param {string} opt.idSource Id of the source
 * @param {string} opt.geomType Geometry type (point, line, polygon)
 * @param {Boolean} opt.showSymbolLabel Show symbol with label
 * @param {String} opt.label Label text or expression
 * @param {string} opt.hexColor Hex color. If not provided, random color will be generated
 * @param {array} opt.filter
 * @param {Number} opt.size
 * @param {string} opt.sprite
 * @return {Object} Layer
 */
export function makeSimpleLayer(opt) {
  const h = mx.helpers;

  /**
   * Will be stored as layer.meta
   */

  const def = {
    id: null,
    idSuffix: '',
    priority: 0,
    idSourceLayer: null,
    idView: null,
    idAfter: null,
    geomType: null,
    showSymbolLabel: null,
    label: null,
    hexColor: null,
    filter: ['all'],
    size: null,
    sprite: null,
    // to document
    sizeFactorZoomMax: 0,
    sizeFactorZoomMin: 0,
    sizeFactorZoomExponent: 1,
    zoomMin: 0,
    zoomMax: 22,
    opacity: 0.5
  };

  h.updateIfEmpty(opt, def);

  if (!opt.id) {
    console.warn('makeSimpleLayer: layer with no ID');
    return;
  }

  /**
   * Size / Zoom factor
   */

  if (h.isEmpty(opt.size)) {
    switch (opt.geomType) {
      case 'point':
        opt.size = 10;
        break;
      case 'symbol':
        opt.size = 1;
        break;
      default:
        opt.size = 2;
    }
  }
  if (opt.sprite === 'none') {
    opt.sprite = null;
  }
  if (opt.sprite) {
    const spriteImage = h.getSpriteImage(opt.sprite);
    opt.size = opt.size / spriteImage.width;
  }
  const funSizeByZoom = [
    'interpolate',
    ['exponential', opt.sizeFactorZoomExponent],
    ['zoom'],
    opt.zoomMin,
    opt.sizeFactorZoomMin * opt.size,
    opt.zoomMax,
    opt.sizeFactorZoomMax * opt.size
  ];
  const hasZoomFactor =
    opt.sizeFactorZoomMax !== 0 || opt.sizeFactorZoomMin !== 0;
  opt.size = hasZoomFactor ? funSizeByZoom : opt.size;

  /**
   * Color
   */

  if (!opt.hexColor) {
    opt.hexColor = chroma.random().hex();
  }
  const colA = chroma(opt.hexColor)
    .alpha(opt.opacity)
    .css();
  const colB = chroma(opt.hexColor)
    .alpha(opt.opacity)
    .darken(1)
    .css();

  /**
   * Base layer
   */
  const layer = {
    id: `${opt.id}${opt.idSuffix}`,
    source: opt.idSource,
    minzoom: opt.zoomMin,
    maxzoom: opt.zoomMax,
    filter: opt.filter,
    'source-layer': opt.idSourceLayer,
    metadata: opt
  };

  /**
   * Geom specific
   */
  switch (opt.geomType) {
    case 'symbol':
      Object.assign(layer, {
        type: 'symbol',
        layout: {
          'icon-image': opt.sprite,
          'icon-size': opt.size,
          'icon-allow-overlap': true,
          'icon-ignore-placement': false,
          'icon-optional': true,
          'icon-anchor' : 'bottom',
          'text-field': opt.showSymbolLabel ? opt.label + '' || '' : '',
          'text-variable-anchor': opt.showSymbolLabel
            ? ['bottom-left', 'bottom-right', 'top-right', 'top-left']
            : [],
          'text-font': ['Arial'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 1, 10, 18, 20],
          'text-radial-offset': 1.2,
          'text-justify': 'auto'
        },
        paint: {
          'icon-opacity': opt.opacity || 1,
          'icon-halo-width': 0,
          'icon-halo-color': colB,
          'icon-color': colA,
          'text-color': colA,
          'text-halo-color': '#FFF',
          'text-halo-blur': 0,
          'text-halo-width': 1.2,
          'text-translate': [0, 0]
        }
      });
      break;
    case 'point':
      Object.assign(layer, {
        type: 'circle',
        paint: {
          'circle-color': colA,
          'circle-radius': opt.size / 2
        }
      });
      break;
    case 'polygon':
      Object.assign(layer, {
        type: 'fill',
        paint: {
          'fill-color': colA,
          'fill-outline-color': colB
        }
      });
      break;
    case 'pattern':
      Object.assign(layer, {
        type: 'fill',
        paint: {
          'fill-pattern': opt.sprite,
          'fill-antialias': false
        }
      });
      break;
    case 'line':
      Object.assign(layer, {
        type: 'line',
        paint: {
          'line-color': colA,
          'line-width': opt.size
        },
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        }
      });
      break;
    default:
      throw new Error(`${opt.geomType} not supported`);
  }

  return layer;
}

/**
 * Update layer order based on view list position
 * @param {Object} o Options
 * @param {String} o.id Id of the map
 * @param {Array} o.order Array of layer base name. If empty, use `getViewsOrder`
 * @return {Promise}
 */

export function viewsLayersOrderUpdate(o) {
  const h = mx.helpers;
  o = o || {};
  return new Promise((resolve) => {
    /**
     * Get order list by priority :
     * 1) Given order
     * 2) Order of displayed views (ui, list)
     * 3) Views list
     */
    const map = h.getMap(o.id);
    const views = h.getViews({id: o.id});
    const order =
      o.order || h.getViewsOrder() || views.map((v) => v.id) || null;

    if (!order || order.length === 0) {
      resolve(order);
    }

    /**
     * Get displayed layer
     */
    const layersDiplayed = h.getLayerByPrefix({
      prefix: /^MX-/
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
        (d) => h.path(d, 'metadata.idView', d.id) === idView
      );

      if (layersView.length > 0) {
        sortLayers(layersView);
        for (let layer of layersView) {
          const firstOfAll = incView++ === 0;
          const idBefore = firstOfAll ? mx.settings.layerBefore : idPrevious;
          map.moveLayer(layer.id, idBefore);
          idPrevious = layer.id;
          sorted.push({id: layer.id, idBefore});
        }
      }
    }

    mx.events.fire({
      type: 'layers_ordered',
      data: {
        layers: order
      }
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

function sortLayers(layers, reverse) {
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
  o = o || {id: mx.helpers.getMap()};

  const displayed = mx.helpers.getLayerNamesByPrefix({
    id: o.id,
    prefix: 'MX-',
    base: true
  });

  mx.helpers.setQueryParameters({views: displayed});
}

/**
 * Get the current view order
 * @return {Array} view id array or null
 */
export function getViewsOrder() {
  const res = [];
  const viewContainer = document.querySelector('.mx-views-list');
  if (!viewContainer) {
    return null;
  }
  const els = viewContainer.querySelectorAll('.mx-view-item');
  els.forEach((el) => res.push(el.dataset.view_id));
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
  const h = mx.helpers;
  opt = Object.assign({}, {asString: true}, opt);
  const view = h.getView(idView);
  const keys = [
    'id',
    'editor',
    'target',
    'date_modified',
    'data',
    'type',
    'pid',
    'project',
    'readers',
    'editors',
    '_edit'
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

  const module = await mx.helpers.moduleLoad('nouislider');
  const noUiSlider = module[0].default;
  const oldSlider = view._filters_tools.transparencySlider;
  if (oldSlider) {
    oldSlider.destroy();
  }

  const slider = noUiSlider.create(el, {
    range: {min: 0, max: 100},
    step: 1,
    start: 0,
    tooltips: false
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
    'update',
    mx.helpers.debounce(function(n, h) {
      const view = slider._view;
      const opacity = 1 - n[h] * 0.01;
      view._setOpacity({opacity: opacity});
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
  const h = mx.helpers;

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

  const summary = await h.getViewSourceSummary(view);

  let min = h.path(summary, 'attribute_stat.min', 0);
  let max = h.path(summary, 'attribute_stat.max', min);

  if (view && min !== null && max !== null) {
    if (min === max) {
      min = min - 1;
      max = max + 1;
    }

    const range = {
      min: min,
      max: max
    };
    module = await mx.helpers.moduleLoad('nouislider');
    const noUiSlider = module[0].default;

    const slider = noUiSlider.create(el, {
      range: range,
      step: (min + max) / 1000,
      start: [min, max],
      connect: true,
      behaviour: 'drag',
      tooltips: false
    });

    slider._view = view;
    slider._elMin = el.parentElement.querySelector('.mx-slider-range-min');
    slider._elMax = el.parentElement.querySelector('.mx-slider-range-max');
    slider._elDMax = el.parentElement.querySelector('.mx-slider-dyn-max');
    slider._elDMin = el.parentElement.querySelector('.mx-slider-dyn-min');

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
      'update',
      h.debounce((n) => {
        const view = slider._view;
        const elDMin = slider._elDMin;
        const elDMax = slider._elDMax;
        const k = h.path(view, 'data.attribute.name', '');

        /* Update text values*/
        if (n[0]) {
          elDMin.innerHTML = n[0];
        }
        if (n[1]) {
          elDMax.innerHTML = ' – ' + n[1];
        }

        const filter = [
          'any',
          ['all', ['<=', k, n[1] * 1], ['>=', k, n[0] * 1]],
          ['!has', k]
        ];

        if (h.isArray(view._null_filter)) {
          filter.push(view._null_filter);
        }

        view._setFilter({
          filter: filter,
          type: 'numeric_slider'
        });
      }, 100)
    );
  }
}

/**
 * Create and listen to time sliders
 */
export async function makeTimeSlider(o) {
  const h = mx.helpers;
  const k = {};
  k.t0 = 'mx_t0';
  k.t1 = 'mx_t1';

  const view = o.view;
  const elView = h.getViewEl(view);
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

  const summary = await h.getViewSourceSummary(view);
  const extent = h.path(summary, 'extent_time', {});
  const attributes = h.path(summary, 'attributes', []);

  /*
   * Create a time slider for each time enabled view
   */
  /* from slider to num */
  const fFrom = function(x) {
    return x;
  };
  /* num to slider */
  const fTo = function(x) {
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
        max: max
      };

      start.push(min);
      start.push(max);

      const module = await h.moduleLoad('nouislider');
      const noUiSlider = module[0].default;

      const slider = noUiSlider.create(el, {
        range: range,
        step: 24 * 60 * 60 * 1000,
        start: start,
        connect: true,
        behaviour: 'drag',
        tooltips: false,
        format: {
          to: fTo,
          from: fFrom
        }
      });

      /**
       * Save slider in the view and view ref in target
       */
      slider._view = view;
      slider._elDMin = el.parentElement.querySelector('.mx-slider-dyn-min');
      slider._elDMax = el.parentElement.querySelector('.mx-slider-dyn-max');
      slider._elMin = el.parentElement.querySelector('.mx-slider-range-min');
      slider._elMax = el.parentElement.querySelector('.mx-slider-range-max');

      slider._elMin.innerText = h.date(range.min);
      slider._elMax.innerText = h.date(range.max);

      view._filters_tools.timeSlider = slider;

      slider.on(
        'update',
        h.debounce((t) => {
          const view = slider._view;
          const elDMax = slider._elDMax;
          const elDMin = slider._elDMin;
          /* Update text values*/
          if (t[0]) {
            elDMin.innerHTML = h.date(t[0]);
          }
          if (t[1]) {
            elDMax.innerHTML = ' – ' + h.date(t[1]);
          }

          const filter = ['any'];
          const filterAll = ['all'];
          filter.push(['==', k.t0, -9e10]);
          filter.push(['==', k.t1, -9e10]);

          if (hasT0 && hasT1) {
            filterAll.push(['<=', k.t0, t[1] / 1000]);
            filterAll.push(['>=', k.t1, t[0] / 1000]);
          } else if (hasT0) {
            filterAll.push(['>=', k.t0, t[0] / 1000]);
            filterAll.push(['<=', k.t0, t[1] / 1000]);
          }
          filter.push(filterAll);

          view._setFilter({
            filter: filter,
            type: 'time_slider'
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
  return function(event) {
    let action, el, idView, search, options;
    el = event.target;

    idView = el.dataset.view_action_target;
    action = el.dataset.view_action_key;

    if (!idView || action !== 'view_search_value') {
      return;
    }

    search = event.target.value;

    options = {
      id: o.id,
      idView: idView,
      search: search
    };

    filterViewValues(options);
  };
}

/**
 * Remove view from views list and geojson database
 * @param {Object} view View to remove from the list
 */
export async function viewDelete(view) {
  const h = mx.helpers;
  const mData = h.getMapData();
  const views = h.getViews();
  view = h.getView(view);
  const exists = views.includes(view);
  if (!exists) {
    return;
  }
  const vIndex = views.indexOf(view);
  const geojsonData = mx.data.geojson;

  await h.viewLayersRemove({
    idView: view.id
  });
  mData.viewsList.removeItemById(view.id);

  if (view.type === 'gj') {
    geojsonData.removeItem(view.id);
  }

  views.splice(vIndex, 1);

  mx.events.fire({
    type: 'view_deleted'
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
  const h = mx.helpers;
  const view = o.view || h.getView(o.idView);
  o.id = o.id || mx.settings.map.id;

  if (!h.isView(view)) {
    return false;
  }

  const now = Date.now();
  const viewDuration = now - view._added_at || 0;
  delete view._added_at;

  mx.events.fire({
    type: 'view_remove',
    data: {
      idView: o.idView,
      view: h.getViewJson(view, {asString: false})
    }
  });

  h.removeLayersByPrefix({
    id: o.id,
    prefix: o.idView
  });

  await h.viewModulesRemove(view);

  mx.events.fire({
    type: 'view_removed',
    data: {
      idView: o.idView,
      time: now,
      duration: viewDuration
    }
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
  const h = mx.helpers;
  view = h.getView(view);
  if (!h.isView(view)) {
    return;
  }
  if (view._vb) {
    view._vb.open();
  }
  view._open = true;
  mx.events.fire({
    type: 'view_ui_open',
    data: {
      idView: view.id
    }
  });
  return true;
}

/**
 * Close / uncheck view – if exists – in view list
 * @param {String|View} idView id of the view or view object
 */
async function _viewUiClose(view) {
  const h = mx.helpers;
  view = h.getView(view);
  if (!h.isView(view)) {
    return;
  }
  if (view._vb) {
    view._vb.close();
  }
  view._open = false;
  mx.events.fire({
    type: 'view_ui_close',
    data: {
      idView: view.id
    }
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
    const h = mx.helpers;
    view = h.getView(view);
    if (!h.isView(view)) {
      return;
    }
    /**
     * Open ui before layers :
     * - Layers can take a while
     * - Search list need quickly an
     *   event to trigger toggles
     */
    _viewUiOpen(view);
    await h.viewLayersAdd({
      view: view
    });
    await h.updateLanguageElements({
      el: h.getViewEl(view)
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
    const h = mx.helpers;
    view = h.getView(view);
    if (!h.isView(view)) {
      return;
    }
    _viewUiClose(view);
    await h.viewLayersRemove({
      idView: view.id
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
  const h = mx.helpers;
  const open = [];
  const views = h.getViews();
  for (const view of views) {
    if (h.isViewOpen(view)) {
      open.push(view.id);
    }
  }
  return open;
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
  const h = mx.helpers;
  const m = h.getMap();
  const view = this;
  const idView = view.id;
  const filterView = view._filters;
  const filter = o.filter;
  const type = o.type ? o.type : 'default';
  const layers = h.getLayerByPrefix({prefix: idView});
  const hasFilter = h.isArray(filter) && filter.length > 1;
  const filterNew = [];

  mx.events.fire({
    type: 'view_filter',
    data: {
      idView: idView,
      filter: filter
    }
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
    let filterOrig = h.path(layer, 'metadata.filter', null);
    let filterFinal = [];
    if (!filterOrig) {
      filterFinal.push('all', ...filterNew);
    } else {
      filterFinal.push(...filterOrig, ...filterNew);
    }
    m.setFilter(layer.id, filterFinal);
  }

  mx.events.fire({
    type: 'view_filtered',
    data: {
      idView: idView,
      filter: filterView
    }
  });
}

/**
 * Set this view opacity
 * @param {Object} o Options
 * @param {Array} o.opacity
 */
export function viewSetOpacity(o) {
  o = o || {};
  const h = mx.helpers;
  const view = this;
  const idView = view.id;
  const opacity = o.opacity;
  const idMap = view._idMap ? view._idMap : mx.settings.map.id;
  const map = h.getMap(idMap);
  const layers = h.getLayerByPrefix({
    map: map,
    prefix: idView
  });

  layers.forEach((layer) => {
    const type = layer.type === 'symbol' ? 'icon' : layer.type;
    const property = type + '-opacity';
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
  o.type = o.type ? o.type : 'density';

  if (!data || !data.year || !data.n) {
    return;
  }

  const obj = {
    labels: data.year,
    series: [data.n]
  };

  const options = {
    seriesBarDistance: 100,
    height: '30px',
    showPoint: false,
    showLine: false,
    showArea: true,
    fullWidth: true,
    showLabel: false,
    axisX: {
      showGrid: false,
      showLabel: false,
      offset: 0
    },
    axisY: {
      showGrid: false,
      showLabel: false,
      offset: 0
    },
    chartPadding: 0,
    low: 0
  };

  divPlot = document.createElement('div');
  divPlot.className = 'ct-chart ct-square mx-slider-chart';
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
  o.idLayer = o.idLayer || '';
  const map = mx.helpers.getMap(o.id);
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
  return str.split(mx.settings.separators.sublayer)[0];
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
      nameOnly: false
    },
    o
  );

  const h = mx.helpers;
  const map = o.map || h.getMap(o.id);

  if (!h.isRegExp(o.prefix)) {
    o.prefix = new RegExp('^' + o.prefix);
  }

  const layers = map
    .getStyle()
    .layers.filter((layer) => layer.id.match(o.prefix));

  if (o.nameOnly) {
    const layerNames = layers.map((l) =>
      o.base ? h.getLayerBaseName(l.id) : l.id
    );
    return h.getArrayDistinct(layerNames);
  } else {
    return layers;
  }
}

/**
 * Get layer names by prefix
 */
export function getLayerNamesByPrefix(o) {
  const h = mx.helpers;
  o = Object.assign({}, {nameOnly: true}, o);
  return h.getLayerByPrefix(o);
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
  const map = o.map || mx.helpers.getMap(o.id);

  if (!map) {
    return result;
  }

  const layers = mx.helpers.getLayerNamesByPrefix({
    map: map,
    prefix: o.prefix
  });

  layers.forEach(function(l) {
    if (map.getLayer(l)) {
      map.removeLayer(l);
      result.push(l);
    }
  });
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

  ids.forEach(function(x) {
    let others, m, locked, exists, pos, m2;

    others = [];

    ids.forEach(function(i) {
      if (i !== x) {
        others.push(i);
      }
    });

    locked = false;
    m = maps[x].map;
    exists = maps[x].listener.sync;

    if (enabled) {
      if (!exists) {
        maps[x].listener.sync = function() {
          if (!locked) {
            pos = {
              center: m.getCenter(),
              zoom: m.getZoom(),
              pitch: m.getPitch(),
              bearing: m.getBearing()
            };
            locked = true;
            others.forEach(function(o) {
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

      m.on('move', maps[x].listener.sync);
    } else {
      if (exists) {
        m.off('move', maps[x].listener.sync);
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
          (typeof val === 'object' &&
            JSON.stringify(li[i]) === JSON.stringify(val)))
      ) {
        return true;
      } else if (typeof li[i] === 'object') {
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
          (typeof val === 'object' &&
            JSON.stringify(li[j]) !== JSON.stringify(val)))
      ) {
        return true;
      } else if (typeof li[j] === 'object') {
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
  const h = mx.helpers;
  const dh = h.dashboardHelper;
  const m = h.getMapData(o.id);
  if (o.idView) {
    o.idView = o.idView.split(mx.settings.separators.sublayer)[0];
  }
  if (!o.elLegendContainer && mx.panel_legend) {
    o.elLegendContainer = mx.panel_legend.elPanelContent;
  }
  const isStory = h.isStoryPlaying();
  const idLayerBefore = o.before
    ? h.getLayerNamesByPrefix({prefix: o.before})[0]
    : mx.settings.layerBefore;
  let view = o.view || h.getView(o.idView) || {};

  /**
   * Solve case where view is not set : try to fetch remote
   */
  if (!h.isView(view) && h.isViewId(o.idView)) {
    view = await getViewRemote(o.idView);
  }

  /*
   * Validation
   */
  if (!h.isView(view)) {
    console.warn(
      'viewLayerAdd : view not found, locally or remotely. Options:',
      o
    );
    return;
  }

  const idView = view.id;
  const idMap = o.id || mx.settings.map.id;
  const idType = view.type;

  /**
   * Fire view add event
   */
  mx.events.fire({
    type: 'view_add',
    data: {
      idView: idView,
      view: h.getViewJson(view, {asString: false})
    }
  });

  /*
   * Remove previous layer if needed
   */
  h.removeLayersByPrefix({
    id: idMap,
    prefix: idView
  });

  /*
   * Remove modules if needed
   */
  await viewModulesRemove(view);

  /**
   * Add content
   */
  await h.viewUiContent(view);

  /**
   * Set/Reset filter
   */
  await h.viewFiltersInit(view);

  /**
   * Add source from view
   */
  await h.addSourceFromView({
    map: m.map,
    view: view
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
    dh.autoDestroy();
  }

  /**
   * View aded fully : send event
   */
  view._added_at = Date.now();

  mx.events.fire({
    type: 'view_added',
    data: {
      idView: view.id,
      time: view._added_at
    }
  });

  return true;

  /**
   * handler based on view type
   */
  function handleLayer(viewType) {
    /* Switch on view type*/
    const types = {
      rt: function() {
        return viewLayersAddRt({
          view: view,
          map: m.map,
          before: idLayerBefore,
          elLegendContainer: o.elLegendContainer,
          addTitle: o.addTitle
        });
      },
      cc: function() {
        return viewLayersAddCc({
          view: view,
          map: m.map,
          before: idLayerBefore,
          elLegendContainer: o.elLegendContainer,
          addTitle: o.addTitle
        });
      },
      vt: function() {
        return viewLayersAddVt({
          view: view,
          map: m.map,
          debug: o.debug,
          before: idLayerBefore,
          elLegendContainer: o.elLegendContainer,
          addTitle: o.addTitle
        });
      },
      gj: function() {
        return viewLayersAddGj({
          view: view,
          map: m.map,
          before: idLayerBefore,
          elLegendContainer: o.elLegendContainer,
          addTitle: o.addTitle
        });
      },
      sm: function() {
        return Promise.resolve(true);
      }
    };

    return types[viewType]();
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
export function elLegend(view, opt) {
  const h = mx.helpers;

  if (!h.isView(view)) {
    throw new Error('elLegend invalid view');
  }

  /**
   * Defaults
   */
  opt = Object.assign(
    {},
    {
      removeOld: true,
      type: 'vt',
      addTitle: false,
      elLegendContainer: null
    },
    opt
  );

  const idView = view.id;
  const elView = h.getViewEl(view);
  const hasViewEl = h.isElement(elView);
  const idLegend = `view_legend_${idView}`;
  const hasExternalContainer = h.isElement(opt.elLegendContainer);

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

  const title = h.getLabelFromObjectPath({
    obj: view,
    path: 'data.title',
    defaultValue: '[ missing title ]'
  });

  const elLegendTitle = h.el('div', [
    h.el(
      'div',
      {
        class: ['mx-legend-view-title-container']
      },
      h.el(
        'span',
        {
          class: ['mx-legend-view-title', 'text-muted', 'hint--bottom'],
          'aria-label': `${title}`
        },
        opt.addTitle ? title : ''
      ),
      h.el(
        'span',
        {
          class: 'hint--bottom',
          dataset: {
            view_action_key: 'btn_opt_meta',
            view_action_target: view.id,
            lang_key: 'btn_opt_meta',
            lang_type: 'tooltip'
          }
        },
        h.el('i', {
          class: ['fa', 'fa-info-circle', 'text-muted', 'mx-legend-btn-meta']
        })
      )
    )
  ]);

  /**
   * Legend element
   */
  const elLegend = h.el('div', {
    class: 'mx-view-legend-' + opt.type,
    id: idLegend
  });

  /**
   * Legend group
   */
  const elLegendGroup = h.el(
    'div',
    {
      class: 'mx-view-legend-group'
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
  const h = mx.helpers;
  opt = Object.assign({format: 'image/png'}, opt);
  const view = h.getView(opt.view);
  const isVt = h.isViewVt(view);
  const isRt = !isVt && h.isViewRt(view);
  const isValid = isVt || isRt;
  const isOpen = isValid && h.isViewOpen(view);

  let out = '';
  if (!isValid) {
    return Promise.reject('not valid');
  }

  if (isRt) {
    const legendUrl = h.path(view, 'data.source.legend', null);
    if (!h.isUrl(legendUrl)) {
      return Promise.reject('no legend');
    }
    return h.urlToImageBase64(legendUrl);
  }

  if (isVt) {
    try {
      await h.viewAdd(view);

      const hasLegend = h.isElement(view._elLegend);

      if (!hasLegend) {
        close();
        return Promise.reject('no legend');
      }

      const elRules = view._elLegend.querySelector('.mx-legend-vt-rules');
      const hasRules = h.isElement(elRules);

      if (!hasRules) {
        close();
        return Promise.reject('no legend content');
      }
      const elRulesClone = elRules.cloneNode(true);
      document.body.appendChild(elRulesClone);
      elRulesClone.style.position = 'absolute';
      elRulesClone.style.border = 'none';
      elRulesClone.style.overflow = 'visible';

      const html2canvas = await h.moduleLoad('html2canvas');
      const canvas = await html2canvas(elRulesClone, {
        logging: false
      });
      close();
      elRulesClone.remove();
      out = canvas.toDataURL('image/png');

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
      h.viewRemove(view);
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
  const h = mx.helpers;
  const view = o.view;
  const map = o.map;
  const methods = mx.helpers.path(view, 'data.methods');

  const idView = view.id;
  const idSource = idView + '-SRC';
  const idListener = 'listener_cc_' + view.id;

  let cc;

  const elLegend = h.elLegend(view, {
    type: 'cc',
    elLegendContainer: o.elLegendContainer,
    addTitle: o.addTitle,
    removeOld: true
  });

  try {
    cc = new Function(methods)();
  } catch (e) {
    throw new Error('Failed to parse cc view', e.message);
  }

  if (
    !cc ||
    !(cc.onInit instanceof Function) ||
    !(cc.onClose instanceof Function)
  ) {
    return console.warn('Invalid custom code  view');
  }

  const opt = {
    _init: false,
    _closed: false,
    map: map,
    view: view,
    idView: idView,
    idSource: idSource,
    idLegend: elLegend.id,
    elLegend: elLegend
  };
  opt.onInit = tryCatched(cc.onInit.bind());
  opt.onClose = cc.onClose.bind(opt);

  h.removeLayersByPrefix({
    prefix: opt.idView,
    id: mx.settings.map.id
  });

  /**
   * Avoid event to propagate
   */
  mx.listeners.addListener({
    group: idListener,
    target: elLegend,
    type: ['click', 'mousedown', 'change', 'input'],
    callback: catchEvent
  });

  if (opt.map.getSource(opt.idSource)) {
    opt.map.removeSource(opt.idSource);
  }

  view._onRemoveCustomView = function() {
    mx.listeners.removeListenerByGroup(idListener);

    if (!opt._init || opt._closed) {
      return;
    }
    try {
      opt.onClose(opt);
    } catch (e) {
      console.error(e);
    }
    opt._closed = true;
  };

  /**
   * Init custom map
   */

  opt.onInit(opt);
  opt._init = true;
  /**
   * Helpers
   */
  function catchEvent(e) {
    e.stopPropagation();
  }
  function tryCatched(fun) {
    return function(...args) {
      try {
        return fun(...args);
      } catch (e) {
        opt.onClose(opt);
        console.error(e);
      }
    };
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
  const h = mx.helpers;
  const idView = view.id;
  const idSource = idView + '-SRC';
  const legendB64Default = require('../../src/svg/no_legend.svg');
  const legendUrl = h.path(view, 'data.source.legend', null);
  const tiles = h.path(view, 'data.source.tiles', null);
  const useMirror = h.path(view, 'data.source.useMirror', false);
  const hasTiles =
    h.isArray(tiles) && tiles.length > 0 && h.isArrayOf(tiles, h.isUrl);
  const legendTitle = h.getLabelFromObjectPath({
    obj: view,
    path: 'data.source.legendTitles',
    defaultValue: null
  });
  const hasLegendUrl = h.isUrl(legendUrl);
  const elLegendImageBox = h.el('div', {class: 'mx-legend-box'});
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
      type: 'raster',
      source: idSource,
      metadata: {
        idView: idView,
        priority: 0,
        position: 0
      }
    },
    o.before
  );

  /**
   * LEGENDS
   */

  /* Legend element */
  const elLegend = h.elLegend(view, {
    type: 'rt',
    elLegendContainer: o.elLegendContainer,
    addTitle: o.addTitle,
    removeOld: true
  });

  if (!h.isElement(elLegend)) {
    return false;
  }

  /* Legend title  */
  if (legendTitle) {
    const elLabel = h.el(
      'span',
      {
        class: ['mx-legend-rt-title', 'text-muted']
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
    view._miniMap = new RasterMiniMap({
      elContainer: elLegendImageBox,
      width: 40,
      height: 40,
      mapSync: map,
      tiles: tilesCopy
    });
    /* Raster MiniMap added, here */
    return true;
  }

  const legendUrlFetch = useMirror ? mirrorUrlCreate(legendUrl) : legendUrl;

  /* Get a base64 image from url */
  legendB64 = await h.urlToImageBase64(legendUrlFetch);

  /* If empty data or length < 'data:image/png;base64,' length */
  if (!h.isBase64img(legendB64)) {
    legendB64 = legendB64Default;
    isLegendDefault = true;
  }

  if (isLegendDefault) {
    /* Add tooltip 'missing legend' */
    elLegend.classList.add('hint--bottom');
    elLegend.dataset.lang_key = 'noLegend';
    elLegend.dataset.lang_type = 'tooltip';
    h.updateLanguageElements({
      el: o.elLegendContainer
    });
  } else {
    /* Indicate that image can be zoomed */
    elLegend.style.cursor = 'zoom-in';
  }
  /* Create an image with given source */
  const img = h.el('img', {alt: 'Legend'});
  img.alt = 'Legend';
  img.addEventListener('error', handleImgError);
  img.addEventListener('load', handleLoad, {once: true});
  if (!isLegendDefault) {
    img.addEventListener('click', handleClick);
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
      h.getLabelFromObjectPath({
        obj: view,
        path: 'data.title',
        defaultValue: '[ missing title ]'
      });

    const imgModal = h.el('img', {
      src: img.src,
      alt: 'Legend',
      onerror: handleImgError
    });

    /* Add in modal */
    modal({
      title: title,
      id: 'legend-raster-' + view.id,
      content: imgModal,
      addBackground: false
    });
  }

  /*  Add image to image box */
  function handleLoad() {
    elLegendImageBox.appendChild(img);
  }
  /* error callback */
  function handleImgError() {
    this.onerror = null;
    this.src = legendB64Default;
  }
}

/**
 * Parse view of type vt and add it to the map
 * @param {Object} o Options
 * @param {Object} o.view View data
 * @param {Object} o.map Map object
 * @param {Element} o.elLegendContainer Legend container
 * @param {Boolean} o.addTitle Add title to the legend
 * @param {String} o.before Name of an existing layer to insert the new layer(s) before.
 */
export async function viewLayersAddVt(o) {
  const h = mx.helpers;
  const p = h.path;

  const view = o.view;
  const idView = view.id;
  const viewData = p(view, 'data');
  const attr = p(viewData, 'attribute.name', null);
  const idSource = view.id + '-SRC';
  const style = p(viewData, 'style', {});
  const zConfig = p(style, 'zoomConfig', {});
  const showSymbolLabel = p(style, 'showSymbolLabel', false);
  const includeUpper = p(style, 'includeUpperBoundInInterval', false);
  const hideNulls = p(style, 'hideNulls', false);
  const ruleNulls = p(style, 'nulls', [])[0] || {};
  const geomType = p(viewData, 'geometry.type', 'point');
  const source = p(viewData, 'source', {});
  const idSourceLayer = p(source, 'layerInfo.name');
  let idInc = 0; // increment layer id last part

  /**
   * No layer id = stop;
   */

  if (!idSourceLayer) {
    return false;
  }

  /**
   * Init null value
   */
  let nullValue = '';
  if (ruleNulls.value) {
    nullValue = ruleNulls.value;
  }

  /**
   * Source stat
   */
  const sourceSummary = await h.getViewSourceSummary(view, {
    nullValue: nullValue,
    idAttr: attr,
    stats: ['attributes']
  });

  const statType = h.path(sourceSummary, 'attribute_stat.type', 'categorical');
  const isNumeric = statType === 'continuous';
  const rules = h.clone(p(style, 'rules', []));
  const nRules = rules.length;
  const layers = [];
  const styleCustom = JSON.parse(p(style, 'custom.json'));
  const sepLayer = p(mx, 'settings.separators.sublayer');

  /**
   * Updte filterNull ( after type is determined )
   */
  const filterIncludeNull = [];
  const filterExcludeNull = [];
  for (const op of ['==', '!=']) {
    const f = op === '==' ? filterIncludeNull : filterExcludeNull;
    if (isNumeric) {
      if (h.isEmpty(nullValue)) {
        f.push([op, attr, '']);
      } else {
        f.push([op, attr, nullValue * 1]);
      }
    } else {
      if (nullValue || nullValue === false) {
        f.push([op, attr, nullValue]);
      } else {
        f.push([op, attr, '']);
      }
    }
  }

  /**
   * Set zoom default
   */
  const zDef = {
    zoomMax: 22,
    zoomMin: 0,
    sizeFactorZoomMax: 0,
    sizeFactorZoomMin: 0,
    sizeFactorZoomExponent: 1
  };
  const zoomConfig = Object.assign(zDef, zConfig);

  /**
   * Clean rules
   */
  if (isNumeric && nullValue !== '' && isFinite(nullValue)) {
    // NOTE: ''*1 -> 0...
    nullValue = nullValue * 1;
  }

  let rInc = nRules;
  while (rInc-- > 0) {
    const rule = rules[rInc];

    /**
     * Check if it's a valid rule : it should be an object with
     * at least a non-empty rule.value
     */
    let isValid = h.isObject(rule) && !h.isEmpty(rule.value);

    if (!isValid) {
      rules.splice(rInc, 1);
    }
  }

  /**
   * Set default numeric min / max
   */
  const rulesValues = {};

  if (isNumeric) {
    rulesValues.min = p(sourceSummary, 'attribute_stat.min', -Infinity);
    rulesValues.max = p(sourceSummary, 'attribute_stat.max', Infinity);
  }

  for (const rule of rules) {
    rule.rgba = h.colorToRgba(rule.color, rule.opacity);
    rule.rgb = h.colorToRgba(rule.color);
  }

  /**
   * Check rules
   */
  const ruleAll = rules.find((r) => r.value === 'all');
  const hasRuleAll = !!ruleAll;
  //const hasStyleRules = rules.length > 0 && rules[0].value !== undefined;
  const hasStyleRules = nRules > 0; // && rules[0].value !== undefined;

  /**
   * Set style type
   */
  const useStyleCustom = h.isObject(styleCustom) && styleCustom.enable === true;
  const useStyleDefault = !useStyleCustom && !hasStyleRules;
  const useStyleNull = !useStyleDefault && !hideNulls;
  const useStyleAll = !useStyleCustom && !useStyleDefault && hasRuleAll;
  const useStyleFull = !useStyleCustom && !useStyleAll && hasStyleRules;

  if (
    !useStyleCustom &&
    !useStyleDefault &&
    !useStyleAll &&
    !useStyleFull &&
    !useStyleNull
  ) {
    return;
  }

  /**
   * Make custom layer
   */
  if (useStyleCustom) {
    const layerCustom = {
      id: `${idView}${sepLayer}${0}__custom`,
      source: idSource,
      'source-layer': idView,
      type: styleCustom.type || 'circle',
      paint: styleCustom.paint || {},
      layout: styleCustom.layout || {},
      minzoom: styleCustom.minzoom || zoomConfig.zoomMin,
      maxzoom: styleCustom.maxzoom || zoomConfig.zoomMax,
      metadata: {
        position: 0,
        priority: 0,
        idView: idView,
        filter: []
      }
    };
    layers.push(layerCustom);
    view._setFilter({
      filter: styleCustom.filter || ['all'],
      type: 'custom_style'
    });
  }

  /*
   * Apply default style is no style is defined
   */
  if (useStyleDefault) {
    const layerDefault = _build_layer({
      geomType: geomType
    });
    layers.push(layerDefault);
    const ruleDefault = {
      label_en: 'Default',
      value: 'all',
      color: layerDefault?.metadata?.hexColor,
      size: layerDefault?.metadata?.size
    };
    rules.push(ruleDefault);
  }

  /**
   * Create layer for single rule covering all values
   */
  if (useStyleAll) {
    const hasSprite = ruleAll.sprite && ruleAll.sprite !== 'none';
    const hasSymbol = hasSprite && geomType === 'point';
    const hasPattern = hasSprite && geomType === 'polygon';
    const filter = ['all'];
    filter.push(...filterExcludeNull);
    if (!hasSymbol) {
      /**
       * Base layer and pattern
       */
      const layerAll = _build_layer({
        geomType: geomType,
        priority: 1,
        hexColor: ruleAll.color,
        sprite: ruleAll.sprite,
        opacity: ruleAll.opacity,
        size: ruleAll.size,
        filter: filter
      });

      layers.push(layerAll);

      if (hasPattern) {
        const layerPattern = _build_layer({
          priority: 0,
          geomType: 'pattern',
          hexColor: ruleAll.color,
          sprite: ruleAll.sprite,
          opacity: ruleAll.opacity,
          size: ruleAll.size,
          filter: filter
        });
        layers.push(layerPattern);
      }
    } else {
      /**
       * Symbol only
       */
      const label = h.getLabelFromObjectPath({
        obj: ruleAll,
        sep: '_',
        path: 'label',
        defaultValue: ruleAll.value
      });

      const layerSprite = _build_layer({
        geomType: 'symbol',
        label: label,
        hexColor: ruleAll.color,
        sprite: ruleAll.sprite,
        opacity: ruleAll.opacity,
        size: ruleAll.size,
        filter: filter
      });

      layers.push(layerSprite);
    }
  }

  /*
   * Apply style if avaialble
   */
  if (useStyleFull) {
    /**
     * evaluate rules
     */
    rules.forEach((rule, i) => {
      const filter = ['all'];
      /*
       * Set logic for rules
       */
      const nRules = rules.length - 1;
      const position = style.reverseLayer ? nRules - i : i;
      const isLast = i === nRules;
      const isFirst = i === 0;

      const nextRule = rules[i + 1];
      /**
       * If no value_to, use next value, or use max, or null (non numeric)
       */
      const nextValue = p(nextRule, 'value', rulesValues.max);
      rule.value_to = p(rule, 'value_to', nextValue);

      const fromValue = rule.value;
      const toValue = isNumeric ? rule.value_to : null;
      const sameFromTo = isNumeric && toValue === fromValue;
      /**
       *  Symbols and pattern check
       */
      const hasSprite = rule.sprite && rule.sprite !== 'none';
      const hasSymbol = hasSprite && geomType === 'point';
      const hasPattern = hasSprite && geomType === 'polygon';

      if (isNumeric && !sameFromTo) {
        /**
         * Case where attr to filter is numeric
         */
        const fromOp = isFirst ? '>=' : includeUpper ? '>' : '>=';
        const toOp = isLast ? '<=' : includeUpper ? '<=' : '<';
        filter.push([fromOp, attr, fromValue]);
        filter.push([toOp, attr, toValue]);
      } else {
        /**
         * String and boolean
         */
        filter.push(['==', attr, fromValue]);
      }

      filter.push(...filterExcludeNull);

      rule.filter = filter;

      if (!hasSymbol) {
        /**
         * Normal layer and pattern
         */
        const layerMain = _build_layer({
          position: position,
          priority: 1,
          geomType: geomType,
          hexColor: rule.color,
          opacity: rule.opacity,
          size: rule.size,
          sprite: rule.sprite,
          filter: filter
        });
        layers.push(layerMain);

        if (hasPattern) {
          const layerPattern = _build_layer({
            position: position,
            priority: 0,
            geomType: 'pattern',
            hexColor: rule.color,
            opacity: rule.opacity,
            sprite: rule.sprite,
            filter: filter
          });
          layers.push(layerPattern);
        }
      } else {
        /**
         * Layer for symbols
         */
        const label = h.getLabelFromObjectPath({
          obj: rule,
          sep: '_',
          path: 'label',
          defaultValue: rule.value
        });

        const layerSprite = _build_layer({
          position: position,
          geomType: 'symbol',
          label: label,
          hexColor: rule.color,
          opacity: rule.opacity,
          size: rule.size,
          sprite: rule.sprite,
          filter: filter
        });

        layers.push(layerSprite);
      }
    });
  }

  /**
   * Handle layers order based on position
   */
  sortLayers(layers);
  console.log(layers);

  /**
   * Handle layer for null values
   */
  if (useStyleNull) {
    const filter = ['all'];

    filter.push(...filterIncludeNull);

    h.updateIfEmpty(ruleNulls, {
      color: '#A9A9A9',
      size: 2,
      label_en: await h.getDictItem('schema_style_nulls')
    });

    const hasSprite = ruleNulls.sprite && ruleNulls.sprite !== 'none';
    const layerNull = _build_layer({
      idSuffix: '_null',
      priority: 1,
      geomType: geomType === 'point' && hasSprite ? 'symbol' : geomType,
      hexColor: ruleNulls.color,
      opacity: ruleNulls.opacity,
      size: ruleNulls.size,
      sprite: hasSprite ? ruleNulls.sprite : null,
      filter: filter
    });
    ruleNulls.filter = filter;
    view._null_filter = filter;
    layers.push(layerNull);
  }

  /**
   * Add layer and legends
   */
  if (layers.length > 0) {
    /**
     * Clean rules;
     * - If next rules is identical, remove it from legend
     * - Set sprite path
     */
    const rulesLegend = h.clone(rules);
    if (useStyleNull) {
      rulesLegend.push(ruleNulls);
    }

    let pos = 0;
    const idRulesToRemove = [];
    for (const rule of rulesLegend) {
      const ruleNext = rulesLegend[++pos];
      const hasSprite = rule.sprite && rule.sprite !== 'none';
      const nextHasSprite =
        !!ruleNext && ruleNext.sprite && ruleNext.sprite !== 'none';

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
      rulesLegend.splice(rulePos, 1);
    }
    /*
     * Add legend using template
     */
    view._rulesLegend = rulesLegend;
    const elLegend = h.elLegend(view, {
      type: 'vt',
      removeOld: true,
      elLegendContainer: o.elLegendContainer,
      addTitle: o.addTitle
    });
    if (h.isElement(elLegend)) {
      /**
       * viewLayersAddVt rendering time [ms] with:
       * el + ecoregion2017
       * 606
       * 534
       * 504
       * 403
       *
       * dot + ecoregion2017
       * 517
       * 725
       * 928
       * 660
       */
      // el
      const elLegendContent = mx.helpers.buildLegendVt(view);
      elLegend.appendChild(elLegendContent);
      // dot
      //elLegend.innerHTML = mx.templates.viewListLegend(view);
    }

    /*
     * Add layers to map
     */

    await addLayers(layers, o.before);
    await viewsLayersOrderUpdate();

    return true;
  } else {
    return false;
  }

  function _build_layer(opt) {
    const config = Object.assign(
      {},
      {
        id: null,
        idSource: idSource,
        idSourceLayer: idView,
        idView: idView,
        idSuffix: '',
        position: 0,
        priority: 0,
        showSymbolLabel: showSymbolLabel,
        sizeFactorZoomExponent: zoomConfig.sizeFactorZoomExponent,
        sizeFactorZoomMax: zoomConfig.sizeFactorZoomMax,
        sizeFactorZoomMin: zoomConfig.sizeFactorZoomMin,
        zoomMax: zoomConfig.zoomMax,
        zoomMin: zoomConfig.zoomMin
      },
      opt
    );

    if (!config.id) {
      config.id = `${idView}${sepLayer}${config.position}_${
        config.priority
      }_${idInc++}`;
    }

    return makeSimpleLayer(config);
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
    const h = mx.helpers;
    const map = h.getMap();
    /**
     * Add bottom layers now
     */
    for (let layer of layers) {
      const hasLayer = map.getLayer(layer.id);
      const hasLayerBefore = map.getLayer(idBefore);

      if (hasLayer) {
        map.removeLayer(layer.id);
      }
      if (!hasLayerBefore) {
        idBefore = mx.settings.layerBefore;
      }

      map.addLayer(layer, idBefore);
    }

    resolve(true);
  });
}

/**
 * Add filtering system to views
 * @param {String|Object} idView id or View to update
 */
export function viewFiltersInit(idView) {
  const h = mx.helpers;
  const view = h.getView(idView);
  if (!h.isView(view)) {
    return;
  }
  /**
   * Add methods
   */
  view._filters = {
    style: ['all'],
    legend: ['all'],
    time_slider: ['all'],
    search_box: ['all'],
    numeric_slider: ['all'],
    custom_style: ['all']
  };
  view._setFilter = h.viewSetFilter;
  view._setOpacity = h.viewSetOpacity;
}

export async function viewUiContent(id) {
  const h = mx.helpers;
  const view = h.getView(id);
  if (!h.isView(view)) {
    return;
  }

  const elView = h.getViewEl(view);
  const hasViewEl = h.isElement(elView);

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
  opt = Object.assign({}, {clear: false}, opt);
  const h = mx.helpers;
  try {
    const view = h.getView(id);
    if (!h.isView(view)) {
      return;
    }
    const idView = view.id;
    const idMap = mx.settings.map.id;
    if (view._filters_tools) {
      return;
    }
    view._filters_tools = {};
    const proms = [];
    /**
     * Add interactive module
     */
    proms.push(h.makeTimeSlider({view: view, idMap: idMap}));
    proms.push(h.makeNumericSlider({view: view, idMap: idMap}));
    proms.push(h.makeTransparencySlider({view: view, idMap: idMap}));
    proms.push(h.makeSearchBox({view: view, idMap: idMap}));
    await Promise.all(proms);
  } catch (e) {
    throw new Error(e);
  }
}

/**
 * Clean stored modules : dashboard, custom view, etc.
 */
export async function viewModulesRemove(view) {
  const h = mx.helpers;
  const dh = h.dashboardHelper;

  view = h.isViewId(view) ? h.getView(view) : view;

  if (!h.isView(view)) {
    return false;
  }

  const it = view._filters_tools || {};
  delete view._filters_tools;

  if (h.isFunction(view._onRemoveCustomView)) {
    view._onRemoveCustomView();
  }

  if (h.isElement(view._elLegend)) {
    view._elLegend.remove();
    delete view._elLegend;
  }

  if (dh.viewHasWidget(view)) {
    dh.viewRmWidgets(view);
    dh.autoDestroy();
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
  const h = mx.helpers;
  views = views instanceof Array ? views : [views];

  return Promise.all(views.map((v) => h.viewModulesRemove(v)));
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
  const h = mx.helpers;
  return new Promise((resolve) => {
    const layer = h.path(opt.view, 'data.layer');

    if (!layer.metadata) {
      layer.metadata = {
        priority: 0,
        position: 0,
        idView: opt.view.id,
        filter: []
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
  const h = mx.helpers;
  const m = h.getMap(o.id);
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
  const h = mx.helpers;
  const countries = o.countries || null;
  const m = h.getMap(o.id);
  const hasCountries = h.isArray(countries) && countries.length > 0;
  const hasWorld = hasCountries && countries.indexOf('WLD') > -1;
  let filter = [];
  let rule = ['==', 'iso3code', ''];
  mx.settings.highlightedCountries = hasCountries ? countries : [];

  if (hasCountries && !hasWorld) {
    rule = ['!in', 'iso3code'].concat(countries);
  }

  filter = ['any', rule, ['!has', 'iso3code']];

  m.setFilter(o.idLayer, filter);
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
  const map = mx.helpers.getMap(o.id);

  if (map) {
    const calcAreaWorker = require('./mx_helper_calc_area.worker.js');
    const layers = mx.helpers.getLayerNamesByPrefix({
      id: o.id,
      prefix: o.prefix
    });

    if (layers.length > 0) {
      const features = map.queryRenderedFeatures({layers: layers});

      const geomTemp = {
        type: 'FeatureCollection',
        features: []
      };

      features.forEach(function(f) {
        geomTemp.features.push({
          type: 'Feature',
          properties: {},
          geometry: f.geometry
        });
      });

      const data = {
        geojson: geomTemp,
        bbox: getBoundsArray(o)
      };

      const worker = new calcAreaWorker();
      worker.postMessage(data);
      mx.listeners.addListener({
        group: 'compute_layer_area',
        target: worker,
        type: 'message',
        callback: function(e) {
          if (e.data.message) {
            o.onMessage(e.data.message);
          }
          if (e.data.end) {
            o.onEnd(e.data.end);
            mx.listeners.removeListenerByGroup('compute_layer_area');
          }
        }
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
      onMessage: function(msg) {
        el.innerHTML = msg;
      },
      onEnd: function(msg) {
        el.innerHTML = '~ ' + msg + ' km2';
      }
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
  const h = mx.helpers;
  const map = h.getMap(o);
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
  const h = mx.helpers;
  const map = h.getMap(opt.map);
  const hasViewId = h.isString(opt.idView);
  const modeObject = opt.asObject === true || false;
  const items = {};
  const excludeProp = ['mx_t0', 'mx_t1', 'gid'];
  let idViews = [];
  let type = opt.type || 'vt' || 'rt' || 'gj';
  type = h.isArray(type) ? type : [type];
  /**
   * Use id from idView as array OR get all mapx displayed base layer
   * to get array of view ID.
   */
  idViews = hasViewId
    ? [opt.idView]
    : h.getLayerNamesByPrefix({
        base: true
      });

  if (idViews.length === 0) {
    return items;
  }

  /**
   * Fetch view data for one or many views
   * and fetch properties
   */
  idViews
    .map((idView) => h.getView(idView))
    .filter((view) => type.includes(view?.type))
    .forEach((view) => {
      if (!h.isView(view)) {
        console.warn('Not a view:', view, ' opt:', opt);
        return;
      }
      if (view.type === 'rt') {
        items[view.id] = fetchRasterProp(view);
      } else {
        items[view.id] = fetchVectorProp(view);
      }
    });

  return items;

  /**
   * Fetch properties on raster WMS layer
   */
  function fetchRasterProp(view) {
    const url = h.path(view, 'data.source.tiles', [])[0].split('?');
    const useMirror = h.path(view, 'data.source.useMirror', false);
    const endpoint = url[0];
    const urlFull = `${endpoint}?${url[1]}`;
    const params = h.getQueryParametersAsObject(urlFull, {lowerCase: true});
    const out = modeObject ? {} : [];
    /**
     * Check if this is a WMS valid param object
     */
    const isWms = h.isUrlValidWms(urlFull, {layers: true, styles: true});

    if (isWms) {
      return h.wmsQuery({
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
            timestamp: h.path(view, 'date_modified', null)
          }
        }
      });
    } else {
      return Promise.resolve(out);
    }
  }

  /**
   * Fetch properties on vector layer
   */
  function fetchVectorProp(view) {
    return new Promise((resolve) => {
      const id = view.id;

      const layers = h.getLayerNamesByPrefix({
        map: map,
        prefix: id
      });

      const features = map.queryRenderedFeatures(opt.point, {
        layers: layers
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
              out[p] = h.getArrayStat({
                stat: 'distinct',
                arr: values
              });
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
  const h = mx.helpers;
  const view = o.view;
  const el = document.querySelector(`[data-search_box_for='${view.id}']`);
  if (!el) {
    return;
  }
  const elViewParent = h.getViewEl(view).parentElement;

  const s = await h.moduleLoad('selectize');

  const attr = h.path(view, 'data.attribute.name');

  const summary = await h.getViewSourceSummary(view);
  const choices = summaryToChoices(summary);

  const searchBox = $(el)
    .selectize({
      dropdownParent: elViewParent,
      placeholder: 'Search',
      choices: choices,
      valueField: 'value',
      labelField: 'label',
      searchField: ['label'],
      options: choices,
      onChange: selectOnChange
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
    const filter = ['any'];
    listObj.forEach(function(x) {
      filter.push(['==', attr, x]);
    });
    view._setFilter({
      filter: filter,
      type: 'search_box'
    });
  }

  function summaryToChoices(summary) {
    const table = h.path(summary, 'attribute_stat.table', []);
    return table.map((r) => {
      return {
        value: r.value,
        label: `${r.value} (${r.count})`
      };
    });
  }
}

export function filterViewValues(o) {
  let attr, idMap, idView, search;
  let view, map, features, values, filter;
  let isNumeric;

  attr = o.attribute;
  idMap = o.id;
  idView = o.idView;
  search = o.search;
  operator = o.operator || '>=';
  filterType = o.filterType || 'filter';

  search = search.trim();
  isNumeric = mx.helpers.isNumeric(search);
  view = mx.helpers.getView(idView);

  filter = ['all'];

  if (search) {
    if (isNumeric) {
      filter = [operator, attr, search * 1];
    } else {
      map = mx.helpers.getMap(idMap);
      features = map.querySourceFeatures(idView + '-SRC', {
        sourceLayer: idView
      });
      values = {};

      features.forEach(function(f) {
        const value = f.properties[attr];
        const splited = value.split(/\s*,\s*/);
        if (splited.indexOf(search) > -1) {
          values[value] = true;
        }
      });

      values = Object.keys(values);

      if (values.length > 0) {
        filter = ['in', attr].concat(values);
      }
    }
  }

  view._setFilter({
    filter: filter,
    type: filterType
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
  const h = mx.helpers;
  const map = h.getMap(o.id);

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
        o.before = mx.settings.layerBefore;
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
    const h = mx.helpers;
    const map = h.getMap();
    const timeout = 3 * 1000;
    let cancelByTimeout = false;

    if (h.isViewId(o)) {
      o = {
        idView: o
      };
    }

    const isArray = h.isArray(o.idView);
    o.idView = isArray ? o.idView[0] : o.idView;
    o.idView = o.idView.split(mx.settings.separators.sublayer)[0];
    const view = h.getView(o.idView);

    if (!h.isView(view)) {
      console.warn('zoomToViewId : view object required');
      return;
    }

    const res = await Promise.race([zoom(), wait(timeout)]);

    if (res === 'timeout') {
      console.warn(
        `zoomToViewId for ${view.id}, was canceled ( ${timeout} ms )`
      );
    }

    async function zoom() {
      const conf = {
        sum: await h.getViewSourceSummary(view, {useCache: true})
      };
      conf.extent = h.path(conf.sum, 'extent_sp', null);

      if (cancelByTimeout) {
        return;
      }

      if (!h.isBbox(conf.extent)) {
        conf.sum = await h.getViewSourceSummary(view, {useCache: false});
        conf.extent = h.path(conf.sum, 'extent_sp', null);
        if (cancelByTimeout) {
          return;
        }
        if (!h.isBbox(conf.extent)) {
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

    async function wait(n) {
      return new Promise((resolve) => {
        setTimeout(() => {
          cancelByTimeout = true;
          resolve('timeout');
        }, n || 1000);
      });
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
  const h = mx.helpers;
  views = views.constructor === Array ? views : [views];
  let set = false;
  const def = {
    lat1: 80,
    lat2: -80,
    lng1: 180,
    lng2: -180
  };

  let summaries = await Promise.all(views.map(h.getViewSourceSummary));
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
      lng2: -180
    }
  );

  if (!set) {
    extent = def;
  }

  return new mx.mapboxgl.LngLatBounds(
    [extent.lng1, extent.lat1],
    [extent.lng2, extent.lat2]
  );
}

/**
 * Fly to view id using rendered features
 * @param {object} o options
 * @param {string} o.id map id
 * @param {string} o.idView view id
 */
export async function zoomToViewIdVisible(o) {
  const h = mx.helpers;
  const bbox = await h.moduleLoad('turf-bbox');

  let geomTemp, idLayerAll, features;

  geomTemp = {
    type: 'FeatureCollection',
    features: []
  };

  const map = h.getMap(o.id);

  idLayerAll = h.getLayerNamesByPrefix({
    id: o.id,
    prefix: o.idView
  });

  features = map.queryRenderedFeatures({
    layers: idLayerAll
  });

  features.forEach(function(x) {
    geomTemp.features.push(x);
  });

  if (geomTemp.features.length > 0) {
    const bbx = bbox(geomTemp);
    const sw = new mx.mapboxgl.LngLat(bbx[0], bbx[1]);
    const ne = new mx.mapboxgl.LngLat(bbx[2], bbx[3]);
    const llb = new mx.mapboxgl.LngLatBounds(sw, ne);
    map.fitBounds(llb);
  } else {
    h.zoomToViewId(o);
  }
}

export async function resetViewStyle(o) {
  const h = mx.helpers;
  if (!o.idView) {
    return;
  }
  const view = h.getView(o.idView);
  h.updateLanguageElements({
    el: view._el
  });
  await h.viewLayersAdd({
    id: o.id,
    idView: o.idView
  });
  await h.viewsLayersOrderUpdate(o);
}

/**
 * Fly to location and zoom
 * @param {object} o options
 * @param {string} o.id map id
 * @param {boolean} o.jump
 * @param {number} o.param Parameters to use
 */
export function flyTo(o) {
  const map = mx.helpers.getMap(o.id);

  if (map) {
    const p = o.param;

    if (!o.fromQuery && p.fitToBounds === true && !p.jump) {
      map.fitBounds([p.w || 0, p.s || 0, p.e || 0, p.n || 0]);
    } else {
      const opt = {
        center: [p.lng || 0, p.lat || 0],
        zoom: p.zoom || 0,
        jump: p.jump || false,
        duration: o.duration || 3000
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
  const h = mx.helpers;
  const map = h.getMap(opt.id);
  const def = {
    name: 'mercator',
    center: [0, 0],
    parallels: [0, 0]
  };
  opt = Object.assign({}, def, opt);
  if (map) {
    map.setProjection(opt.name, {
      center: opt.center,
      parallels: opt.parallels
    });
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
  const h = mx.helpers;
  const langs = mx.settings.languages;
  if (!h.isView(view)) {
    view = h.getView(view);
  }
  lang = lang || mx.settings.language;
  return h.getLabelFromObjectPath({
    obj: view,
    path: 'data.title',
    lang: lang,
    langs: langs,
    defaultValue: '[ missing title ]'
  });
}
/* get view title  */
export function getViewTitleNormalized(view, lang) {
  const h = mx.helpers;
  if (!h.isView(view)) {
    view = h.getView(view);
  }
  let title = h.getLabelFromObjectPath({
    lang: lang || mx.settings.language,
    obj: view,
    path: 'data.title',
    defaultValue: ''
  });
  title = cleanDiacritic(title)
    .toLowerCase()
    .trim();
  return title;
}

/**
 * Get group of views title, normalized
 * @param {Array} views Array of views or views id
 * @param {String} lang Optional. Language : e.g. fr, en, sp ..
 * @return {Array} Array of titles
 */
export function getViewsTitleNormalized(views, lang) {
  const h = mx.helpers;
  views =
    h.isArrayOfViews(views) || h.isArrayOfViewsId(views) ? views : h.getViews();
  return views.map((v) => h.getViewTitleNormalized(v, lang));
}

/**
 * Get view date modified
 * @param {Object} view View or view id
 * @return {String} date of the last modification
 */
export function getViewDateModified(view) {
  const h = mx.helpers;
  if (!h.isView(view)) {
    view = h.getView(view);
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
  if (typeof id === 'string') {
    view = mx.helpers.getView(id);
  }
  lang = lang || mx.settings.language;
  const langs = mx.settings.languages;

  return mx.helpers.getLabelFromObjectPath({
    obj: view,
    path: 'data.abstract',
    lang: lang,
    langs: langs,
    defaultValue: ''
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
    {clone: true, input: false, class: true, style: false},
    opt
  );

  const h = mx.helpers;
  if (h.isView(id)) {
    id = id.id;
  }
  const view = h.getView(id);
  const elLegend = view._elLegend;
  const hasLegend = h.isElement(elLegend);
  const useClone = opt.clone === true;
  const hasMiniMap = view._legend_minimap instanceof RasterMiniMap;

  if (!hasLegend) {
    return h.el('div');
  }

  if (!useClone) {
    return elLegend;
  }

  const elLegendClone = elLegend.cloneNode(true);
  if (hasMiniMap) {
    const img = view._legend_minimap.getImage();
    const elImg = h.el('img', {src: img});
    elLegendClone.appendChild(elImg);
  }
  if (opt.input === false) {
    elLegendClone.querySelectorAll('input').forEach((e) => e.remove());
  }
  if (opt.style === false) {
    elLegendClone.style = '';
  }
  if (opt.class === false) {
    elLegendClone.className = '';
  }
  return elLegendClone;
}

/**
 * Get a map object by id
 * @param {String|Object} idMap Id of the map or the map itself.
 * @return {Object} map
 */
export function getMap(idMap) {
  idMap = idMap || mx.settings.map.id;

  let map;
  const isId = typeof idMap === 'string';
  const isMap = !isId && mx.helpers.isMap(idMap);

  if (isMap) {
    return idMap;
  }

  if (isId && mx.maps[idMap]) {
    map = mx.maps[idMap].map;
    map.id = idMap;
  }

  if (mx.helpers.isMap(map)) {
    return map;
  }
}

/**
 * Get a map data object (map and views) by id of the map
 * @param {String} idMap Id of the map
 * @return {Object} data
 */
export function getMapData(idMap) {
  idMap = idMap || mx.settings.map.id;
  const data = mx.maps[idMap || mx.settings.map.id];
  data.id = idMap;
  return data;
}

/**
 * Get view list object
 * @return {ViewsList} ViewList
 */
export function getViewsList(o) {
  const h = mx.helpers;
  const data = h.getMapData(o);
  return data.viewsList;
}

/**
 * Get list of views' id
 * @return {Array} Ids of view
 */
export function getViewsListId() {
  const h = mx.helpers;
  return h.getViews().map((m) => m.id);
}
/**
 * Check if view is local
 * @return {Boolean} is local
 */
export function isViewLocal(id) {
  const h = mx.helpers;
  return !!h.getView(id);
}
/**
 * Get view list object
 * @return {Object} ViewList
 */
export function getViewsFilter(o) {
  const h = mx.helpers;
  const data = h.getMapData(o);
  return data.viewsFilter;
}

/**
 * Get map position summary
 * @param {object} o options
 * @param {string} o.id map id
 */
export function getMapPos(o) {
  o = o || {};
  let out, map, bounds, center, zoom, bearing, pitch;
  const r = mx.helpers.round;
  map = mx.helpers.getMap(o.id);

  bounds = map.getBounds();
  center = map.getCenter();
  zoom = map.getZoom();
  bearing = map.getBearing();
  pitch = map.getPitch();

  out = {
    n: r(bounds.getNorth()),
    s: r(bounds.getSouth()),
    e: r(bounds.getEast()),
    w: r(bounds.getWest()),
    lat: r(center.lat),
    lng: r(center.lng),
    b: r(bearing),
    p: r(pitch),
    z: r(zoom)
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
  const h = mx.helpers;
  const d = h.getMapData(o.id);
  const views = d.views || [];

  if (o.idView) {
    o.idView = h.isArray(o.idView) ? o.idView : [o.idView];
    return views.filter((v) => o.idView.indexOf(v.id) > -1);
  } else {
    return views;
  }
}
export function getViewsForJSON() {
  const h = mx.helpers;
  const views = h.getViews();
  const f = [
    'id',
    'editor',
    'target',
    'date_modified',
    'data',
    'type',
    'pid',
    'project',
    'readers',
    'editors',
    '_edit'
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
  const h = mx.helpers;
  if (h.isView(id)) {
    return id;
  }
  if (h.isObject(id) && h.isViewId(id.idView)) {
    id = id.idView;
  }
  if (!h.isViewId(id)) {
    console.warn('No  valid id given. Received ', id);
    return;
  }
  return h.getViews({idView: id})[0];
}

/**
 * Get view position in views array
 * @param {String} id of the view
 * @param {String} idMap Id of the map
 */
export function getViewIndex(id) {
  const h = mx.helpers;
  const view = h.getView(id);
  const d = mx.helpers.getMapData();
  const views = d.views || [];
  return views.indexOf(view);
}

/**
 * Toy function to make layer move
 */
export function makeLayerJiggle(mapId, prefix) {
  const layersName = mx.helpers.getLayerNamesByPrefix({
    id: mapId,
    prefix: prefix
  });

  if (layersName.length > 0) {
    const varTranslate = {
      line: 'line-translate',
      fill: 'fill-translate',
      circle: 'circle-translate',
      symbol: 'icon-translate'
    };

    const m = mx.helpers.getMap(mapId);

    layersName.forEach(function(x) {
      const l = m.getLayer(x);
      const t = l.type;
      const o = varTranslate[t];
      const max = 20;
      const time = 200;
      const dist = [[-20, 0], [20, 0]];
      let n = 0;
      const interval = setInterval(function() {
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
  const h = mx.helpers;
  opt = Object.assign({}, {enable: null, toggle: true, disable: null}, opt);
  const panels = window._button_panels;
  if (h.isBoolean(opt.disable)) {
    opt.enable = !opt.disable;
  }
  const force = opt.toggle === false || h.isBoolean(opt.enable);
  const isImmersive = h.getImmersiveMode();
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
  if (mx.nc instanceof NotifCenter) {
    mx.nc.notify(opt.notif);
  }
}

/**
 * Fetch search API, using user id and token stored in config
 * @return {Promise<String>} Search api key
 */

async function getSearchApiKey() {
  const h = mx.helpers;
  const urlKey = getApiUrl('getSearchKey');
  const ss = mx.settings;
  const qs = h.objToParams({
    idUser: ss.user.id,
    token: ss.user.token
  });
  const urlKeyFetch = `${urlKey}?${qs}`;
  const r = await fetch(urlKeyFetch);
  const keyData = await r.json();
  if (keyData?.type === 'error') {
    throw new Error(keyData.message);
  }
  return keyData.key;
}

export async function chaosTest(opt) {
  const h = mx.helpers;
  opt = Object.assign({}, {nBatch: 5, duration: 1000}, opt);
  await h.viewsCloseAll();
  const start = performance.now();
  const views = h.getViews();
  const curProject = mx.settings.project;
  try {
    while (!isCanceled()) {
      const tt = [];
      for (let i = 0; i < opt.nBatch; i++) {
        tt.push(t());
      }
      await Promise.all(tt);
      await wait();
    }

    await wait(1000);
    const nViews = h.getViewsOpen().length;
    const nLayers = h.getLayerNamesByPrefix().length;

    return nViews === 0 && nLayers === 0;
  } catch (e) {
    console.warn(e);
  }

  async function t() {
    const pos = Math.floor(Math.random() * views.length);
    const view = views[pos];
    await h.viewAdd(view);
    await wait();
    await h.viewRemove(view);
  }
  function wait(t) {
    return new Promise((r) => setTimeout(r, t || rt()));
  }
  function rt() {
    return Math.random() * 1000 + 100;
  }
  function isCanceled() {
    return (
      performance.now() - start >= opt.duration ||
      curProject !== mx.settings.project
    );
  }
}
