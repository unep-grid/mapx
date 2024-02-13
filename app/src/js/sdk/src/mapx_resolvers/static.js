import { MapxResolversPanels } from "./panels.js";
import { ShareModal } from "./../../../share_modal/index.js";
import {
  getLanguageCurrent,
  getLanguagesAll,
  updateLanguage,
} from "../../../language/index.js";
import { ViewBase } from "../../../views_builder/view_base.js";
import {
  getMap,
  setImmersiveMode,
  getImmersiveMode,
  getViewsForJSON,
  getViewsLayersVisibles,
  getView,
  getViewsBounds,
  getViewLegendImage,
  getViewRemote,
  viewRemove,
  viewAdd,
  viewDelete,
  downloadViewVector,
  downloadViewSourceExternal,
  downloadViewGeoJSON,
  getViewsTitleNormalized,
  getGeoJSONRandomPoints,
  getViewJson,
  getBoundsArray,
  fitMaxBounds,
  validateBounds,
  viewsLayersOrderUpdate,
} from "../../../map_helpers/index.js";

import {
  viewSetOpacity,
  viewGetOpacityValue,
  viewSetNumericFilter,
  viewGetNumericFilterValues,
  viewSetTextFilter,
  viewGetTextFilterValues,
  viewSetTimeFilter,
  viewGetTimeFilterValues,
} from "../../../map_helpers/view_filters.js";

import { mapComposerModalAuto } from "../../../map_composer";
import {
  commonLocFitBbox,
  commonLocGetBbox,
  commonLocGetListCodes,
  commonLocGetTableCodes,
} from "../../../commonloc/index.js";
import { isArray, isMap, isView } from "./../../../is_test";
import { dashboard } from "./../../../dashboards/dashboard_instances.js";
import {
  getSourceMetadata,
  getViewMetadata,
  getViewSourceMetadata,
} from "../../../metadata/utils.js";
import { getViewSourceSummary } from "../../../mx_helper_source_summary.js";
import {
  getClickHandlers,
  makeId,
  path,
  setClickHandler,
} from "../../../mx_helper_misc.js";
import { getTableAttributeConfigFromView } from "../../../source/display/index.js";
import { getApiUrl } from "../../../api_routes/index.js";
import { viewsListAddSingle } from "../../../views_list_manager";
import { modalCloseAll } from "../../../mx_helper_modal.js";
import { toggleSpotlight } from "../../../mx_helper_map_pixop.js";
import { spatialDataToView } from "../../../mx_helper_map_dragdrop.js";
import {
  settings,
  highlighter,
  theme,
  ws,
  controls,
  panels,
} from "./../../../mx";
import {
  getViewLegendState,
  getViewLegendValues,
  setViewLegendState,
} from "../../../legend_vt/helpers.js";

/**
 * MapX resolvers available in static and app
 * @class
 * @extends MapxResolversPanels
 */
export class MapxResolversStatic extends MapxResolversPanels {
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
    const panelMain = panels.get("panel_main");
    const panel = panelMain.panel;
    return rslv._handle_panel_visibility(panel, opt);
  }

  /**
   * Test if dashboard exists
   * @return {Boolean} exists
   */
  has_dashboard() {
    return dashboard.hasInstance();
  }

  /**
   * End to end ws com testing
   */
  async tests_ws() {
    return await ws.tests();
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
   * Set related layers visibility, change control buttons state
   * @param {Object} opt Options
   * @param {String} opt.action Action to perform: 'show','hide','toggle'
   */
  set_mode_3d(opt) {
    const ctrl = controls.get("btn_3d_terrain");
    if (ctrl && ctrl.action) {
      ctrl.action(opt.action);
    }
  }
  /**
   * Enable or disable 3d terrain ( same as set_mode_3d;
   */
  set_3d_terrain(opt) {
    return this.set_mode_3d(opt);
  }

  /**
   * Enable or disable aerial/satelite mode
   * Set related layers visibility, change control buttons state
   * @param {Object} opt Options
   * @param {String} opt.action Action to perform: 'show','hide','toggle'
   */
  set_mode_aerial(opt) {
    const ctrl = controls.get("btn_theme_sat");
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
    const rslv = this;
    opt = Object.assign({ idView: [] }, opt);
    const idViews = isArray(opt.idView) ? opt.idView : [opt.idView];
    const sm = new ShareModal({
      views: idViews,
    });
    await sm.once("updated");
    rslv._sm = sm;
  }

  /**
   * Close sharing modal
   * @return {Boolean} Done
   */
  async close_modal_share() {
    const rslv = this;
    const sm = rslv._sm;
    if ((!sm) instanceof ShareModal) {
      throw new Error("No share modal found");
    }
    const promClosed = sm.once("closed");
    sm.close();
    await promClosed;
    delete rslv._sm;
    return true;
  }

  /**
   * Get sharing string
   * @return {String} Sharing string ( code / url )
   */
  get_modal_share_string() {
    const rslv = this;
    const sm = rslv._sm;
    if ((!sm) instanceof ShareModal) {
      throw new Error("No share modal found");
    }
    return sm.getShareCode();
  }

  /**
   * Modal Share Tests Suite
   * @return {array} array of tests
   */
  async get_modal_share_tests() {
    const rslv = this;
    const sm = rslv._sm;
    if ((!sm) instanceof ShareModal) {
      throw new Error("No share modal found");
    }
    const ok = await sm.tests();
    return ok;
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
      return theme.set(opt.idTheme, { save_url: true });
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
   * Get all theme id
   * @return {Array<string>} Theme ids
   */
  get_themes_ids() {
    return theme.ids();
  }

  /**
   * Add a custom theme into mapx and use it.
   * @param {Object} opt Options
   * @param {String} opt.theme Valid theme (full).
   * @return {Boolean} done
   */
  add_theme(opt) {
    opt = Object.assign({}, opt);
    return theme.addTheme(opt.theme, { save_url: true });
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
    const { panel } = dashboard.getInstance();
    return rslv._handle_panel_visibility(panel, opt);
  }

  /**
   * Check if the dashboard is visible
   * @return {Promise<Boolean>} The dashboard is visible
   */
  async is_dashboard_visible() {
    const rslv = this;
    return rslv.has_dashboard() && dashboard.exec("isVisible");
  }

  /**
   * Get source metadata
   * @param {Object} opt Options
   * @param {String} opt.idSource Id of the source
   * @param {Boolean} opt.asArray In case of joined meta, returns an array
   * @return {Promise<Object|Array>} Source MapX metadata, or array of meta
   */
  async get_source_meta(opt) {
    const metaAll = await getSourceMetadata(opt.idSource);
    if (opt.asArray) {
      return metaAll;
    } else {
      return metaAll[0];
    }
  }

  /**
   * Get view's source summary
   * @param {Object} opt Options
   * @param {String} opt.idView Id of the view
   * @param {Array} opt.stats Stats to retrieve. ['base', 'attributes', 'temporal', 'spatial']
   * @param {String} opt.idAttr Attribute for stat (default = attrbute of the style)
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
   * Get list of available views id
   * @return  {Array} Array of id
   */
  get_views_id() {
    return getViewsForJSON().map((v) => v.id);
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
    return getViewMetadata(opt.idView);
  }

  /**
   * Get view source metadata
   * @param {Object} opt options
   * @param {String} opt.idView Id of the view
   * @param {Boolean} opt.asArray In case of joined meta, returns an array
   * @param {Object} view meta data object
   * @return {Promise<Object|Array>} view metadata
   */
  async get_view_source_meta(opt) {
    opt = Object.assign({}, { idView: null }, opt);
    const metaAll = await getViewSourceMetadata(opt.idView);
    if (opt.asArray) {
      return metaAll;
    } else {
      if (metaAll.length > 1) {
        console.warn(
          "Multiple metadata objects found " +
            "only the first one will be returned " +
            "use `asArray` to return all",
        );
      }
      const meta = metaAll[0];
      return meta;
    }
  }

  /**
   * Get view table attribute config
   * @param {Object} opt options
   * @param {String} opt.idView Id of the view
   * @return {Promise<Object>} view attribute config
   */
  async get_view_table_attribute_config(opt) {
    opt = Object.assign({}, { idView: null }, opt);
    const out = {};
    if (opt.idView) {
      const view = getView(opt.idView);
      const config = await getTableAttributeConfigFromView(view);
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
   * @return {Promise<String>}
   */
  async get_view_table_attribute_url(opt) {
    const rslv = this;
    opt = Object.assign({}, { idView: null }, opt);
    const config = await rslv.get_view_table_attribute_config(opt);
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
   * @return {Array.<Object>}
   */
  async get_view_table_attribute(opt) {
    opt = Object.assign({}, { idView: null }, opt);
    const rslv = this;
    const url = await rslv.get_view_table_attribute_url(opt);
    if (url) {
      const response = await fetch(url);
      if (response.ok) {
        const { data } = await response.json();
        return data;
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
   * Updates the state of a view's legend with the provided values.
   *
   * @param {Object} opt options
   * @param {String|Object} opt.idView - The view object containing the legend instance.
   * @param {Array} opt.values - An array of values to set the legend's state.
   * @returns {void|Error} Returns nothing if successful or an error if there's no LegendVt instance.
   */
  set_view_legend_state(opt) {
    return setViewLegendState(opt.idView, opt.values);
  }

  /**
   * Retrieves the current state (checked values) of a view's legend.
   *
   * @param {Object} opt options
   * @param {String|Object} opt.idView - The view id containing the legend instance.
   * @returns {Array|Error} An array of the currently checked values in the legend, or an error if there's no LegendVt instance.
   */
  get_view_legend_state(opt) {
    return getViewLegendState(opt.idView);
  }

  /**
   * Retrieves the values from the legend.
   *
   * For numeric rules, the method returns an array of range arrays ([from, to]),
   * otherwise, it just returns an array of values.
   *
   * @param {Object} opt options
   * @param {String|Object} opt.idView - The view id containing the legend instance.
   * @returns {Array} An array of checked values. For numeric rules, each entry is an array of format [from, to].
   *
   * @example
   * // Non-numeric rules
   * get_view_legend_values({view:"123"}); // e.g. ["value1", "value2", ...]
   *
   * // Numeric rules
   * get_view_legend_values({view:"123"}); // e.g. [[0, 10], [10, 20], ...]
   */
  get_view_legend_values(opt) {
    return getViewLegendValues(opt.idView);
  }

  /**
   * Set view layer z position
   * @param {Object} opt Options
   * @param {String[]} opt.order View order
   * @param {String} opt.orig Optional label for origin / logs
   * @return {Boolean} Done
   * @example
   * const views = await mapx.ask("get_views_with_visible_layer");
   * const order = views.toReversed();
   * const result = await mapx.ask("set_views_layer_order",{order});
   */
  set_views_layer_order(opt) {
    opt = Object.assign({}, { order: null, orig: "sdk" }, opt);
    return viewsLayersOrderUpdate(opt);
  }

  /**
   * Get list views with visible layers
   * @return  {Array} Array of views
   */
  get_views_layer_order() {
    return getViewsLayersVisibles(true);
  }

  /**
   * Get list views with visible layers (alias)
   * @return  {Array} Array of views
   */
  get_views_with_visible_layer() {
    return getViewsLayersVisibles(true);
  }

  /**
   * Filter view layer by text (if attribute is text)
   * @param {Options} opt Options
   * @param {String} opt.idView View id
   * @param {array} opt.values Values to use as filter
   * @param {string} opt.attribute Attribute to use as filter (default from style)
   * @return {void}
   */
  async set_view_layer_filter_text(opt) {
    const rslv = this;
    if (settings.mode.static) {
      viewSetTextFilter(opt);
    } else {
      await rslv._apply_filter_layer_select("searchBox", "setValue", opt);
    }
  }

  /**
   * Get current text filter values for a given view
   * @param {String} opt.idView View id
   * @param {Options} opt Options
   * @return {array} values
   */
  get_view_layer_filter_text(opt) {
    return viewGetTextFilterValues(opt);
  }

  /**
   * Filter view layer by numeric (if attribute is numeric)
   * @param {Options} opt Options
   * @param {String} opt.idView Target view id
   * @param {String} opt.attribute Attribute name (default from style)
   * @param {Numeric} opt.from Value
   * @param {Numeric} opt.to Value
   * @param {array} opt.value Values (Deprecated)
   * @return {void}
   */
  async set_view_layer_filter_numeric(opt) {
    const rslv = this;
    if (opt.value) {
      opt.from = Math.min(...opt.value);
      opt.to = Math.max(...opt.value);
    }
    if (settings.mode.static) {
      viewSetNumericFilter(opt);
    } else {
      await rslv._apply_filter_layer_slider("numericSlider", "set", opt);
    }
  }

  /**
   * Get current numeric slider value
   * @param {Options} opt Options
   * @param {String} opt.idView Target view id
   * @return {Number|Array} values
   */
  get_view_layer_filter_numeric(opt) {
    return viewGetNumericFilterValues(opt);
  }

  /**
   * Filter view layer by time ( if posix mx_t0 and/or mx_t1 attributes exist )
   *
   * This function creates a time filter based on the provided options
   * and sets this filter to the specific view identified by its ID.
   *
   * @param {Object} opt - The options for the time filter.
   * @param {boolean} opt.hasT0 - Flag indicating if the 'mx_t0' timestamp exists.
   * @param {boolean} opt.hasT1 - Flag indicating if the 'mx_t1' timestamp exists.
   * @param {number} opt.from - The 'from' timestamp for the filter in milliseconds.
   * @param {number} opt.to - The 'to' timestamp for the filter in milliseconds.
   * @param {string} opt.idView - The ID of the view to which the filter is to be applied.
   * @return {void}
   * @example
   * // Get summary ( any attribute: get_view_source_summary returns time extent
   * // by default )
   * const summary = await mapx.ask("get_view_source_summary", {
   *  idView,
   *  idAttr: idAttr,
   *  });
   * // set config + convert seconds -> milliseconds
   * const start = summary.extent_time.min * 1000;
   * const end = summary.extent_time.max * 1000;
   * const hasT0 = summary.attributes.includes("mx_t0");
   * const hasT1 = summary.attributes.includes("mx_t1");
   * await mapx.ask("set_view_layer_filter_time", {
   *  idView,
   *  from,
   *  to,
   *  hasT0,
   *  hasT1,
   * });
   */
  async set_view_layer_filter_time(opt) {
    const rslv = this;
    if (settings.mode.static) {
      viewSetTimeFilter(opt);
    } else {
      await rslv._apply_filter_layer_slider("timeSlider", "set", opt);
    }
  }

  /**
   * Get current time slider value
   * @param {Options} opt Options
   * @param {String} opt.idView Target view id
   * @return {Number|Array} values
   */
  get_view_layer_filter_time(opt) {
    return viewGetTimeFilterValues(opt);
  }

  /**
   * Set layer transarency (0 : visible, 100 : 100% transparent)
   * @param {Options} opt Options
   * @param {String} opt.idView Target view id
   * @param {Numeric} opt.value Value
   * @return {void}
   */
  async set_view_layer_transparency(opt) {
    const rslv = this;
    if (settings.mode.static) {
      viewSetOpacity(opt);
    } else {
      await rslv._apply_filter_layer_slider("transparencySlider", "set", opt);
    }
  }

  /**
   * Get current transparency value for layers of a view
   * @param {Options} opt Options
   * @param {String} opt.idView Target view id
   * @return {Number} value
   */
  get_view_layer_transparency(opt) {
    return viewGetOpacityValue(opt);
  }

  /**
   * Add a view
   * @param {Object} opt Options
   * @param {String} opt.idView Target view id
   * @param {Boolean} opt.zoomToView Fly to view extends
   * @return {Promise<Boolean>} done
   */
  async view_add(opt) {
    const rslv = this;
    opt = Object.assign({}, { idView: null, zoomToView: false }, opt);
    const view = getView(opt.idView) || (await getViewRemote(opt.idView));
    const valid = isView(view);
    if (!valid) {
      return rslv._err("err_view_invalid");
    }
    const addViewToList =
      !settings.mode.static && (!view._vb) instanceof ViewBase;

    if (addViewToList) {
      await viewsListAddSingle(view, { open: true });
    } else {
      await viewAdd(view);
    }

    if (opt.zoomToView) {
      const bounds = await getViewsBounds(view);
      const ok = fitMaxBounds(bounds);
      return ok;
    }
    return true;
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
   * Spotlight vector feature : Enable, disable, toggle
   * @param {Object} opt Options
   * @param {Boolean} opt.enable Enable or disable. If not set, toggle spotlight
   * @param {Number} opt.nLayers Numbers of layer that are used in the overlap tool. If not set, the default is 1 : any visible feature is spotlighted. If 0 = only part where all displayed layers are overlapping are spotligthed
   * @param {Boolean} opt.calcArea Estimate area covered by visible feature and display result in MapX interface
   * @return {Object} options realised {enable:<false/true>,calcArea:<true/false>,nLayers:<n>}
   */
  set_vector_spotlight(opt) {
    return toggleSpotlight(opt);
  }
  set_vector_highlight(opt) {
    console.warn("Deprecated. Use set_vector_spotlight instead");
    return toggleSpotlight(opt);
  }

  /**
   * Set the highlighter with the provided options.
   *
   * @param {Object} opt - Configuration options for the highlighter.
   * @param {(PointLike | Array<PointLike>)?} config.point Location to query
   * @param {Array.<Object>} opt.filters - Array of filter objects to be applied.
   * @param {String} opt.filters[].id - Identifier of the view to which the filter applies.
   * @param {Array} opt.filters[].filter - MapboxGl filter expression 
   * @returns {number} Feature count
   * @example
   * mapx.ask('set_highlighter',{
   *   all: true,
   * });
   * 
   * mapx.ask('set_highlighter',{
   *   filters: [
   *     { id: "MX-TC0O1-34A9Y-RYDJG", filter: ["<", ["get", "year"], 2000] },
   *   ],
   * });
   * 
   * mapx.ask('set_highlighter',{
   *   filters: [
   *     { id: "MX-TC0O1-34A9Y-RYDJG", filter: [">=", ["get", "fatalities"], 7000] },
   *   ],
   * });
   * 
   * mapx.ask('set_highlighter',{
   *   filters: [
   *     {
   *       id: "MX-TC0O1-34A9Y-RYDJG",
   *       filter: [
   *         "in",
   *         ["get", "country"],
   *         ["literal", ["Nigeria", "Gabon", "Angola"]],
   *       ],
   *     },
   *   ],
   * });

   */
  set_highlighter(opt) {
    return highlighter.set(opt);
  }

  /**
   * Update highlighter using previous configuration i.e refresh features
   * @returns {number} Feature count
   */
  update_highlighter() {
    return highlighter.update();
  }

  /**
   * Clear all highlighted features and reset config
   * @returns {number} Feature count
   */
  reset_highlighter() {
    return highlighter.reset();
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
      opt,
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
      opt,
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
      opt,
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
   * Set current map bounds
   * @param {Object} opt Options
   * @param {array} opt.bounds [west, south, east, north]
   */
  map_set_bounds_array(opt) {
    return fitMaxBounds(opt.bounds);
  }

  /**
   * Get current max bounds / world
   * @return {Array|null} bounds [west, south, east, north] or null
   */
  map_get_max_bounds_array() {
    const map = getMap();
    const maxBounds = map.getMaxBounds();
    if (!maxBounds) {
      return null;
    }
    return [
      maxBounds.getWest(),
      maxBounds.getSouth(),
      maxBounds.getEast(),
      maxBounds.getNorth(),
    ];
  }

  /**
   * Set current max bounds / world
   * @param {Object} opt Options
   * @param {array} opt.bounds [west, south, east, north] If empty or null = reset
   * @return {boolean} done
   */
  map_set_max_bounds_array(opt) {
    opt = Object.assign({}, { bounds: null }, opt);
    const map = getMap();
    if (opt.bounds) {
      opt.bounds = validateBounds(opt.bounds);
    }
    map.setMaxBounds(opt.bounds);
    return true;
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
