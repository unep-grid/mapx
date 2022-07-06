import { ResolversBase } from "./base.js";
import { ShareModal } from "./../../../share_modal/index.js";
import { drawModeToggle } from "./../../../mx_helper_map_draw.js";
import {
  getLanguageCurrent,
  getLanguagesAll,
  updateLanguage,
} from "../../../language/index.js";
import {
  getMap,
  downloadViewVector,
  setImmersiveMode,
  getImmersiveMode,
  getViewsForJSON,
  getViewsLayersVisibles,
  getView,
  getViewLegendImage,
  getViewRemote,
  viewRemove,
  downloadViewSourceExternal,
  downloadViewGeoJSON,
  getViewsTitleNormalized,
  getGeoJSONRandomPoints,
  getViewJson,
  viewDelete,
  getBoundsArray,
} from "../../../map_helpers/index.js";
import {
  commonLocFitBbox,
  commonLocGetBbox,
  commonLocGetListCodes,
  commonLocGetTableCodes,
} from "../../../commonloc/index.js";
import { isArray, isMap, isView } from "./../../../is_test";
import { dashboardHelper } from "../../../mx_helper_map_dashboard.js";
import {
  fetchSourceMetadata,
  fetchViewMetadata,
} from "../../../mx_helper_map_view_metadata.js";
import { getViewSourceSummary } from "../../../mx_helper_source_summary.js";
import {
  getClickHandlers,
  makeId,
  path,
  setClickHandler,
} from "../../../mx_helper_misc.js";
import { getTableAttributeConfigFromView } from "../../../mx_helper_source_attribute_table.js";
import { getApiUrl } from "../../../api_routes/index.js";
import { viewsListAddSingle } from "../../../mx_helper_map_view_ui.js";
import { mapComposerModalAuto } from "../../../mx_helper_map_composer.js";
import { modalCloseAll } from "../../../mx_helper_modal.js";
import { toggleSpotlight } from "../../../mx_helper_map_pixop.js";
import { spatialDataToView } from "../../../mx_helper_map_dragdrop.js";
import { theme } from "./../../../mx";

/**
 * MapX resolvers available in static and app
 */
class MapxResolversStatic extends ResolversBase {
  /**
   * List resolvers methods
   * @return {Array} array of supported methods
   */
  get_sdk_methods() {
    const reg = new RegExp("^_");
    const methods = Object.getOwnPropertyNames(MapxResolversStatic.prototype);
    return methods.splice(1, methods.length).filter((m) => !m.match(reg));
  }
  /**
   * Set panel visibility
   * @param {Object} opt Options
   * @param {Boolean} opt.show Show the panel. If false, hide.
   * @param {Boolean} opt.open Open the panel. If false, close.
   * @param {Boolean} opt.toggle If closed, open. If open, close.
   * @return {Boolean} done
   */
  set_panel_left_visibility(opt) {
    const rslv = this;
    const panel = mx.panel_main.panel;
    return rslv._handle_panel_visibility(panel, opt);
  }

  /**
   * Test if dashboard exists
   * @return {Boolean} exists
   */
  has_dashboard() {
    return dashboardHelper.hasInstance();
  }

  /**
   * End to end ws com testing
   */
  async test_ws(id) {
    return await mx.ws.test(id);
  }

  /**
   * Toogle immersive mode: hide or show ALL panels.
   * @aram {Object} opt Options
   * @param {Boolean} opt.enable Force enable
   * @param {Boolean} opt.toggle Toggle
   * @return {Boolean} enabled
   */
  set_immersive_mode(opt) {
    return setImmersiveMode(opt);
  }

  /**
   * Get immersive mode state
   * @return {Boolean} Enabled
   */
  get_immersive_mode() {
    return getImmersiveMode();
  }

  /**
   * Enable or disable 3d terrain
   * @param {Object} opt Options
   * @param {String} opt.action Action to perform: 'enable','disable','toggle'
   */
  set_3d_terrain(opt) {
    const ctrl = mx.panel_tools.controls.getButton("btn_3d_terrain");
    if (ctrl && ctrl.action) {
      ctrl.action(opt.action);
    }
  }
  /**
   * Enable or disable 3d terrain
   * Set related layers visibility, change control buttons state
   * @param {Object} opt Options
   * @param {String} opt.action Action to perform: 'show','hide','toggle'
   */
  set_mode_3d(opt) {
    const ctrl = mx.panel_tools.controls.getButton("btn_3d_terrain");
    if (ctrl && ctrl.action) {
      ctrl.action(opt.action);
    }
  }

  /**
   * Enable or disable aerial/satelite mode
   * Set related layers visibility, change control buttons state
   * @param {Object} opt Options
   * @param {String} opt.action Action to perform: 'show','hide','toggle'
   */
  set_mode_aerial(opt) {
    const ctrl = mx.panel_tools.controls.getButton("btn_theme_sat");
    if (ctrl && ctrl.action) {
      ctrl.action(opt.action);
    }
  }

  /**
   * Show sharing modal
   * @param {Object} opt Options
   * @param {String|Array} opt.idView Id view to share
   * @return {Boolean} Done
   */
  async show_modal_share(opt) {
    opt = Object.assign({ idView: [] }, opt);
    const idViews = isArray(opt.idView) ? opt.idView : [opt.idView];
    const sm = new ShareModal({
      views: idViews,
    });
    await sm.once("updated");
  }

  /**
   * Close sharing modal
   * @return {Boolean} Done
   */
  async close_modal_share() {
    const sm = window._share_modal;
    if (sm) {
      const promClosed = sm.once("closed");
      sm.close();
      await promClosed;
      return true;
    } else {
      return false;
    }
  }

  /**
   * Get sharing string
   * @return {String} Sharing string ( code / url )
   */
  get_modal_share_string() {
    if (!window._share_modal) {
      throw new Error("No share modal found");
    }
    return window._share_modal.getShareString();
  }

  /**
   * Set MapX theme by id or set custom colors.
   * Both ways are exclusive.
   * @param {Object} opt Options
   * @param {String} opt.idTheme Valid theme id. Use 'get_themes_id' to get a list
   * @param {Object} opt.colors Valid colors scheme. Use 'get_themes' to see default themes structure.
   * @return {Boolean} done
   */
  set_theme(opt) {
    opt = Object.assign({}, opt);
    if (opt.idTheme) {
      return theme.set(opt.idTheme);
    } else if (opt.colors) {
      return theme.setColors(opt.colors);
    }
  }

  /**
   * Get themes id
   * @return {Array} array of themes id
   */
  get_themes_id() {
    return theme.ids();
  }

  /**
   * Get all themes
   * @return {Object} Themes object with themes id as key
   */
  get_themes() {
    return theme.getAll();
  }

  /**
   * Get current theme id
   * @return {string} Theme id
   */
  get_theme_id() {
    return theme.id();
  }
  /**
   * Check if element is visible, by id
   * @param {Object} opt Options
   * @param {String} opt.id Id of the element to check
   * @param {Number} opt.timeout Timeout
   */
  has_el_id(opt) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const has = !!document.getElementById(opt.id);
        resolve(has);
      }, opt.timeout || 0);
    });
  }

  /**
   * Set dashboard visibility
   * @param {Object} opt Options
   * @param {Boolean} opt.show If true, show the dashboard
   * @param {Boolean} opt.toggle Toggle the dashoard
   * @return {Boolean} done
   */
  set_dashboard_visibility(opt) {
    const rslv = this;
    if (!rslv.has_dashboard()) {
      throw new Error("No dashboard container found");
    }
    const dh = dashboardHelper.getInstance();
    const panel = dh.panel;
    return rslv._handle_panel_visibility(panel, opt);
  }

  /**
   * Check if the dashboard is visible
   * @return {Boolean} The dashboard is visible
   */
  is_dashboard_visible() {
    const rslv = this;
    const dh = dashboardHelper;
    const d = dh.getInstance();
    return rslv.has_dashboard() && d.isVisible();
  }

  /**
   * Get source metadata
   * @param {Object} opt Options
   * @param {String} opt.idSource Id of the source
   * @return {Object} Source MapX metadata
   */
  get_source_meta(opt) {
    return fetchSourceMetadata(opt.idSource, opt.force);
  }

  /**
   * Get view's source summary
   * @param {Object} opt Options
   * @param {String} opt.idView Id of the view
   * @param {Array} opt.stats Stats to retrieve. ['base', 'attributes', 'temporal', 'spatial']
   * @return {Object} Source summary
   */
  get_view_source_summary(opt) {
    return getViewSourceSummary(opt.idView, opt);
  }

  /**
   * Get user ip info
   * @return {Object} Current user ip object (ip, country, region, etc)
   */
  async get_user_ip() {
    const rs = await fetch("https://api.mapx.org/get/ip");
    return rs.json();
  }

  /**
   * Get current language
   * @return {String} Two letters language code
   */
  get_language() {
    return getLanguageCurrent();
  }

  /**
   * Setlanguage
   * @param {Object} opt Options
   * @param {String} opt.lang Two letters language code
   * @return {Boolean} Laguage change process finished
   */
  set_language(opt) {
    opt = Object.assign({}, { lang: "en" }, opt);
    return updateLanguage(opt.lang);
  }

  /**
   * Get list of supported current languages
   * @return {Array} Array of two letters language code
   */
  get_languages() {
    return getLanguagesAll();
  }

  /**
   * Get list of available views as static objects
   * @return  {Array} Array of views
   */
  get_views() {
    return getViewsForJSON();
  }

  /**
   * Get list views with visible layers
   * @return  {Array} Array of views
   */
  get_views_with_visible_layer() {
    return getViewsLayersVisibles();
  }

  /**
   * Get list of available views id
   * @return  {Array} Array of id
   */
  get_views_id() {
    return getViewsForJSON().map((v) => v.id);
  }

  /**
   * Get list of available views id
   * @return  {Array} Array of id
   */
  get_views_id_open() {
    return getViewsOpen();
  }

  /**
   * Get vector view (vt) metadata of the attribute
   * @param {Object} opt Options
   * @param {String} opt.idView Id of the view
   * @return {Object} attribut metadata
   */
  get_view_meta_vt_attribute(opt) {
    opt = Object.assign({}, { idView: null }, opt);
    const view = getView(opt.idView);
    if (isView(view)) {
      return path(view, "data.attribute", {});
    }
  }

  /**
   * Get view metadata
   * @param {Object} opt options
   * @param {String} opt.idView Id of the view
   * @param {Object} view meta data object
   * @return {Promise<Object>} view metadata
   */
  get_view_meta(opt) {
    opt = Object.assign({}, { idView: null }, opt);
    return fetchViewMetadata(opt.idView);
  }

  /**
   * Get view table attribute config
   * @param {Object} opt options
   * @param {String} opt.idView Id of the view
   * @return {Object}
   */
  get_view_table_attribute_config(opt) {
    opt = Object.assign({}, { idView: null }, opt);
    const out = {};
    if (opt.idView) {
      const view = getView(opt.idView);
      const config = getTableAttributeConfigFromView(view);
      for (const key of ["attributes", "idSource", "labels"]) {
        out[key] = config[key];
      }
    }
    return out;
  }

  /**
   * Get view table attribute url
   * @param {Object} opt options
   * @param {String} opt.idView Id of the view
   * @return {String}
   */
  get_view_table_attribute_url(opt) {
    const rslv = this;
    opt = Object.assign({}, { idView: null }, opt);
    const config = rslv.get_view_table_attribute_config(opt);
    const url = new URL(getApiUrl("getSourceTableAttribute"));
    if (config) {
      url.searchParams.set("id", config.idSource);
      url.searchParams.set("attributes", config.attributes.join(","));
    }
    return url.toString();
  }

  /**
   * Get view table attribute
   * @param {Object} opt options
   * @param {String} opt.idView Id of the view
   * @return {Object}
   */
  async get_view_table_attribute(opt) {
    opt = Object.assign({}, { idView: null }, opt);
    const rslv = this;
    const url = rslv.get_view_table_attribute_url(opt);
    if (url) {
      const response = await fetch(url);
      if (response.ok) {
        return response.json();
      }
    }
    return null;
  }

  /**
   * Get view legend
   * @param {Object} opt options
   * @param {String} opt.idView Id of the view
   * @param {String} opt.format
   * @return {String} PNG in base64 format
   */
  get_view_legend_image(opt) {
    return getViewLegendImage({ view: opt.idView, format: opt.format });
  }

  /**
   * Filter view layer by text (if attribute is text)
   * @param {Options} opt Options
   * @return {Boolean} done
   */
  set_view_layer_filter_text(opt) {
    return this._apply_filter_layer_select.bind(this)(
      "searchBox",
      "setValue",
      opt
    );
  }
  /**
   * Get current search box item
   * @param {Options} opt Options
   * @return {Boolean} done
   */
  get_view_layer_filter_text(opt) {
    return this._apply_filter_layer_select.bind(this)(
      "searchBox",
      "getValue",
      opt
    );
  }

  /**
   * Filter view layer by numeric (if attribute is numeric)
   * @param {Options} opt Options
   * @param {String} opt.idView Target view id
   * @param {Numeric} opt.value Value
   */
  set_view_layer_filter_numeric(opt) {
    return this._apply_filter_layer_slider.bind(this)(
      "numericSlider",
      "set",
      opt
    );
  }

  /**
   * Filter view layer by time ( if posix mx_t0 and/or mx_t1 attributes exist )
   * @param {Options} opt Options
   * @param {String} opt.idView Target view id
   * @param {Numeric | Array} opt.value Value or range of value
   * @return null
   */
  set_view_layer_filter_time(opt) {
    return this._apply_filter_layer_slider.bind(this)("timeSlider", "set", opt);
  }

  /**
   * Set layer transarency (0 : visible, 100 : 100% transparent)
   * @param {Options} opt Options
   * @param {String} opt.idView Target view id
   * @param {Numeric} opt.value Value
   * @return null
   */
  set_view_layer_transparency(opt) {
    return this._apply_filter_layer_slider.bind(this)(
      "transparencySlider",
      "set",
      opt
    );
  }

  /**
   * Get current numeric slider value
   * @param {Options} opt Options
   * @param {String} opt.idView Target view id
   * @return {Number|Array} values
   */
  get_view_layer_filter_numeric() {
    return this._apply_filter_layer_slider.bind(this)("numericSlider", "get");
  }

  /**
   * Get current time slider value
   * @param {Options} opt Options
   * @param {String} opt.idView Target view id
   * @return {Number|Array} values
   */
  get_view_layer_filter_time() {
    return this._apply_filter_layer_slider.bind(this)("timeSlider", "get");
  }

  /**
   * Get current transparency value for layers of a view
   * @param {Options} opt Options
   * @param {String} opt.idView Target view id
   * @return {Number} value
   */
  get_view_layer_transparency() {
    return this._apply_filter_layer_slider.bind(this)(
      "transparencySlider",
      "get"
    );
  }

  /**
   * Add a view
   * @param {Object} opt Options
   * @param {String} opt.idView Target view id
   * @return {Promise<Boolean>} done
   */
  async view_add(opt) {
    const rslv = this;
    opt = Object.assign({}, { idView: null }, opt);
    const view = getView(opt.idView) || (await getViewRemote(opt.idView));
    const valid = isView(view);
    if (valid) {
      await viewsListAddSingle(view);
      return true;
    } else {
      return rslv._err("err_view_invalid");
    }
  }

  /**
   * remove a view
   * @param {Object} opt Options
   * @param {String} opt.idView Target view id
   * @return {Boolean} done
   */
  async view_remove(opt) {
    opt = Object.assign({}, { idView: null }, opt);
    await viewRemove(opt.idView);
    return true;
  }

  /**
   * Get the download links of an external source set in metadata (custom code, raster, etc)
   * @param {Object} opt Options
   * @param {String} opt.idView view view id
   * @return {Object} input options, with new key : url. E.g. {idView:<abc>,url:<first url>,urlItems:[{<url>,<label>,<is_download_link>}]}
   */
  download_view_source_external(opt) {
    return downloadViewSourceExternal(opt);
  }

  /**
   * Get the download link of the raster source (same as download_view_source_external)
   */
  download_view_source_raster(opt) {
    return downloadViewSourceExternal(opt);
  }

  /**
   * Open the download modal for vector views
   * @param {Object} opt Options
   * @param {String} opt.idView Vector view id
   * @return {Object} input options E.g. {idView:<abc>}
   */
  async download_view_source_vector(opt) {
    const dl = await downloadViewVector(opt.idView);
    await dl.once("init");
    return true;
  }

  /**
   * Close download vector modal
   * @return {Boolean} Done
   */
  async close_modal_download_vector() {
    const dl = window._download_source_modal;
    if (dl) {
      const promClosed = dl.once("closed");
      dl.close();
      await promClosed;
      return true;
    } else {
      return false;
    }
  }

  /**
   * Get the data from geojson view or download geojsn as a file
   * @param {Object} opt Options
   * @param {String} opt.idView GeoJSON view id
   * @param {String} opt.mode "file" or "data"
   * @return {Object} input options E.g. {idView:<abc>, data:<data (if mode = data)>}
   */
  download_view_source_geojson(opt) {
    return downloadViewGeoJSON(opt);
  }

  /**
   * Show map composer
   * @return {Boolean} done
   */
  show_modal_map_composer() {
    return mapComposerModalAuto();
  }

  /**
   * close all modal windows
   * @return {Boolean} done
   */
  close_modal_all() {
    modalCloseAll();
    return true;
  }

  /**
   * Toggle draw mode
   */
  toggle_draw_mode() {
    return drawModeToggle();
  }

  /**
   * Get list of views title
   * @param {Object} opt options
   * @param {Array} opt.views List of views or views id
   * @param {String} opt.lang Language code
   * @return {Array} Array of titles (string)
   */
  get_views_title(opt) {
    opt = Object.assign({}, { views: [], lang: "en" }, opt);
    return getViewsTitleNormalized(opt);
  }

  /**
   * Highlight vector feature : Enable, disable, toggle
   * @param {Object} opt Options
   * @param {Boolean} opt.enable Enable or disable. If not set, toggle highglight
   * @param {Number} opt.nLayers Numbers of layer that are used in the overlap tool. If not set, the default is 1 : any visible feature is highlighted. If 0 = only part where all displayed layers are overlapping are highligthed
   * @param {Boolean} opt.calcArea Estimate area covered by visible feature and display result in MapX interface
   * @return {Object} options realised {enable:<false/true>,calcArea:<true/false>,nLayers:<n>}
   */
  set_vector_highlight(opt) {
    return toggleSpotlight(opt);
  }

  /**
   * Add geojson.
   * ( Other supported file type may be supported )
   * @param {Object} opt Options
   * @param {String | Object | Buffer} opt.data Data : String,
   * @param {Boolean} opt.save Save locally, so next session the date will be loaded
   * @param {String} opt.fileType File type. e.g. geojson. default = geojson
   * @param {String} opt.fileName File name, if any
   * @param {Sring} opt.title Title
   * @param {String} opt.abstract Abstract
   * @param {Object} opt.random Generate random geojson
   * @param {Number} opt.random.n number of points
   * @param {Array} opt.random.latRange [minLat, maxLat]
   * @param {Array} opt.random.lngRange [minLng, maxLng]
   * @return {Object} view
   */
  async view_geojson_create(opt) {
    const rId = makeId(10);
    const id = `MX-GJ-${rId}`;
    opt = Object.assign(
      {},
      {
        data: null,
        save: false,
        fileType: "geojson",
        fileName: id,
        title: id,
        abstract: id,
      },
      opt
    );
    if (opt.random && !opt.data) {
      opt.data = getGeoJSONRandomPoints(opt.random);
    }
    const view = await spatialDataToView(opt);
    await viewsListAddSingle(view, { open: true });
    const out = getViewJson(view, { asString: false });
    return out;
  }

  /**
   * Set geojson view layers style : layout and paint
   * @param {Object} opt Options
   * @param {String} opt.idView Id of the geojson view
   * @param {Object} opt.layout Mapbox-gl layout object e.g. {'visibility','none'};
   * @param {Object} opt.paint Mapbox-gl paint object. e.g. {'fill-color':'red'};
   * @return {Boolean} done
   */
  view_geojson_set_style(opt) {
    opt = Object.assign({}, { idView: null, layout: {}, paint: {} }, opt);
    const rslv = this;
    const map = getMap();
    const layer = map.getLayer(opt.idView);
    const paintProp = Object.keys(opt.paint);
    const layoutProp = Object.keys(opt.layout);
    if (!layer) {
      return rslv._err("err_layer_not_found", { idView: opt.idView });
    }

    if (paintProp.length > 0) {
      for (const p of paintProp) {
        map.setPaintProperty(opt.idView, p, opt.paint[p]);
      }
    }
    if (layoutProp.length > 0) {
      for (const p of layoutProp) {
        map.setLayoutProperty(opt.idView, p, opt.layout[p]);
      }
    }
  }

  /**
   * Delete view geojson
   * Works with all view, but not permanently.
   * @param {Object} opt Options
   * @param {String} opt.idView Id of the geojson view to delete.
   * @return {Boolean} done
   */
  async view_geojson_delete(opt) {
    const done = await viewDelete(opt);
    return done;
  }

  /**
   * Set map feature click handler to sdk only
   * A listener could be set to listen to 'click_attributes' events. e.g. mapx.on('click_attributes')
   * if this option is enabled, only the SDK will receive the attribute table.
   * @param {Object} opt Options
   * @param {Boolean} opt.enable Enable sdk only
   * @param {Boolean} opt.toggle Toggle this mode
   * @return {Array} Enabled modes
   */
  set_features_click_sdk_only(opt) {
    return setClickHandler({
      type: "sdk",
      enable: opt.enable,
      toggle: opt.toggle,
    });
  }

  /**
   * Get map feature click handlers id
   * @return {Array} Enabled modes
   */
  get_features_click_handlers() {
    return getClickHandlers();
  }

  /**
   * Map flyTo position with flying animation
   * @param {Object} opt Options see https://docs.mapbox.com/mapbox-gl-js/api/map/#map#flyto
   * @example mapx.ask('map_fly_to',{center:[46,23], zoom:5});
   * @return {Promise<Object>} When moveend, the options
   */
  map_fly_to(opt) {
    const rslv = this;
    const map = getMap();
    return rslv._map_resolve_when(
      "moveend",
      () => {
        map.flyTo(opt);
      },
      opt
    );
  }

  /**
   * Map jumpTo position, without animation
   * @param {Object} opt Options see https://docs.mapbox.com/mapbox-gl-js/api/map/#map#jumpto
   * @example mapx.ask('set_map_jump_to',{lat:46,lng:23, zoom:5});
   * @return {Promise<Object>} When moveend, the options
   */
  map_jump_to(opt) {
    const rslv = this;
    const map = getMap();
    return rslv._map_resolve_when(
      "moveend",
      () => {
        map.jumpTo(opt);
      },
      opt
    );
  }

  /**
   * Get current map zoom
   * @return {Float} zoom
   */
  map_get_zoom() {
    const map = getMap();
    return map.getZoom();
  }

  /**
   * Get current map center
   * @return {Object} center
   */
  map_get_center() {
    const map = getMap();
    return map.getCenter();
  }

  /**
   * Get current map bounds as array
   * @return {Array} Bounds [west, south, east, north]
   */
  map_get_bounds_array() {
    return getBoundsArray();
  }

  /**
   * Generic map (mapbox-gl-js) methods
   * This gives you low level access to the `map` methods. Most methods work, but not all.
   * see https://docs.mapbox.com/mapbox-gl-js/api/map for all references
   * @example
   * mapx.ask('map',{
   *    method: 'setPaintProperty',
   *    parameters : ['background', 'background-color', '#faafee']
   * }).then(console.table);
   * @param {Object} opt Options
   * @param {String} opt.method Method/Instance member name (ex. `setPaintProperty`);
   * @param {Array} opt.parameters Array of parameters (ex. "['background', 'background-color', '#faafee']")
   * @return {Promise<Any|Boolean>} If returned value can be parsed, the value. If not, true;
   */
  async map(opt) {
    const map = getMap();
    const m = map[opt.method];
    let res;
    if (typeof m === "undefined") {
      throw new Error(`Method ${opt.method} not found`);
    }
    if (opt.method === "once") {
      await map[opt.method](opt.parameters);
      return true;
    }
    if (m instanceof Function) {
      opt.parameters = opt.parameters || [];
      res = m.bind(map)(...opt.parameters);
    } else {
      map[opt.method] = opt.parameters;
      res = map[opt.method];
    }

    if (isMap(res)) {
      return true;
    }

    return res;
  }

  /**
   * Async wait for map idle
   * @return {Boolean} Map is idle
   */
  async map_wait_idle() {
    const map = getMap();
    const isMoving = map.isMoving();
    if (isMoving) {
      await map.once("idle");
    }
    return true;
  }

  /**
   * Get list of common location codes
   * Codes as defined in ISO 3166-1 alpha-3 (ex. AFG, COD) and UN M49 region codes (ex. m49_901)
   * @return {Array} Array of codes as strings
   */
  common_loc_get_list_codes() {
    return commonLocGetListCodes();
  }

  /**
   * Get table of common location codes and names
   * Same as common_loc_get_list_codes, but with names in set language. ex. [{code:"ABW",name:"Aruba"},...]
   * @example
   * mapx.ask('common_loc_get_table_codes',{
   *    language: english
   * }).then(console.table);
   * // code  name
   * // -----------------
   * // ABW   Aruba
   * // AFG   Afghanistan
   * // AGO   Angola
   * // AIA   Anguilla
   * @param {Object} opt Options
   * @param {String} opt.language Language (ISO 639-1 two letters code, default 'en')
   * @return {Promise<Array>} Array of codes and name as object
   */
  common_loc_get_table_codes(opt) {
    return commonLocGetTableCodes(opt);
  }

  /**
   * Get Bounding box for code iso3, m49 and text + language
   * @param {Object} o options
   * @param {(String|string[])} o.code Code: ISO 3166-1 alpha-3 (iso3) or UN M49 region code. E.g. 'COD','m49_004'
   * @param {(String|string[])} o.name Name (alternative to code, less recommanded): Country or region mame. e.g. Africa, Bangladesh
   * @return {Promise<Array>} Array of geographic bounds [west, south, east, north]
   */
  common_loc_get_bbox(opt) {
    return commonLocGetBbox(opt);
  }

  /**
   * Set map bounding box based on code (ISO 3166-1 alpha-3 (ex. AFG, COD) and UN M49 region codes) or name (ex. Africa)
   * @param {Object} o options
   * @param {(String|string[])} o.code Code: ISO 3166-1 alpha-3 (iso3) or UN M49 region code. E.g. 'COD','m49_004'
   * @param {(String|string[])} o.name Name (alternative to code, less recommanded): Country or region mame. e.g. Africa, Bangladesh
   * @param {Object} o.param Animation options, see https://docs.mapbox.com/mapbox-gl-js/api/properties/#animationoptions
   * @return {Promise<Array>} Array of geographic bounds [west, south, east, north]
   */
  common_loc_fit_bbox(opt) {
    return commonLocFitBbox(opt);
  }

  /**
   * Not working
   *   map_set_free_camera_position(opt) {
   *
   *      Note, moving z when pitch is set, the camera points to different
   *      x/y extent. If not set here, map center can be altaered.
   *      z  ┌───────────────────────┬─────────────────────┐
   *         │                       │                     │
   *      0.8├─────┐                 │                     │
   *         │     │                 │                     │
   *      0.5├──┐  │                 │                     │
   *         │  │  │                 │                     │
   *         └──┴──┴─────────────────┴─────────────────────┘
   *            -0.9 -0.8           0,0                   x/y
   *
   *    const rslv = this;
   *    const map = rslv._h.getMap();
   *    const cam = map.getFreeCameraOptions();
   *    if (typeof opt.altitude !== "undefined") {
   *      let lngLat;
   *      if (opt.y && opt.x) {
   *        lngLat = new mx.mapboxgl.MercatorCoordinate(opt.x, opt.y, 0);
   *      } else {
   *        lngLat = cam.position.toLngLat();
   *      }
   *      opt.z = mx.mapboxgl.MercatorCoordinate.fromLngLat(lngLat, opt.altitude).z;
   *      delete opt.altitude;
   *    }
   *    Object.assign(cam.position, opt);
   *    console.log(cam.position);
   *    map.setFreeCameraOptions(cam);
   *    return true;
   *  }
   **/
}

export { MapxResolversStatic };
