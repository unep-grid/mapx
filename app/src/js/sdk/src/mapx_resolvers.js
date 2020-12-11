/**
 * Shortcut for helpers
 * @ignore
 */
let h;

/**
 * Class to handle MapX specific method
 */
class MapxResolvers {
  constructor(opt) {
    const rslv = this;
    rslv.opt = Object.assign({}, opt);
    if (!rslv.opt.helpers) {
      throw new Error('mx.helpers not found');
    }
    h = rslv.opt.helpers;
  }

  /**
   * Set panel visibility
   * @param {Object} opt Options
   * @param {String} opt.panel Name of the panel (views, tools)
   * @param {Boolean} opt.show If true, show the panel (and hide other)
   * @param {Boolean} opt.toggle Toggle the panel
   * @return {Boolean} done
   */
  set_panel_left_visibility(opt) {
    opt = Object.assign({panel: 'views', show: true, toggle: false}, opt);
    h.panelLeftSwitch(opt);
    return true;
  }

  has_dashboard() {
    return !!mx.dashboard && !mx.dashboard._destroyed;
  }

  /**
   * Toogle immersive mode
   * @aram {Object} opt Options
   * @param {Boolean} opt.enable Force enable
   * @param {Boolean} opt.toggle Toggle
   * @return {Boolean} enabled
   */
  set_immersive_mode(opt) {
    h.setImmersiveMode(opt);
  }

  /**
   * Get immersive mode state
   * @return {Boolean} Enabled
   */
  get_immersive_mode() {
    return h.getImmersiveMode();
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
      return mx.theme.setColorsByThemeId(opt.idTheme);
    } else if (opt.colors) {
      return mx.theme.setColors(opt.colors);
    }
  }

  /**
   * Get themes id
   * @return {Array} array of themes id
   */
  get_themes_id() {
    return mx.themes.getThemesIdList();
  }

  /**
   * Get all themes
   * @return {Object} Themes object with themes id as key
   */
  get_themes() {
    return mx.themes.getThemes();
  }

  /**
   * Get current theme id
   * @return {string} Theme id
   */
  get_theme_id() {
    return mx.themes.id_theme;
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
    opt = Object.assign({show: true, toggle: false}, opt);
    if (rslv.has_dashboard()) {
      if (opt.toggle === true) {
        mx.dashboard.toggle();
      } else if (opt.show === true) {
        mx.dashboard.show();
      } else {
        mx.dashboard.hide();
      }
      return true;
    }
    return false;
  }

  /**
   * Check if the dashboard is visible
   * @return {Boolean} The dashboard is visible
   */
  is_dashboard_visible() {
    const rslv = this;
    return rslv.has_dashboard() && mx.dashboard.isVisible();
  }

  /**
   * Get source metadata
   * @param {Object} opt Options
   * @param {String} opt.idSource Id of the source
   * @return {Object} Source MapX metadata
   */
  get_source_meta(opt) {
    return h.getSourceMetadata(opt.idSource, opt.force);
  }

  /**
   * Get user id
   * @return {Number} Current user id
   */
  get_user_id() {
    return mx.settings.user.id;
  }

  /**
   * Get user ip info
   * @return {Object} Current user ip object (ip, country, region, etc)
   */
  async get_user_ip() {
    const rs = await fetch('https://api.mapx.org/get/ip');
    return rs.json();
  }

  /**
   * Get user roles
   * @return {Object} Current user roles
   */
  get_user_roles() {
    return mx.settings.user.roles;
  }
  /**
   * Check if user as given role
   * @param {Object} opt Options
   * @param {String|Array} opt.role Role(s) to check
   * @param {Boolean} opt.all all roles must match, else at least one
   * @return {Boolean} has role(s)
   */
  check_user_role(opt) {
    const rslv = this;
    opt = Object.assign({}, {role: ['public'], all: true}, opt);
    if (h.isString(opt.role)) {
      opt.role = [opt.role];
    }
    const all = opt.all === true;
    const roles = rslv.get_user_roles();
    return opt.role.reduce((a, c) => {
      const ok = roles.groups.indexOf(c) > -1;
      if (all) {
        return ok && a;
      } else {
        return a ? a : ok;
      }
    }, false);
  }
  /**
   * Check for any matching roles, send an error if it does not match
   * @param {Array} roleReq Array of required role. eg. ['members','admins']
   * @param {Object} opt Options
   * @param {Boolean} opt.reportError Report an error if no match (default true)
   * @param {Any} opt.id An identifier
   * @return {Boolean} matched
   */
  check_user_role_breaker(roleReq, opt) {
    const rslv = this;
    opt = Object.assign({}, {reportError: true, id: null}, opt);
    roleReq = roleReq || [];
    const pass = rslv.check_user_role({role: roleReq, all: false});
    if (!pass && opt.reportError) {
      rslv._err('err_tool_roles_not_match', {
        idTool: opt.id,
        roles: JSON.stringify(roleReq)
      });
    }
    return pass;
  }

  /**
   * Get user email
   * @return {String} Current user email ( if logged, null if not)
   */
  get_user_email() {
    return mx.settings.user.guest ? '' : mx.settings.user.email;
  }

  /**
   * Set project
   * @param {Object} opt options
   * @param {String} opt.idProject Id of the project to switch to
   * @return {Boolean} Done
   */
  async set_project(opt) {
    opt = Object.assign({}, {idProject: null}, opt);
    return h.setProject(opt.idProject);
  }

  /**
   * Get current language
   * @return {String} Two letters language code
   */
  get_language() {
    return mx.settings.language;
  }

  /**
   * Setlanguage
   * @param {Object} opt Options
   * @param {String} opt.lang Two letters language code
   * @return {Boolean} Laguage change process finished
   */
  set_language(opt) {
    return h.updateLanguage(opt);
  }

  /**
   * Get list of supported current languages
   * @return {Array} Array of two letters language code
   */
  get_languages() {
    return mx.settings.languages;
  }

  /**
   * Get projects list
   * @param {Object} opt Project fetching option
   * @return {Array} list of project for the current user, using optional filters
   */
  get_projects(opt) {
    return h.fetchProjects(opt);
  }

  /**
   * Get current project id
   * @return {String} Current project id
   */
  get_project() {
    return mx.settings.project.id;
  }

  /**
   * Get list of collection for the current project
   * @param {Object} opt Options
   * @param {Boolean} opt.open Return only collections from open views
   * @return {Array} Array of collections names
   */
  get_project_collections(opt) {
    return h.getProjectViewsCollections(opt);
  }

  /**
   * Test if the current user is guest
   * @return {Boolean} User is guest
   */
  is_user_guest() {
    return mx.settings.user.guest === true;
  }

  /**
   * Get list of available views as static objects
   * @return  {Array} Array of views
   */
  get_views() {
    return h.getViewsForJSON();
  }

  /**
   * Get list views with visible layers
   * @return  {Array} Array of views
   */
  get_views_with_visible_layer() {
    return h.getViewsLayersVisibles();
  }

  /**
   * Get list of available views id
   * @return  {Array} Array of id
   */
  get_views_id() {
    return h.getViewsForJSON().map((v) => v.id);
  }

  /**
   * Get list of available views id
   * @return  {Array} Array of id
   */
  get_views_id_open() {
    return h.getViewsOpen();
  }

  /**
   * Get vector view (vt) metadata of the attribute
   * @param {Object} opt Options
   * @param {String} opt.idView Id of the view
   * @return {Object} attribut metadata
   */
  get_view_meta_vt_attribute(opt) {
    opt = Object.assign({}, {idView: null}, opt);
    const view = h.getView(opt.idView);
    if (h.isView(view)) {
      return h.path(view, 'data.attribute', {});
    }
  }

  /**
   * Get view metadata
   * @param {Object} opt options
   * @param {String} opt.idView Id of the view
   * @param {Object} view meta data object
   * @return {Object} view metadata
   */
  get_view_meta(opt) {
    opt = Object.assign({}, {idView: null}, opt);
    return h.getViewMetadata(opt.idView, true);
  }

  /**
   * Get view table attribute config
   * @param {Object} opt options
   * @param {String} opt.idView Id of the view
   * @return {Object}
   */
  get_view_table_attribute_config(opt) {
    opt = Object.assign({}, {idView: null}, opt);
    let out = null;
    if (opt.idView) {
      const view = h.getView(opt.idView);
      const config = h.getTableAttributeConfigFromView(view);
      out = {};
      ['attributes', 'idSource', 'labels'].forEach((key) => {
        out[key] = config[key];
      });
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
    opt = Object.assign({}, {idView: null}, opt);
    let out = null;
    const rslv = this;
    const config = rslv.get_view_table_attribute_config(opt);
    if (config) {
      let url_qs = `?id=${config.idSource}&attributes=${config.attributes.join(
        ','
      )}`;
      out = h.getApiUrl('getSourceTableAttribute') + url_qs;
    }
    return out;
  }

  /**
   * Get view table attribute
   * @param {Object} opt options
   * @param {String} opt.idView Id of the view
   * @return {Object}
   */
  async get_view_table_attribute(opt) {
    opt = Object.assign({}, {idView: null}, opt);
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
    return h.getViewLegendImage({view: opt.idView, format: opt.format});
  }

  /**
   * Filter view layer by text (if attribute is text)
   * @param {Options} opt Options
   * @return {Boolean} done
   */
  set_view_layer_filter_text(opt) {
    return this._apply_filter_layer_select.bind(this)(
      'searchBox',
      'setValue',
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
      'searchBox',
      'getValue',
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
      'numericSlider',
      'set',
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
    return this._apply_filter_layer_slider.bind(this)('timeSlider', 'set', opt);
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
      'transparencySlider',
      'set',
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
    return this._apply_filter_layer_slider.bind(this)('numericSlider', 'get');
  }

  /**
   * Get current time slider value
   * @param {Options} opt Options
   * @param {String} opt.idView Target view id
   * @return {Number|Array} values
   */
  get_view_layer_filter_time() {
    return this._apply_filter_layer_slider.bind(this)('timeSlider', 'get');
  }

  /**
   * Get current transparency value for layers of a view
   * @param {Options} opt Options
   * @param {String} opt.idView Target view id
   * @return {Number} value
   */
  get_view_layer_transparency() {
    return this._apply_filter_layer_slider.bind(this)(
      'transparencySlider',
      'get'
    );
  }

  /**
   * Add a view
   * @param {Object} opt Options
   * @param {String} opt.idView Target view id
   * @return {Boolean} done
   */
  view_add(opt) {
    opt = Object.assign({}, {idView: null}, opt);
    const rslv = this;
    const view = h.getView(opt.idView);
    const valid = h.isView(view);
    if (valid) {
      return h.viewAdd(view);
    } else {
      return rslv._err('err_view_invalid');
    }
  }

  /**
   * remove a view
   * @param {Object} opt Options
   * @param {String} opt.idView Target view id
   * @return {Boolean} done
   */
  view_remove(opt) {
    opt = Object.assign({}, {idView: null}, opt);
    const rslv = this;
    const view = h.getView(opt.idView);
    const valid = h.isView(view);
    if (valid) {
      return h.viewRemove(view);
    } else {
      return rslv._err('err_view_invalid');
    }
  }

  /**
   * Get the download link of the raster source
   * @param {Object} opt Options
   * @param {String} opt.idView Raster view id
   * @return {Object} input options, with new key : url. E.g. {idView:<abc>,url:<url>}
   */
  download_view_source_raster(opt) {
    return h.downloadViewRaster(opt);
  }

  /**
   * Open the download modal for vector views
   * @param {Object} opt Options
   * @param {String} opt.idView Vector view id
   * @return {Object} input options E.g. {idView:<abc>}
   */
  download_view_source_vector(opt) {
    return h.downloadViewVector(opt);
  }

  /**
   * Get the data from geojson view or download geojsn as a file
   * @param {Object} opt Options
   * @param {String} opt.idView GeoJSON view id
   * @param {String} opt.mode "file" or "data"
   * @return {Object} input options E.g. {idView:<abc>, data:<data (if mode = data)>}
   */
  download_view_source_geojson(opt) {
    return h.downloadViewGeoJSON(opt);
  }

  /**
   * Show the login modal window
   * @return {Boolean} done
   */
  show_modal_login() {
    const rslv = this;
    return rslv._shiny_input('btn_control', {value: 'showLogin'});
  }

  /**
   * Show view meta modal window
   * @return {Boolean} done
   */
  show_modal_view_meta(opt) {
    opt = Object.assign({}, {idView: null}, opt);
    const view = h.getView(opt.idView);
    const rslv = this;
    const valid = h.isView(view);
    if (valid) {
      h.viewToMetaModal(view);
      return true;
    } else {
      return rslv._err('err_view_invalid');
    }
  }

  /**
   * Show view edit modal window
   * @return {Boolean} done
   */
  show_modal_view_edit(opt) {
    const rslv = this;
    const pass = rslv.check_user_role_breaker(['publisher']);
    if (!pass) {
      return;
    }
    opt = Object.assign({}, {idView: null}, opt);
    const view = h.getView(opt.idView);
    const valid = h.isView(view);
    const editable = valid && view._edit === true;
    if (valid && editable) {
      rslv._shiny_input('mx_client_view_action', {
        action: 'btn_opt_edit_config',
        target: opt.idView
      });
      return true;
    } else {
      if (!editable && valid) {
        return rslv._err('err_view_not_editable');
      } else {
        return rslv._err('err_view_invalid');
      }
    }
  }

  /**
   * Show map composer
   * @return {Boolean} done
   */
  show_modal_map_composer() {
    return h.mapComposerModalAuto();
  }

  /**
   * Show sharing modal window
   * @param {Object} opt Options
   * @param {String} opt.idView Id view to share
   * @return {Boolean} Done
   */
  show_modal_share(opt) {
    opt = Object.assign({}, opt);
    const rslv = this;
    const view = h.getView(opt.idView);
    const isView = opt.idView && h.isView(view);
    if (isView) {
      return rslv._shiny_input('mx_client_view_action', {
        action: 'btn_opt_share',
        target: opt.idView
      });
    } else {
      return rslv._shiny_input('btnIframeBuilder');
    }
  }

  /**
   * Show modal for tools
   * @param {Object} opt Options
   * @param {String} opt.tool Id of the tools
   * @param {Boolean} opt.list Return a list of tools
   * @return {Boolean | Array} Done or the list of tools
   */
  show_modal_tool(opt) {
    const rslv = this;
    opt = Object.assign({}, opt);
    const tools = {
      sharing_manager: {
        roles: ['public'],
        id: 'btnIframeBuilder'
      },
      view_new: {
        roles: ['publishers', 'admins'],
        id: 'btnAddView'
      },
      source_validate_geom: {
        roles: ['publishers', 'admins'],
        id: 'btnValidateSourceGeom'
      },
      source_overlap_utilities: {
        roles: ['publishers', 'admins'],
        id: 'btnAnalysisOverlap'
      },
      source_edit: {
        roles: ['publishers', 'admins'],
        id: 'btnEditSources'
      },
      source_metadata_edit: {
        roles: ['publishers', 'admins'],
        id: 'btnEditSourcesMetadata'
      },
      source_upload: {
        roles: ['publishers', 'admins'],
        id: 'btnUploadSourceApi'
      },
      db_temporary_connect: {
        roles: ['publishers', 'admins'],
        id: 'btnShowDbInfoSelf'
      },
      project_external_views: {
        roles: ['publishers', 'admins'],
        id: 'btnShowProjectExternalViews'
      },
      project_config: {
        roles: ['admins'],
        id: 'btnShowProjectConfig'
      },
      project_invite_new_member: {
        roles: ['admins'],
        id: 'btnShowInviteMember'
      },
      project_define_roles: {
        roles: ['admins'],
        id: 'btnShowRoleManager'
      }
    };

    if (opt.list) {
      return Object.keys(tools);
    }
    const conf = tools[opt.tool];

    if (!conf) {
      rslv._err('err_tool_not_found', {
        idTool: opt.tool || 'null'
      });
      return false;
    }

    const pass = rslv.check_user_role_breaker(conf.roles, {
      id: opt.tool
    });

    if (pass) {
      rslv._shiny_input(conf.id, {randomNumber: true});
      return true;
    }
    return false;
  }

  /**
   * close all modal windows
   * @return {Boolean} done
   */
  close_modal_all() {
    h.modalCloseAll();
    return true;
  }

  /**
   * Toggle draw mode
   */
  toggle_draw_mode() {
    return h.drawModeToggle();
  }

  /**
   * Get views current absolute order (without groups)
   * @return {Array}
   */
  get_views_order() {
    return h.getViewsOrder();
  }

  /**
   * Get views list state
   * @return {Array}
   */
  get_views_list_state() {
    const v = h.getMapData().viewsList;
    return v.getState();
  }

  /**
   * Set views list filter (ui)
   * @param {Object} opt options
   * @param {Boolean} opt.reset Reset and remove all rules
   * @param {Array} opt.rules Array of filter object. e.g. {type:'text',value:'marine'}
   * @param {Boolean} opt.mode Set mode : 'intersection' or 'union';
   * @example
   * // reset all rules
   * mapx.ask('set_views_list_filter',{
   *    reset:true
   * })
   *
   * // Reset rules and filter views with a dashboard
   * mapx.ask('set_views_list_filter',{
   *    reset: true,
   *    rules : [{
   *    type : 'view_components,
   *    value:'dashboard'
   *    }]
   * })
   *
   * // All views with marine or earth in title or abstract or vector views or raster views
   * mapx.ask('set_views_list_filter',{
   *    rules:
   *     [
   *      {
   *           type: 'text',
   *           value: 'marine or earth'
   *       },
   *       {
   *           type: 'view_components',
   *           value: ['vt','rt']
   *       }
   *     ],
   *     mode: 'union'
   *   })
   * @return {Boolean} done
   */
  set_views_list_filters(opt) {
    opt = Object.assign({}, {rules: [], mode: 'intersection'}, opt);
    const vf = h.getMapData().viewsFilter;
    vf.filterCombined(opt);
    return vf.getRules();
  }

  /**
   * Get views list filter rules
   * @return {Array} Rule list
   */
  get_views_list_filters() {
    const vf = h.getMapData().viewsFilter;
    return vf.getRules();
  }

  /**
   * Get list of views title
   * @param {Object} opt options
   * @param {Array} opt.views List of views or views id
   * @return {Array} Array of titles (string)
   */
  get_views_title(opt) {
    opt = Object.assign({}, {views: [], lang: 'en'}, opt);
    return h.getViewsTitleNormalized(opt.views);
  }

  /**
   * Set state / views list order, groups, etc. Opened view will be closed
   * @param {Object} opt Options
   * @param {Array} opt.state Mapx views list state
   * @return {Boolean} Done
   */
  set_views_list_state(opt) {
    const v = h.getMapData().viewsList;
    v.setState({
      render: false,
      state: opt.state,
      useStateStored: false
    });
    return true;
  }

  /**
   * Set views list order
   * @param {Object} opt Options
   * @param {Boolean} opt.asc Asc
   * @param {String} opt.mode Mode : 'string' or 'date';
   * @return {Boolean} Done
   */
  set_views_list_sort(opt) {
    const v = h.getMapData().viewsList;
    /**
     * Sort group -> trigger viewsLayersOrderUpdate -> fire 'layers_ordered'
     */
    const prom = new Promise((resolve) => {
      mx.events.on({
        type: 'layers_ordered',
        idGroup: 'sdk_resolver',
        callback: resolve
      });
    });
    v.sortGroup(null, opt);
    return prom;
  }

  /**
   * Move view on top of its group
   * @param {Object} opt Options
   * @param {Sring} opt.idView
   * @return {Boolean} Done
   */
  move_view_top(opt) {
    const v = h.getMapData().viewsList;
    v.moveTargetTop(opt.idView);
    return true;
  }
  /**
   * Move view on the bottom of its group
   * @param {Object} opt Options
   * @param {Sring} opt.idView
   * @return {Boolean} Done
   */
  move_view_bottom(opt) {
    const v = h.getMapData().viewsList;
    v.moveTargetBottom(opt.idView);
    return true;
  }
  /**
   * Move view after anoter view
   * @param {Object} opt Options
   * @param {Sring} opt.idView
   * @param {Sring} opt.idViewAfter
   * @return {Boolean} Done
   */
  move_view_after(opt) {
    const v = h.getMapData().viewsList;
    v.moveTargetAfter(opt.idView, opt.idViewAfter);
    return true;
  }
  /**
   * Move view before another view
   * @param {Object} opt Options
   * @param {Sring} opt.idView
   * @param {Sring} opt.idViewBefore
   * @return {Boolean} Done
   */
  move_view_before(opt) {
    const v = h.getMapData().viewsList;
    v.moveTargetBefore(opt.idView, opt.idViewBefore);
    return true;
  }
  /**
   * Move view up
   * @param {Object} opt Options
   * @param {Sring} opt.idView
   * @return {Boolean} Done
   */
  move_view_up(opt) {
    const v = h.getMapData().viewsList;
    v.moveTargetUp(opt.idView);
    return true;
  }
  /**
   * Move view down
   * @param {Object} opt Options
   * @param {Sring} opt.idView
   * @return {Boolean} Done
   */
  move_view_down(opt) {
    const v = h.getMapData().viewsList;
    v.moveTargetDown(opt.idView);
    return true;
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
    return h.toggleSpotlight(opt);
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
    const id = `MX-GJ-${h.makeId(10)}`;
    opt = Object.assign(
      {},
      {
        data: null,
        save: false,
        fileType: 'geojson',
        fileName: id,
        title: id,
        abstract: id
      },
      opt
    );
    if (opt.random && !opt.data) {
      opt.data = h.getGeoJSONRandomPoints(opt.random);
    }
    const view = await h.spatialDataToView(opt);
    await h.viewsListAddSingle(view, {open: true});
    const out = h.getViewJson(view, {asString: false});
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
    opt = Object.assign({}, {idView: null, layout: {}, paint: {}}, opt);
    const rslv = this;
    const map = h.getMap();
    const layer = map.getLayer(opt.idView);
    const paintProp = Object.keys(opt.paint);
    const layoutProp = Object.keys(opt.layout);
    if (!layer) {
      return rslv._err('err_layer_not_found', {idView: opt.idView});
    }

    if (paintProp.length > 0) {
      paintProp.forEach((p) => {
        map.setPaintProperty(opt.idView, p, opt.paint[p]);
      });
    }
    if (layoutProp.length > 0) {
      layoutProp.forEach((p) => {
        map.setLayoutProperty(opt.idView, p, opt.layout[p]);
      });
    }
  }

  /**
   * Delete view geojson
   * Works with all view, but not permanently.
   * @param {Object} opt Options
   * @param {String} opt.idView Id of the geojson view to delete.
   * @return {Boolean} done
   */
  view_geojson_delete(opt) {
    return h.viewDelete({
      idView: opt.idView
    });
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
    return h.setClickHandler({
      type: 'sdk',
      enable: opt.enable,
      toggle: opt.toggle
    });
  }

  /**
   * Get map feature click handlers id
   * @return {Array} Enabled modes
   */
  get_features_click_handlers() {
    return h.getClickHandler();
  }

  /**
   * MAPBOX direct binding
   */

  /**
   * Map flyTo position with flying animation
   * @param {Object} opt Options see https://docs.mapbox.com/mapbox-gl-js/api/map/#map#flyto
   * @example mapx.ask('map_fly_to',{center:[46,23], zoom:5});
   * @return {Boolean} Move ended
   */
  map_fly_to(opt) {
    const rslv = this;
    const map = h.getMap();
    return rslv._map_resolve_when('moveend', () => {
      map.flyTo(opt);
    });
  }

  /**
   * Map jumpTo position, without animation
   * @param {Object} opt Options see https://docs.mapbox.com/mapbox-gl-js/api/map/#map#jumpto
   * @example mapx.ask('set_map_jump_to',{lat:46,lng:23, zoom:5});
   * @return {Boolean} Move ended
   */
  map_jump_to(opt) {
    const rslv = this;
    const map = h.getMap();
    return rslv._map_resolve_when('moveend', () => {
      map.jumpTo(opt);
    });
  }

  /**
   * Get current map zoom
   * @return {Float} zoom
   */
  map_get_zoom() {
    const map = h.getMap();
    return map.getZoom();
  }

  /**
   * Get current map center
   * @return {Array} center
   */
  map_get_center() {
    const map = h.getMap();
    map.getCenter();
  }

  /**
   * NOTE: let users add any layer and source ?
   * Add geojson to the map
   * @param {String} id Source id
   * @param {Object} source Source config
   * @ignore
   *
   * map_add_source(id, source) {
   * const rslv = this;
   * const map = h.getMap();
   * rslv._map_resolve_when('sourcedata', () => {
   *   map.addSource(id, source);
   * });
   *  }
   * Add layer to the map
   * @param {Object} layer Layer config
   *
   * map_add_layer(layer, before) {
   * const rslv = this;
   * const map = h.getMap();
   * rslv._map_resolve_when('styledata', () => {
   *   map.addLayer(layer, before || 'mxlayers');
   * });
   * }
   */

  /**
   * List resolvers methods
   * @return {Array} array of supported methods
   */
  get_sdk_methods() {
    const rslv = this;
    const reg = new RegExp('^_');
    const protos = Object.getPrototypeOf(rslv);
    const methods = Object.getOwnPropertyNames(protos).reduce((a, m) => {
      if (!m.match(reg)) {
        a.push(m);
      }
      return a;
    }, []);
    methods.splice(0, 1);
    return methods;
  }

  /**
   * Bind worker
   * @ignore
   * @param {FrameWorker} fw FrameWorker
   */
  _bind(fw) {
    this._fw = fw;
  }

  /**
   * Helper to work with sliders
   * @ignore
   */
  async _apply_filter_layer_slider(type, method, opt) {
    opt = Object.assign({}, {idView: null, value: null}, opt);
    const rslv = this;
    const view = h.getView(opt.idView);
    await h.viewFilterToolsInit(view);
    const valid =
      h.isView(view) &&
      h.isObject(view._filters_tools) &&
      h.isObject(view._filters_tools[type]) &&
      h.isFunction(view._filters_tools[type][method]);

    if (valid) {
      return view._filters_tools[type][method](opt.value);
    } else {
      return rslv._err('err_view_invalid');
    }
  }

  /**
   * Helper to work with selectize
   * @ignore
   */
  async _apply_filter_layer_select(type, method, opt) {
    type = type || 'searchBox'; // selectize;
    opt = Object.assign({}, {idView: null, value: null}, opt);
    const rslv = this;
    const view = h.getView(opt.idView);
    await h.viewFilterToolsInit(view);
    const valid =
      h.isView(view) &&
      h.isObject(view._filters_tools) &&
      h.isObject(view._filters_tools[type]) &&
      h.isFunction(view._filters_tools[type][method]);

    if (valid) {
      return view._filters_tools[type][method](opt.value);
    } else {
      return rslv._err('err_view_invalid');
    }
  }
  /**
   * Helper to work with shiny
   * @ignore
   */
  _shiny_input(id, opt) {
    if (mx.settings.mode.app) {
      opt = Object.assign({time: new Date()}, opt);
      if (opt.randomNumber) {
        opt = Math.ceil(Math.random() * 1000);
      }
      Shiny.onInputChange(id, opt);
    } else {
      return rslv._err('err_not_available_mode', {
        mode: JSON.stringify(mx.settings.mode)
      });
    }
    return true;
  }
  /**
   * Error handling
   * @ignore
   */
  _err(key, vars) {
    const rslv = this;
    rslv._fw.postMessage({
      level: 'error',
      key: key,
      vars: vars
    });
  }

  /**
   * Promisify mapbox method
   * @param {String} type of event to listen to resolve the promise
   * @param {Function} cb Function to wrap
   * @ignore
   */
  _map_resolve_when(type, cb) {
    const map = h.getMap();
    return new Promise((resolve) => {
      map.stop();
      map.once(type, () => {
        resolve(true);
      });
      cb();
    });
  }

  /**
   * Get random view
   * @param {Object} opt Options
   * @param {String} opt.type of view
   * @param {Function} opt.filter Filter view by using further validation
   * @return view
   * @ignore
   */
  async _get_random_view(opt) {
    opt = Object.assign({}, {type: ['vt', 'rt']}, opt);
    let views = h.getViews();
    if (opt.type) {
      views = views.reduce((a, v) => {
        if (h.isViewType(v, opt.type, opt.filter)) {
          a.push(v);
        }
        return a;
      }, []);
    }
    const pos = Math.floor(Math.random() * (views.length - 1));
    return h.getViewJson(views[pos], {asString: false});
  }
}

export {MapxResolvers};
