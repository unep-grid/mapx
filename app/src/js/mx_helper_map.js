/* jshint evil:true, esversion:6, laxbreak:true */
import Sortable from 'sortablejs';

export function degreesToMeters(lngLat) {
  var x = (lngLat.lng * 20037508.34) / 180;
  var y =
    Math.log(Math.tan(((90 + lng.lat) * Math.PI) / 360)) / (Math.PI / 180);
  y = (y * 20037508.34) / 180;
  return {
    x: x,
    y: y
  };
}

export function metersToDegrees(point) {
  var lng = (point.x * 180) / 20037508.34;
  var lat =
    (Math.atan(Math.exp((point.y * Math.PI) / 20037508.34)) * 360) / Math.PI -
    90;
  return {
    lat: lat,
    lng: lng
  };
}

/**
 * Get url for api
 * @param {String} id Id of the url route : views,tiles, downloadSourceCreate,downloadSourceGet, etc.
 */
export function getApiUrl(id) {
  var s = mx.settings;
  var urlBase =
    s.api.protocol + '//' + s.api.host_public + ':' + s.api.port_public;
  return urlBase + s.api.routes[id];
}

/**
 * Get url for path relative to the app
 * @param {String} id Id of the path : sprite, download, etc
 */
export function getAppPathUrl(id) {
  var s = mx.settings;
  var loc = window.location.origin;
  return loc + '/' + s.paths[id];
}

/**
 * Set the project manually
 * @param {String} idProject project to load
 * @return null
 */
export function setProject(idProject) {
  Shiny.onInputChange('selectProject', idProject);
}

export function requestProjectMembership(idProject) {
  Shiny.onInputChange('requestProjectMembership', {
    id: idProject,
    date: new Date()
  });
}

/**
 * Initial mgl and mapboxgl
 * @param {string} o options
 * @param {string} o.idMap id
 * @param {string} o.token Mapbox token
 * @param {Object} o.mapPosition Options (zoom, method, for center ing the map)
 * @param {Object} o.mapPosition Options (zoom, method, for center ing the map)
 * @param {Object} o.mapPosition.z Zoom
 * @param {Object} o.mapPosition.n North max
 * @param {Object} o.mapPosition.s South max
 * @param {Object} o.mapPosition.e East max
 * @param {Object} o.mapPosition.w West max
 * @param {Object} o.mapPosition.pitch Pitch
 * @param {Object} o.mapPosition.bearing Bearing
 * @param {Object} o.mapPosition.lng Longitude center
 * @param {Object} o.mapPosition.lat Latitude center
 * @param {Object} o.mapPosition.bounds Mapbox bounds object
 * @param {Object} o.mapPosition.fitToBounds fit map to bounds
 * @param {Object} o.fitToViewsBounds Discard map position, use views to fit
 * @param {number} [o.minZoom=4] Min zoom level
 * @param {number} [o.maxZoom=10] Max zoom level
 * @param {Object} o.apiUrl Base url for api
 */
export function initMapx(o) {
  var mp, map;

  o = o || {};
  o.id = o.id || mx.settings.map.id;
  mp = o.mapPosition || {};

  /**
   * Init mgl data store
   */
  if (!mx.maps) {
    mx.maps = {};
  }

  /**
   * Mgl data : keep reference on options, listener, views, etc...
   */
  mx.maps[o.id] = {
    map: {},
    listener: {},
    views: []
  };

  /*
   * workeround for centering based in bounds.
   * NOTE: bounds will be available at init : https://github.com/mapbox/mapbox-gl-js/issues/1970
   */
  if (o.fitToViewsBounds === true || mp.bounds) {
    mp.center = mp.bounds.getCenter();
  }

  /**
   * Set mapbox gl token
   */
  mx.mapboxgl.accessToken = mx.settings.map.token;

  /**
   * Update  sprites path
   */
  mx.style.sprite = getAppPathUrl('sprite');

  /**
   * TEst if mapbox gl is supported
   */
  if (!mx.mapboxgl.supported()) {
    alert(
      'This website will not work with your browser. Please upgrade it or use a compatible one.'
    );
    return;
  }

  /* map options */
  var mapOptions = {
    container: o.id, // container id
    style: mx.style,
    maxZoom: mx.settings.map.maxZoom,
    minZoom: mx.settings.map.minZoom,
    preserveDrawingBuffer: false,
    attributionControl: false,
    zoom: mp.z || mp.zoom || 5,
    bearing: mp.bearing || 0,
    pitch: mp.pitch || 0,
    center: mp.center || [mp.lng || 0, mp.lat || 0]
  };

  /*
   * Create map object
   */
  o.map = new mx.mapboxgl.Map(mapOptions);
  mx.maps[o.id].map = o.map;

  /**
   * Continue according to mode
   */
  if (!mx.settings.modeKiosk) {
    mx.helpers.initMapxApp(o);
    mx.helpers.initLog();
  }

  /**
   * Resolve with the map object
   */
  return map;
}

export function initMapxApp(o) {
  var map = o.map;
  var elMap = document.getElementById(o.id);
  var hasShiny = !!window.Shiny;

  if (!elMap) {
    alert('Map element with id ' + o.id + ' not found');
    return;
  }

  /**
   * Send loading confirmation to shiny
   */
  o.map.on('load', function() {
 
    /*
     * set views list
     */
    mx.helpers
      .updateViewsList({
        id: o.id,
        autoFetchAll: true,
        project: o.project || mx.settings.project,
        resetViews: true
      })
      .then(function() {
        /*
         * Auto start story map
         */
        if (o.storyAutoStart) {
          mx.helpers
            .storyRead({
              id: o.id,
              view: o.viewsList[0],
              save: false,
              autoStart: true
            });
        }
      });

    /**
     * Apply colorscheme if any
     */

    if (o.colorScheme) {
      mx.helpers.setUiColorScheme({
        colors: o.colorScheme
      });
    }

    /*
     * If shiny, trigger read event
     */
    if (hasShiny) {
      Shiny.onInputChange('mglEvent_' + o.id + '_ready', new Date());
    }

    /**
     * Handle drop geojson event
     */
    if (mx.helpers.handleUploadFileEvent && mx.helpers.handleDragOver) {
      elMap.addEventListener('dragover', mx.helpers.handleDragOver, false);
      elMap.addEventListener('drop', mx.helpers.handleUploadFileEvent, false);
    }

    /**
     * Add controls to the map
     */
    //compact: true
    map.addControl(new mx.helpers.mapControlApp(), 'top-left');
    //map.addControl(new mx.helpers.mapControlNav(),'top-right');
    map.addControl(new mx.helpers.mapControlLiveCoord(), 'bottom-right');
    map.addControl(new mx.helpers.mapControlScale(), 'bottom-right');
    map.addControl(new mx.helpers.mapxLogo(), 'bottom-left');

    /**
     * Error handling
     */
    map.on('error', function(e) {
      var msg = mx.helpers.path(e, 'error.message');

      if (msg) {
        if (msg.indexOf('http status 200') > 0) {
          return;
        }
      }
      throw new Error(msg);
    });

    /**
     * Mouse move handling
     */
    map.on('mousemove', function(e) {
      var layers = mx.helpers.getLayerNamesByPrefix({
        id: o.id,
        prefix: 'MX-'
      });
      var features = map.queryRenderedFeatures(e.point, {layers: layers});
      map.getCanvas().style.cursor = features.length ? 'pointer' : '';
    });

    map.on('click', function(e) {
      mx.helpers.handleClickEvent(e, o.id);
    });

    map.on('rotate', function() {
      var r = -map.getBearing();
      var northArrow = document.querySelector('.mx-north-arrow');
      northArrow.style[mx.helpers.cssTransformFun()] =
        'translate(-50%, -50%) rotateZ(' + r + 'deg) ';
    });
  });

}

/**
 * Handle click event
 * @param {Object} e Mapboxgl event object
 */
export function handleClickEvent(e, idMap) {
  var type = e.type;
  var hasLayer = mx.helpers.getLayerNamesByPrefix({prefix: 'MX-'}).length > 0;
  var map = mx.helpers.getMap(idMap);
  var clickModes = mx.helpers.getClickHandlers();
  var hasDashboard = clickModes.indexOf('dashboard') > -1;
  var hasDraw = clickModes.indexOf('draw') > -1;

  if (hasLayer && type === 'click') {
    if (hasDashboard) {
      /**
       * Probably handled by dashboards
       */
      return;
    } else if (hasDraw) {
      /**
       * Handle draw function ; edit selected feature.
       *
       * var layerGJ = mx.helpers.getLayerNamesByPrefix({prefix:'MX-GJ'});
       *if(layerGJ.length>0){
       *  var id = layerGJ[0];
       *  var feature = map.queryRenderedFeatures(e.point,{layers:[id]})[0];
       *  if(!feature){
       *    return;
       *  }
       *  mx.data.geojson.getItem(id)
       *    .then( data => {
       *      var featuresOrig = mx.helpers.path(data,'view.data.source.data.features');
       *      var featureQuery = feature;
       *  });
       *}
       */
      return;
    } else {
      /**
       * Click event : make a popup with attributes
       */
      var popup = new mx.mapboxgl.Popup()
        .setLngLat(map.unproject(e.point))
        .addTo(map);

      mx.helpers.once('view_remove', function() {
        popup.remove();
      });

      /**
       * NOTE: see mx_helper_map_features_popoup.js
       */
      mx.helpers.featuresToHtml({
        id: idMap,
        point: e.point,
        lngLat: e.lngLat,
        popup: popup
      });
    }
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
  var db = mx.data[o.idStore];
  db.getItem(o.idKey).then(function(item) {
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
  var lang = mx.settings.language;
  var hasGeolocator = !!navigator.geolocation;

  var o = {idMap: mx.settings.map.id};
  var classesHtml = document.documentElement.classList;
  classesHtml.add('shiny-busy');
  var map = getMap(o.idMap);
  var options = {
    enableHighAccuracy: true,
    timeout: 20000,
    maximumAge: 0
  };

  function success(pos) {
    classesHtml.remove('shiny-busy');
    var crd = pos.coords;
    map.flyTo({center: [crd.longitude, crd.latitude], zoom: 10});
    //console.log(`Latitude : ${crd.latitude}`);
    //console.log(`Longitude: ${crd.longitude}`);
    //console.log(`More or less ${crd.accuracy} meters.`);
  }

  function error(err) {
    mx.helpers
      .getDictItem(['error_cant_geolocate_msg', 'error_geolocate_issue'], lang)
      .then((it) => {
        classesHtml.remove('shiny-busy');
        mx.helpers.modal({
          id: 'geolocate_error',
          title: it[1],
          content: '<p> ' + it[0] + '</p> <p> ( ' + err.message + ' ) </p>'
        });
      });
  }

  if (hasGeolocator) {
    navigator.geolocation.getCurrentPosition(success, error, options);
  } else {
    error({message: 'Browser not compatible'});
  }
}

/**
 * Reset project : remove view, dashboards, etc
 *
 * @param {String} idMap map id
 */
export function reset(o) {
  var views = mx.helpers.getViews({
    id: o.idMap,
    asArray: true
  });
  /**
   * remove existing layers
   */
  mx.helpers.removeLayersByPrefix({
    id: o.idMap,
    prefix: 'MX-'
  });

  /**
   *  Reset filters and selector
   */
  var elViewList = document.querySelector('.mx-views-list');
  if (elViewList) {
    elViewList.innerHTML = '';
  }
  var elTxtFilterInput = document.querySelector('#viewsFilterText');
  if (elTxtFilterInput) {
    elTxtFilterInput.value = '';
  }
  var elBtnFilterCheck = document.querySelector('#btn_filter_checked');
  if (elBtnFilterCheck) {
    elBtnFilterCheck.classList.remove('active');
  }
  var elBtnSort = document.querySelectorAll('.mx-btn-sort');
  if (elBtnSort) {
    for (var i = 0, iL = elBtnSort.length; i < iL; i++) {
      elBtnSort[i].classList.remove('asc');
    }
  }
  var elViewsFilter = document.querySelector('#viewsFilter');
  if (elViewsFilter) {
    var elFilterToggles = elViewsFilter.querySelectorAll('.check-toggle');
    elFilterToggles.forEach((v) => v.remove());
  }

  /*
   * apply remove method
   */

  mx.helpers.cleanRemoveModules(views);
  if (elViewList) {
    setViewsListEmpty(true);
  }

  /*
   * Force dashboard remove
   */

  //mx.helpers.Dashboard.removeAllDashboards();
}

/**
 * Clean stored modules : dashboard, custom view, etc.
 */
export function cleanRemoveModules(view) {
  view =
    typeof view === 'string'
      ? mx.helpers.getViews({
          id: mx.settings.map.id,
          idView: view
        })
      : view;

  view = view instanceof Array ? view : [view];

  view.forEach(function(v) {
    if (v._onRemoveCustomView instanceof Function) {
      v._onRemoveCustomView();
    }
    if (v._onRemoveDashboard instanceof Function) {
      v._onRemoveDashboard();
    }
  });
}

/**
 * Add source from views array
 * @param {Object} o options
 * @param {Object} o.map Map object
 * @param {Array} o.views Views array
 */
export function addSourceFromViews(o) {
  if (o.views instanceof Array) {
    o.views.forEach((v) => {
      mx.helpers.addSourceFromView({
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
export function addSourceFromView(o) {
  var p = mx.helpers.path;

  if (o.map && p(o.view, 'data.source')) {
    var project = p(mx, 'settings.project');
    var projectView = p(o.view, 'project');
    var projectsView = p(o.view, 'data.projects') || [];
    var isEditable = p(o.view._edit) === true;
    var isLocationOk =
      o.noLocationCheck ||
      projectView === project ||
      projectsView.indexOf(project) > -1;

    if (!isLocationOk && isEditable) {
      /*
       * This should be handled in DB. TODO:check why this is needed here...
       */
      o.view._edit = false;
    }

    var idSource = o.view.id + '-SRC';
    var sourceExists = !!o.map.getSource(idSource);

    if (sourceExists) {
      /**
       * Handle case when old layers remain in map
       * This could prevent source removal
       */
      mx.helpers.removeLayersByPrefix({
        prefix: o.view.id,
        map: o.map
      });
      /**
       * Remove old source
       */
      o.map.removeSource(idSource);
    }

    if (o.view.type === 'vt') {
      var baseUrl = mx.helpers.getApiUrl('tiles');
      var url =
        baseUrl + '?view=' + o.view.id + '&date=' + o.view.date_modified;
      o.view.data.source.tiles = [url, url];
    }

    o.map.addSource(idSource, o.view.data.source);
  }
}

export function loadGeojsonViews() {
  var project = mx.settings.project;
  var viewsGj = [];

  var getProjectGj = function(gj) {
    var v = gj.view;
    if (v && v.project === project) {
      viewsGj.push(v);
    }
    return viewsGj;
  };

  mx.data.geojson.iterate(getProjectGj).then(function(gj) {
    console.log(gj);
  });
}

/**
 * Get remote view from latest views table
 * @param {String} idView id of the view
 * @return {Promise} Promise resolving to object
 */
export function getViewRemote(idView) {
  var apiUrlViews = mx.helpers.getApiUrl('views');

  if (!idView || !apiUrlViews) {
    return Promise.reject('Missing id or fetch URL');
  }

  /* get view object from storage or network */
  var keyNet = apiUrlViews + idView;

  return fetch(keyNet)
    .then((view) => {
      if (view.status === 404) {
        return {};
      }
      return view.json();
    })
    .then((view) => {
      view._edit = false;
      view._kiosk = true;
      return view;
    });
}
/**
 * Get multipler remote views from latest views table
 * @param {Array} idViews array of views id
 * @return {Promise} Promise resolving to abject
 */
export function getViewsRemote(idViews) {
  return Promise.all(idViews.map((id) => getViewRemote(id)));
}

/**
 * Save view list to views
 * @param {object} o options
 * @param {string} o.id ID of the map
 * @param {object} o.viewList views list
 * @param {Boolean} o.viewsCompact The view list is in compact form (id and row only)
 * @param {boolean} o.add Append to existing
 * @param {string} o.project code
 * @param {Boolean} o.resetViews should this reset stored views list on map
 */
export function updateViewsList(o) {
  var h = mx.helpers;
  return new Promise(function(resolve) {
    var mode = 'array_async_all';
    var viewsToAdd = o.viewsToAdd;
    var nCache = 0,
      nNetwork = 0,
      nTot = 0,
      prog;
    var apiUrlViews = h.getApiUrl('viewsToAdd');
    var elProgContainer;
    var isCompactList = o.viewsCompact === true;
    var autoFetchAll = o.autoFetchAll === true;
    var hasViewsList = h.isArray(viewsToAdd) && h.isNotEmpty(viewsToAdd);
    var hasSingleView = !hasViewsList && h.isView(viewsToAdd);
    var resetViews = h.isBoolean(o.resetViews) ? o.resetViews : hasViewsList;
    var updateProject = o.project && o.project !== mx.settings.project;

    if (updateProject) {
      mx.settings.project = o.project;
    }

    if (hasViewsList) {
      nTot = viewsToAdd.length;
    }

    if (autoFetchAll) {
      mode = 'array_async_all';
    } else {
      if (hasSingleView) {
        mode = 'object_single';
      }else
        if (hasViewsList && isCompactList) {
          mode = 'array_async';
        } else
        if (hasViewsList && !isCompactList) {
          mode = 'array_sync';
        }
    }

    /*
     * Reset old viewsToAdd and dashboards
     */
    if (resetViews) {
      h.reset({
        idMap: o.id
      });
    }

    /**
     * Process view list
     */
    resolve(addViews());

    /**
     * Helpers
     */

    /* Switch according to mode */
    function addViews() {
      return {
        object_single: addSingle,
        array_sync: addSync,
        array_async: addAsync,
        array_async_all: addAsyncAll
      }[mode](viewsToAdd);
    }

    /* Sort viewsToAdd by title */
    function sortViews(viewsToAdd) {
      var aTitle, bTitle;
      viewsToAdd = h.isArray(viewsToAdd) ? viewsToAdd : [];
      viewsToAdd.sort(function(a, b) {
        aTitle = getViewTitle(a);
        bTitle = getViewTitleNormalized(b);
        if (aTitle < bTitle) {
          return -1;
        }
        if (aTitle > bTitle) {
          return 1;
        }
        return 0;
      });

      return viewsToAdd;
    }

    /* update progress */
    function updateProgress(d) {
      d = d || {
        loaded: nCache + nNetwork,
        total: nTot
      };

      if (!elProgContainer) {
        elProgContainer = document.querySelector('#noViewItemText');
      }

      if (!prog && elProgContainer) {
        prog = new h.RadialProgress(elProgContainer, {
          radius: 20,
          stroke: 3
        });
      }

      if (prog && prog.update && elProgContainer) {
        prog.update(d.loaded / d.total);
      }
    }

    /* get view title  */
    function getViewTitleNormalized(view) {
      var title = h.getLabelFromObjectPath({
        lang: mx.settings.language,
        obj: view,
        path: 'data.title'
      });
      title = h
        .cleanDiacritic(title)
        .toLowerCase()
        .trim();
      return title;
    }

    /* get view object from storage or network */
    function getViewObject(v) {
      var keyStore = v.id + '@' + v.pid;
      var keyNet = apiUrlViews + v.id + '?' + v.pid;
      var editable = v._edit;
      return mx.data.viewsToAdd.getItem(keyStore).then((view) => {
        if (view) {
          nCache++;
          updateProgress();
          view._edit = editable;
          return Promise.resolve(view);
        } else {
          return fetch(keyNet)
            .then((r) => r.json())
            .then((view) => {
              nNetwork++;
              updateProgress();
              view._edit = editable;
              return view;
            })
            .then((view) => mx.data.viewsToAdd.setItem(keyStore, view));
        }
      });
    }

    /* Add array of compact viewsToAdd object*/
    function addAsync(viewsToAdd) {
      var out = viewsToAdd.map(getViewObject);

      return Promise.all(out).then((viewsToAddFetched) => {
        viewsToAddFetched = sortViews(viewsToAddFetched);

        h.renderViewsList({
          id: o.id,
          views: viewsToAddFetched
        });

        loadGeojsonFromStorage(o);

        return viewsToAddFetched;
      });
    }

    function addAsyncAll() {
      h.fetchViews({
        onProgress: updateProgress
      })
        .then((viewsToAdd) => {
          viewsToAdd = sortViews(viewsToAdd);
          h.renderViewsList({
            id: o.id,
            views: viewsToAdd
          });
          loadGeojsonFromStorage(o);
          return viewsToAdd;
        });
    }

    /* Add array of coomplete viewsToAdd object*/
    function addSync() {

      h.renderViewsList({
        id: o.id,
        views: viewsToAdd
      });

      loadGeojsonFromStorage(o);
      return viewsToAdd;
    }

    /* Add single view object */
    function addSingle(view) {
      h.renderViewsList({
        id: o.id,
        views: view,
        add: true,
        open: true
      });

      return view;
    }
  });
}

/**
 * Load geojson from localstorage,save it in views list and render item
 * @param {Object} o options
 * @param {String} o.id Map id
 * @param {String} o.project Current project to filter geojson view. Default to settings.project
 */
function loadGeojsonFromStorage(o) {
  var m = mx.helpers.getMapData(o.id);

  if (!mx.data || !mx.data.geojson || !m) {
    return;
  }

  var project = o.project || mx.settings.project;
  /**
   * extract views from local storage
   */
  mx.data.geojson.iterate(function(value) {
    var view = value.view;
    if (view.project === project) {
      m.views.unshift(view);

      mx.helpers.renderViewsList({
        id: o.id,
        views: view,
        add: true,
        open: true
      });
    }
  });
}

/**
 * Retrieve nested item from object/array
 * @param {Object|Array} obj
 * @param {String} path dot separated
 * @param {*} def default value ( if result undefined )
 * @note http://jsfiddle.net/Jw8XB/1/
 * @returns {*}
 */
export function path(obj, path, def) {
  var i, len;
  if (typeof def === 'undefined') {
    def = null;
  }
  if (typeof path !== 'string') {
    return def;
  }
  for (i = 0, path = path.split('.'), len = path.length; i < len; i++) {
    if (!obj || typeof obj !== 'object') {
      return def;
    }
    obj = obj[path[i]];
  }

  if (obj === undefined) {
    return def;
  }
  return obj;
}

let vStore = [];

/**
 *  View controler : evalutate view state and enable/disable it depending on ui state
 */
export function viewControler(o) {
  var vToAdd = [],
    vToRemove = [],
    vVisible = [],
    vChecked = [];
  var view, isChecked, id, viewDuration;
  var idMap = o.id || mx.settings.map.id;
  var idViewsList = o.idViewsList || 'mx-views-list';
  var els = document.querySelectorAll(
    "[data-view_action_key='btn_toggle_view']"
  );

  for (var i = 0; i < els.length; i++) {
    id = els[i].dataset.view_action_target;
    isChecked = els[i].checked === true;
    if (isChecked) {
      vChecked.push(id);
    }
  }

  mx.helpers.onNextFrame(function() {
    vVisible = mx.helpers.getLayerNamesByPrefix({
      id: idMap,
      prefix: 'MX-',
      base: true
    });

    vVisible = mx.helpers.getArrayStat({
      arr: vStore.concat(vVisible),
      stat: 'distinct'
    });

    vToRemove = mx.helpers.arrayDiff(vVisible, vChecked);

    vToAdd = mx.helpers.arrayDiff(vChecked, vVisible);

    /**
     * View to add
     */
    vToAdd.forEach(function(v) {
      vStore.push(v);
      view = mx.helpers.getView(v);
      view._addTime = Date.now();

      mx.helpers.addView({
        id: idMap,
        viewData: view,
        idViewsList: idViewsList
      });

      mx.helpers.fire('view_add', {
        idView: v
      });
    });

    /**
     * View to remove
     */
    vToRemove.forEach(function(v) {
      vStore.splice(vStore.indexOf(v, 1));

      view = mx.helpers.getView(v);
      viewDuration = Date.now() - view._addTime || 0;

      mx.helpers.removeLayersByPrefix({
        id: idMap,
        prefix: v
      });

      mx.helpers.cleanRemoveModules(v);

      mx.helpers.fire('view_remove', {
        idView: v,
        viewDuration: viewDuration
      });
    });

    if (true) {
      var summary = {
        vStore: vStore,
        vChecked: vChecked,
        vVisible: vVisible,
        vToRemove: vToRemove,
        vToAdd: vToAdd
      };
      Shiny.onInputChange('mglEvent_' + idMap + '_views_status', summary);
    }

    updateViewOrder(o);
    /**
     * updateViewParams(o);
     **/
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
  if (!o.id || !o.idView || !o.action) {
    return;
  }

  var el = document.querySelector("input[data-view-toggle='" + o.idView + "']");

  if (o.action === 'check' && el && !el.checked) {
    el.checked = true;
  }

  if (o.action === 'uncheck' && el && el.checked) {
    el.checked = false;
  }
}

/**
 * Get main variable for a vt view
 * @param {object} o options
 * @param {string} o.id map id
 * @param {string} o.idView view id
 */
export function getViewVariable(o) {
  var view = mx.helpers.getViews(o);
  return mx.helpers.path(view, 'data.attribute.name');
}

/**
 * Create a simple layer
 * @param {object} o Options
 * @param {string} o.id Id of the layer
 * @param {string} o.idSourceLayer Id of the source layer / id of the view
 * @param {string} o.idSource Id of the source
 * @param {string} o.geomType Geometry type (point, line, polygon)
 * @param {string} o.hexColor Hex color. If not provided, random color will be generated
 * @param {array} o.filter
 * @param {Number} o.size
 * @param {string} o.sprite
 */
export function makeSimpleLayer(o) {
  var ran, colA, colB, layer;

  var sizeFactorZoomMax = o.sizeFactorZoomMax || 0;
  var sizeFactorZoomMin = o.sizeFactorZoomMin || 0;
  var sizeFactorZoomExponent = o.sizeFactorZoomExponent || 1;
  var zoomMin = o.zoomMin || 0;
  var zoomMax = o.zoomMax || 22;
  var size = o.size || 2;
  var sprite = o.sprite || '';
  var filter = o.filter || ['all'];
  if (o.gemType === 'symbol') {
    size = size / 10;
  }

  var funSizeByZoom = [
    'interpolate',
    ['exponential', sizeFactorZoomExponent],
    ['zoom'],
    zoomMin,
    sizeFactorZoomMin * size,
    zoomMax,
    sizeFactorZoomMax * size
  ];

  size = sizeFactorZoomMax > 0 || sizeFactorZoomMin > 0 ? funSizeByZoom : size;

  if (!o.hexColor) {
    ran = Math.random();
    colA = mx.helpers.randomHsl(0.5, ran);
    colB = mx.helpers.randomHsl(0.8, ran);
  } else {
    colA = mx.helpers.hex2rgba(o.hexColor, o.opacity);
    colB = mx.helpers.hex2rgba(o.hexColor, o.opacity + 0.2);
  }

  layer = {
    symbol: {
      type: 'symbol',
      layout: {
        'icon-image': sprite,
        'icon-size': size
      },
      paint: {
        'icon-opacity': 1,
        'icon-halo-width': 2,
        'icon-halo-color': colB
      }
    },
    point: {
      type: 'circle',
      paint: {
        'circle-color': colA,
        'circle-radius': size
      }
    },
    polygon: {
      type: 'fill',
      paint: {
        'fill-color': colA,
        'fill-outline-color': colB
      }
    },
    pattern: {
      type: 'fill',
      paint: {
        'fill-pattern': sprite
      }
    },
    line: {
      type: 'line',
      paint: {
        'line-color': colA,
        'line-width': size
      },
      layout: {
        'line-cap': 'round',
        'line-join': 'round'
      }
    }
  };

  layer = layer[o.geomType];
  layer.id = o.id;
  layer.source = o.idSource;
  layer.minzoom = o.zoomMin;
  layer.maxzoom = o.zoomMax;
  layer['source-layer'] = o.idSourceLayer;
  layer.filter = filter;
  layer.metadata = {};
  layer.metadata.filter_base = filter;

  return layer;
}

/**
 * Update layer order based on view list position
 * @param {object} o Options
 * @param {string} o.id Id of the map
 * @param {string} o.order Array of layer base name. If empty, use `getViewOrder`
 * @param
 */
export function updateViewOrder(o) {
  var map = mx.helpers.getMap(o.id);
  var views = mx.helpers.getViews({id: o.id, asArray: true});
  var orderUiList = mx.helpers.getViewOrder();
  var orderViewList = views.map((v) => v.id);
  var order = o.order || orderUiList || orderViewList || [];
  var layerBefore = mx.settings.layerBefore;

  if (!order) {
    return;
  }
  mx.helpers.onNextFrame(function() {
    var displayed = mx.helpers.getLayerNamesByPrefix({
      id: o.id,
      prefix: 'MX-'
    });

    displayed.sort(function(a, b) {
      var posA = order.indexOf(mx.helpers.getLayerBaseName(a));
      var posB = order.indexOf(mx.helpers.getLayerBaseName(b));
      return posA - posB;
    });

    displayed.forEach(function(x) {
      if (map.getLayer(x)) {
        var posBefore = displayed.indexOf(x) - 1;

        if (posBefore > -1) {
          layerBefore = displayed[posBefore];
        }

        map.moveLayer(x, layerBefore);
      }
    });
  });
}

/**
 * Update view in params
 */
export function updateViewParams(o) {
  o = o || {id: mx.helpers.getMap()};

  var displayed = mx.helpers.getLayerNamesByPrefix({
    id: o.id,
    prefix: 'MX-',
    base: true
  });

  mx.helpers.objToState({
    data: {
      views: displayed
    }
  });
}

/**
 * Event mapx : fire event
 * @param {String} type
 */
export function fire(type, data) {
  data = data || {};
  setTimeout(function() {
    if (!mx.events[type]) {
      mx.events[type] = [];
    }
    var evts = mx.events[type];
    evts.forEach((cb) => {
      mx.helpers.onNextFrame(() => {
        cb(data);
        if (cb.once === true) {
          var id = evts.indexOf(cb);
          evts.splice(id, 1);
        }
      });
    });
  }, 500);
}
/**
 * Event mapx : add event listener
 * @param {String} type
 * @param {Function} callback
 */
export function on(type, cb) {
  if (!mx.events[type]) {
    mx.events[type] = [];
  }
  var id = mx.events[type].indexOf(cb);
  if (id === -1) {
    mx.events[type].push(cb);
  }
}

/**
 * Event mapx : once event listener
 * @param {String} type
 * @param {Function} callback
 */
export function once(type, cb) {
  cb.once = true;
  mx.helpers.on(type, cb);
}
/**
 * Event mapx : remove event listener
 * @param {String} type
 * @param {Function} callback
 */
export function off(type, cb) {
  if (!mx.events[type]) {
    mx.events[type] = [];
  }
  var id = mx.events[type].indexOf(cb);
  if (id > -1) {
    mx.events[type].splice(id, 1);
  }
}

export function moveViewItem(o) {
  o.id = o.id || new Error('no id');
  o.mode = o.mode || 'top' || 'next' || 'previous' || 'bottom';

  var elViewsList = document.querySelector('.mx-views-list');
  var elView = document.getElementById(o.id);
  var elsViews = elViewsList.querySelectorAll('.mx-view-item');
  var elViewFirst = elsViews[0];
  var elViewLast = elsViews[elsViews.length - 1];
  var elScroll = elViewsList.parentElement;
  var scrollMax = elViewsList.getBoundingClientRect().height;

  switch (o.mode) {
    case 'top': {
      elViewsList.insertBefore(elView, elViewFirst);
      elScroll.scrollTop = 0;
      break;
    }
    case 'bottom': {
      elViewsList.insertBefore(elView, elViewLast.nextSibling);
      elScroll.scrollTop = scrollMax;
      break;
    }
    case 'next': {
      elViewsList.insertBefore(elView, elView.nextSibling);
      break;
    }
    case 'previous': {
      elViewsList.insertBefore(elView, elView.previousSibling);
      break;
    }
  }
  updateViewOrder({
    id: mx.settings.map.id
  });
}

export function filterActiveViews(o) {
  var elList = document.querySelector('.mx-views-list');
  var elItems = elList.querySelectorAll('.mx-view-item');
  var elItem, elCheck;
  var elBtn = document.getElementById(o.idBtn);
  var wasActive = elBtn.classList.contains('active');
  if (wasActive) {
    elBtn.classList.remove('active');
  } else {
    elBtn.classList.add('active');
  }

  for (var i = 0, iL = elItems.length; i < iL; i++) {
    elItem = elItems[i];
    elCheck = elItem.querySelector('.mx-view-tgl-input');
    if (wasActive === true || (elCheck && elCheck.checked)) {
      elItem.classList.remove('mx-hide-filter');
    } else {
      elItem.classList.add('mx-hide-filter');
    }
  }
}

export function sortViewsListBy(o) {
  /**
   * Get elements and element state
   */
  var elList = document.querySelector('.mx-views-list');
  var elItems = elList.querySelectorAll('.mx-view-item');
  var elItemFirst = elItems[0];
  var idBtn = o.idBtn || '';
  var elBtn;
  var isAsc = false;
  if (idBtn) {
    elBtn = document.getElementById(idBtn);
  }
  if (elBtn) {
    isAsc = elBtn.classList.contains('asc');
  }

  /*
   * Set options based on arguments
   */
  var dir = o.dir || 'asc';
  var toggle = dir === 'toggle';
  var type = o.type || 'title';

  /*
   * Update ui
   */
  if (elBtn && toggle) {
    if (isAsc) {
      dir = 'asc';
      elBtn.classList.remove('asc');
    } else {
      dir = 'desc';
      elBtn.classList.add('asc');
    }
  }

  /**
   * Set direction
   */

  var gt = dir === 'desc' ? 1 : -1;
  var lt = dir === 'desc' ? -1 : 1;
  /*
   * value in array
   */
  var values = [];
  elItems.forEach(function(el) {
    values.push({
      el: el,
      val: getValue(el)
    });
  });

  values.sort(function(a, b) {
    if (a.val > b.val) {
      return gt;
    }
    if (a.val < b.val) {
      return lt;
    }
    return 0;
  });

  values.forEach(function(v, i) {
    if (i === 0) {
      elList.insertBefore(v.el, elItemFirst);
    } else {
      elList.insertBefore(v.el, values[i - 1].el);
    }
  });

  mx.helpers.updateViewOrder({
    id: o.id || o.idMap || mx.settings.map.id
  });

  function getValue(el) {
    switch (type) {
      case 'date':
        return prep(el.dataset.view_date_modified || '');
      case 'checked':
        return prep(el.querySelector('input').checked || false);
      case 'title':
        return prep(el.dataset.view_title.toLowerCase().trim() || '');
      default:
        return '';
    }
  }

  function prep(val) {
    switch (typeof val) {
      case 'boolean':
        return val;
      case 'string':
        return mx.helpers.cleanDiacritic(val).toLowerCase();
      case 'number':
        return val;
    }
  }
}

/**
 * Get the current view order
 * @return {array} view id array
 */
export function getViewOrder() {
  var res = [];
  var viewContainer = document.querySelector('.mx-views-list');
  var els = viewContainer.querySelectorAll('.mx-view-item');
  els.forEach((el) => res.push(el.dataset.view_id));
  return res;
}

/**
 * Create and listen to transparency sliders
@param {Object} o Options
@param {Object} o.view View data
@param {String} o.idMap Map id
*/
export function makeTransparencySlider(o) {
  var view = o.view;
  var el = document.querySelector("[data-transparency_for='" + view.id + "']");

  if (!el) {
    return;
  }

  makeSlider();

  function makeSlider() {
    mx.helpers.moduleLoad('nouislider').then(function(module) {
      var noUiSlider = module[0].default;

      var slider = noUiSlider.create(el, {
        range: {min: 0, max: 100},
        step: 1,
        start: 0,
        tooltips: false
      });

      slider.targetView = view;

      /*
       * Save the slider in the view
       */
      view._interactive.transparencySlider = slider;

      /*
       *
       */
      slider.on(
        'slide',
        mx.helpers.debounce(function(n, h) {
          var view = this.targetView;
          var opacity = 1 - n[h] * 0.01;
          view._setOpacity({opacity: opacity});
        }, 10)
      );
    });
  }
}

/**
 * Create and listen to numeric sliders
@param {Object} o Options
@param {Object} o.view View data
@param {String} o.idMap Map id
*/
export function makeNumericSlider(o) {
  var view = o.view;
  var el = document.querySelector("[data-range_numeric_for='" + view.id + "']");

  if (!el) {
    return;
  }

  makeSlider();

  function makeSlider() {
    var min = mx.helpers.path(view, 'data.attribute.min');
    var max = mx.helpers.path(view, 'data.attribute.max');

    if (view && min !== null && max !== null) {
      if (min === max) {
        min = min - 1;
        max = max + 1;
      }

      var range = {
        min: min,
        max: max
      };

      mx.helpers.moduleLoad('nouislider').then((module) => {
        var noUiSlider = module[0].default;

        var slider = noUiSlider.create(el, {
          range: range,
          step: (min + max) / 1000,
          start: [min, max],
          connect: true,
          behaviour: 'drag',
          tooltips: false
        });

        slider.targetView = view;

        /*
         * Save the slider in the view
         */
        view._interactive.numericSlider = slider;

        /*
         *
         */
        slider.on(
          'slide',
          mx.helpers.debounce(function(n) {
            var view = this.targetView;
            var filter;

            var elContainer = this.target.parentElement;
            var elDMax = elContainer.querySelector('.mx-slider-dyn-max');
            var elDMin = elContainer.querySelector('.mx-slider-dyn-min');
            var k = view.data.attribute.name;

            /* Update text values*/
            if (n[0]) {
              elDMin.innerHTML = n[0];
            }
            if (n[1]) {
              elDMax.innerHTML = ' – ' + n[1];
            }

            filter = [
              'any',
              ['all', ['<=', k, n[1] * 1], ['>=', k, n[0] * 1]],
              ['!has', k]
            ];

            view._setFilter({
              filter: filter,
              type: 'numeric_slider'
            });
          }, 100)
        );
      });
    }
  }
}

/**
 * Create and listen to time sliders
 */
export function makeTimeSlider(o) {
  var k = {};
  k.t0 = 'mx_t0';
  k.t1 = 'mx_t1';

  var view = o.view;

  var el = document.querySelector('[data-range_time_for="' + view.id + '"]');
  if (!el) {
    return;
  }

  /*
   * Create a time slider for each time enabled view
   */
  /* from slider to num */
  var fFrom = function(x) {
    return x;
  };
  /* num to slider */
  var fTo = function(x) {
    return Math.round(x);
  };

  //var now = new Date().getTime() / 1000;
  /*  var dateForm = {*/
  //to: now,
  //from: true
  /*};*/

  makeSlider();

  function makeSlider() {
    if (view.data.period) {
      var time = mx.helpers.path(view, 'data.period');
      var prop = mx.helpers.path(view, 'data.attribute.names');
      var start = [];

      if (time.extent.min && time.extent.max) {
        var hasT0 = prop.indexOf(k.t0) > -1;
        var hasT1 = prop.indexOf(k.t1) > -1;
        var min = time.extent.min * 1000;
        var max = time.extent.max * 1000;

        if (min === max) {
          min = min - 1;
          max = max + 1;
        }

        var range = {
          min: min,
          max: max
        };

        start.push(min);
        start.push(max);

        mx.helpers.moduleLoad('nouislider').then(function(module) {
          var noUiSlider = module[0].default;

          var slider = noUiSlider.create(el, {
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
          slider.targetView = view;
          view._interactive.timeSlider = slider;

          /*
           * create distribution plot in time slider
           */
          /* NOTE: removed chart. Removed dependencies to chartist

            /*
             * 
             */
          slider.on(
            'slide',
            mx.helpers.debounce(function(t) {
              var filterAll = [];
              var filter = [];
              var view = this.targetView;
              var elContainer = this.target.parentElement;
              var elDMax = elContainer.querySelector('.mx-slider-dyn-max');
              var elDMin = elContainer.querySelector('.mx-slider-dyn-min');

              /* save current time value */
              //ime.extent.set = t;

              /* Update text values*/
              if (t[0]) {
                elDMin.innerHTML = mx.helpers.date(t[0]);
              }
              if (t[1]) {
                elDMax.innerHTML = ' – ' + mx.helpers.date(t[1]);
              }

              filter = ['any'];
              filterAll = ['all'];
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
            }, 10)
          );
        });
      }
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
    var action, el, idView, search, options;
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
 * @param {object} o options;
 * @param {string} o.id map id
 * @param {string} o.idView view id
 */
export function removeView(o) {
  var li = document.querySelector("[data-view_id='" + o.idView + "']");

  var views = mx.helpers.getViews({asArray: true});
  var view = mx.helpers.getView(o.idView);
  var vIndex = views.indexOf(view);

  if (!view) {
    return;
  }

  mx.helpers.closeView(o);

  if (view.type === 'gj') {
    var data = mx.data.geojson;
    data.removeItem(o.idView);
  }

  if (li) {
    li.remove();
  }

  if (views.length === 0) {
    setViewsListEmpty(true);
  }

  views.splice(vIndex, 1);
  mx.helpers.updateViewsFilter({from: 'removeView'});
  mx.helpers.viewControler(o);
}

/**
 * Close view and clean its modules
 * @param {object} o options;
 * @param {string} o.id map id
 * @param {string} o.idView view id
 */
export function closeView(o) {
  var view = mx.helpers.getView(o.idView);

  if (!view) {
    return;
  }

  mx.helpers.cleanRemoveModules(view);

  mx.helpers.removeLayersByPrefix({
    id: o.id,
    prefix: o.idView
  });
}

/**
 * Add components in view for an array of views
 * @param {Array} views Array of views to update
 */
export function setViewsComponents(views) {
  views.forEach((v) => {
    var components,
      isVt,
      isSm,
      isCc,
      isRt,
      widgets,
      story,
      overlap,
      attributes,
      customStyle;
    var h = mx.helpers;
    components = [];

    isVt = v.type === 'vt';
    isSm = v.type === 'sm';
    isCc = v.type === 'cc';
    isRt = v.type === 'rt';

    widgets = h.path(v, 'data.dashboard.widgets', '');
    story = h.path(v, 'data.story.steps', '');
    overlap = h.path(v, 'data.source.layerInfo.maskName', '');
    attributes = h.path(v, 'data.attribute.names', '');
    customStyle = h.path(v, 'data.style.custom', '');

    if (isVt) {
      components.push('vt');
    }
    if (isRt) {
      components.push('rt');
    }
    if (isSm && story && story.length) {
      components.push('story_map');
    }
    if (isVt && widgets && widgets.length) {
      components.push('dashboard');
    }
    if (!isSm) {
      components.push('layer');
    }
    if (isVt && attributes && attributes.indexOf('mx_t0') > -1) {
      components.push('time_slider');
    }
    if (isVt && typeof overlap === 'string' && overlap.length) {
      components.push('overlap');
    }
    if (
      isVt &&
      customStyle &&
      customStyle.json &&
      JSON.parse(customStyle.json).enable
    ) {
      components.push('custom_style');
    }
    if (isCc) {
      components.push('custom_code');
    }
    v._components = components;
  });
}

/**
 * Render views HTML list in viewStore
 * @param {object} o options
 * @param {string} o.id map id
 * @param {Object} o.views views to render
 * @param {boolean} o.add Add views to an existing list
 */
export function renderViewsList(o) {
  var h = mx.helpers;
  var elDiv, elNewItem, elNewInput;
  var m = mx.helpers.getMapData(o.id);
  var elViewsContainer = document.querySelector('.mx-views-container');
  var elViewsList = elViewsContainer.querySelector('.mx-views-list');
  var views = o.views;
  var hasTemplate = h.isFunction(mx.templates.viewList);
  var hasViews = h.isArray(views) && h.isNotEmpty(views);
  var add = o.add || false;
  var open = o.open || false;
  var hasSingleView = !hasViews && h.isObject(views) && h.isNotEmpty(views);


  if( !hasTemplate ){
   throw new Error('renderViewsList : no template found');
  }


  if (  hasSingleView ) {
    views = [views];
    add = true;
  }

  /**
   * If empty, add empty view list message
   */
  if (!hasViews && !hasSingleView) {
    setViewsListEmpty(true);
  } else {
    setViewsListEmpty(false);

    if (!m.listener) {
      m.listener = {};
    }
    if (!m.tools) {
      m.tools = {};
    }
    if (!add) {
      /**
       * Render all view items
       */
      elViewsList.innerHTML = mx.templates.viewList(views);

      if (!mx.listener.sortableViews) {
        mx.listener.sortableViews = Sortable.create(elViewsList, {
          handle: '.mx-view-tgl-title',
          draggable: '.mx-view-item',
          animation: 150,
          fallbackOnBody: true,
          swapThreshold: 0.65,
          onChange: mx.helpers.viewControler
        });
      }
      /**
      * Update views list
      */    
      m.views = views;

    } else {
      /**
       * Render given view items only
       */
      views.forEach(function(v) {
        /**
        * Update views list
        */
        var oldPos;
        m.views.forEach(function(f) {
          if (f.id === v.id) {
            oldPos = m.views.indexOf(f);
          }
        });
        if (oldPos > -1) {
          m.views.splice(oldPos, 1);
        }
        m.views.push(v);
      });
      elDiv = document.createElement('div');
      elDiv.innerHTML = mx.templates.viewList(views);
      elNewItem = elDiv.querySelector('li');
      elNewInput = elNewItem.querySelector('.mx-view-tgl-input');
      elNewInput.checked = open;
      elViewsList.insertBefore(elNewItem, elViewsList.childNodes[0]);
    }

    /**
     * Generate filter
     */
    h.updateViewsFilter({from: 'renderViewsList'});

    /**
     * Add views badges
     */
    h.updateViewsBadges();

    /*
     * translate based on dict key
     */
    h.updateLanguageElements({
      el: elViewsContainer
    });

    /*
     * filter view  by text input
     */
    if (!m.listener.viewsListFilterText) {
      m.listener.viewsListFilterText = h.filterViewsListText({
        selectorInput: '#viewsFilterText',
        classHide: 'mx-filter-text',
        classSkip: 'mx-filter-class',
        idMap: o.id,
        onFiltered: function() {}
      });
    } else {
      m.listener.viewsListFilterText();
    }
    /*
     * List filter by classes
     */
    if (!m.listener.viewsListFilterCheckbox) {
      m.listener.viewsListFilterCheckbox = h.filterViewsListCheckbox({
        selectorInput: '#viewsFilterContainer',
        idMap: o.id,
        classHide: 'mx-filter-class',
        classSkip: 'mx-filter-text',
        onFiltered: function() {}
      });
    } else {
      m.listener.viewsListFilterCheckbox();
    }

    /*
     * View values filter by text
     */
    if (!m.listener.viewsValueFilterText) {
      m.listener.viewsValueFilterText = h.handleViewValueFilterText({
        id: o.id
      });
      /* NOTE: keyup on the whole list */
      elViewsList.addEventListener('keyup', m.listener.viewsValueFilterText);
    }

    /**
     * Listen to click inside the list
     */
    if (!m.listener.viewsListClick) {
      m.listener.viewsListClick = h.handleViewClick(o);
      elViewsList.addEventListener('click', m.listener.viewsListClick, false);
    }

    /**
     * Trigger view controler
     */
    h.viewControler(o);
  }
}

/**
 * Check if there is an empty views list and add a message if needed
 */
export function setViewsListEmpty(enable) {
  enable = enable || false;
  var noViewKey = 'noView';
  var elViewsList = document.querySelector('.mx-views-list');

  if (enable) {
    elViewsList.innerHTML = '';
    var elView = document.createElement('li');
    var elTitle = document.createElement('span');
    elTitle.dataset.lang_key = noViewKey;
    elView.classList.add('mx-view-item-empty');
    elTitle.id = 'noViewItemText';
    elView.appendChild(elTitle);
    elViewsList.appendChild(elView);
    mx.helpers.getDictItem(noViewKey).then(function(item) {
      elTitle.innerHTML = item;
    });
  } else {
    var elToRemove = document.querySelector('.mx-view-item-empty');
    if (elToRemove) {
      elToRemove.remove();
    }
  }
}

/**
 * Extract tags from various path in given views list and produce frequency tables
 * @param {Array} v Views list
 * @note : expect type, data.classes and data.collections
 */
export function getTagsGroupsFromView(views) {
  var h = mx.helpers;

  var tags = {
    components: [],
    classes: [],
    collections: []
  };

  var stat = {};

  views.map(function(v) {
    tags.components = tags.components.concat(h.path(v, '_components'));
    tags.classes = tags.classes.concat(h.path(v, 'data.classes'));
    tags.collections = tags.collections.concat(h.path(v, 'data.collections'));
  });

  // grouprs
  stat.view_components = mx.helpers.getArrayStat({
    arr: tags.components,
    stat: 'frequency'
  });

  stat.view_classes = mx.helpers.getArrayStat({
    arr: tags.classes,
    stat: 'frequency'
  });

  stat.view_collections = mx.helpers.getArrayStat({
    arr: tags.collections,
    stat: 'frequency'
  });

  return stat;
}

/**
 * Create filter tags label using freqency table from getTagsGroupFromView
 * @param {Object} o options
 * @param {Object} o.tagsTable Object containing the count for each key :
 * @param {Object} o.tagsTable.count Count of key.
 * @param {Element|Selector} o.selectorContainer Container to store the resulting label
 */
export function updateViewsFilter(o) {
  o = o || {};

  var h = mx.helpers;
  var views = h.getViews({asArray: true});
  o.selectorContainer = o.selectorContainer || '#viewsFilterContainer';

  /**
   * Add components (story, dashboard, vector, raster, etc..) to each view ._components
   */
  mx.helpers.setViewsComponents(views);

  /**
   * Build tags table
   */
  o.tagsTable = o.tagsTable || h.getTagsGroupsFromView(views);

  var elContainer =
    o.selectorContainer instanceof Node
      ? o.selectorContainer
      : document.querySelector(o.selectorContainer);
  var elFilters = document.createElement('div');
  var elFoldFilters;
  elContainer.innerHTML = '';

  h.getDictItem('view_filter_by_tags')
    .then(function(label) {
      elFoldFilters = h.uiFold({
        content: elFilters,
        label: label,
        labelKey: 'view_filter_by_tags',
        open: false
      });
      elContainer.appendChild(elFoldFilters);
    })
    .then(function() {
      /**
       * Add filter by class, type, ...
       */
      var types = Object.keys(o.tagsTable);

      types.forEach(function(type) {
        var tags = [];
        var tbl = o.tagsTable[type];
        var keys = Object.keys(tbl);
        var elTypeContent = document.createElement('div');
        var elTypeContainer = document.createElement('div');
        elTypeContent.classList.add('filter-tag-content');

        h.getDictItem(type)
          .then(function(label) {
            elTypeContainer = h.uiFold({
              content: elTypeContent,
              label: label,
              labelKey: type,
              labelClass: 'filter-tag-label-light',
              open: false
            });
            elFilters.appendChild(elTypeContainer);
          })
          .then(function() {
            return Promise.all(
              keys.map(function(key) {
                return h.getDictItem(key).then(function(label) {
                  tags.push({
                    key: key,
                    count: tbl[key],
                    label: label,
                    type: type
                  });
                });
              })
            );
          })
          .then(function() {
            tags = tags.sort(function(a, b) {
              if (a.label < b.label) {
                return -1;
              }
              if (a.label > b.label) {
                return 1;
              }
              return 0;
            });

            tags.forEach(function(t) {
              var el = makeEl(t.key, t.label, t.count, t.type);
              elTypeContent.appendChild(el);
            });
          });
      });
    });

  function makeEl(id, label, number, type) {
    var checkToggle = document.createElement('div');
    var checkToggleLabel = document.createElement('label');
    var checkToggleLabelText = document.createElement('span');
    var checkToggleLabelCount = document.createElement('span');
    var checkToggleInput = document.createElement('input');

    checkToggleLabelText.innerText = label;
    checkToggleLabelText.dataset.lang_key = id;
    checkToggleLabelCount.innerText = '( ' + number + ' )';
    /**
     * For update
     */
    checkToggleLabelCount.className = 'mx-check-toggle-filter-count';
    checkToggleLabelCount.dataset.type = type;
    checkToggleLabelCount.dataset.id = id;

    checkToggle.className = 'check-toggle';
    checkToggleInput.className = 'filter check-toggle-input';
    checkToggleInput.setAttribute('type', 'checkbox');
    checkToggleLabel.className = 'check-toggle-label';
    checkToggleInput.id = 'filter_' + id;
    checkToggleInput.dataset.filter = id;
    checkToggleInput.dataset.type = type;

    checkToggleLabel.setAttribute('for', 'filter_' + id);
    //checkToggleLabel.innerHTML =  label.toUp,perCase() + "<span class='check-toggle-badge'> (" + number + ") </span>";
    checkToggleLabel.appendChild(checkToggleLabelText);
    checkToggleLabel.appendChild(checkToggleLabelCount);
    checkToggle.appendChild(checkToggleInput);
    checkToggle.appendChild(checkToggleLabel);
    return checkToggle;
  }
}

/**
 * Filter current view and store rules
 * @param {Object} o Options
 * @param {Array} o.filter Array of filter
 * @param {String} o.type Type of filter : style, legend, time_slider, search_box or numeric_slider
 */
export function viewSetFilter(o) {
  /*jshint validthis:true*/

  o = o || {};
  var view = this;
  var idView = view.id;
  var filter = o.filter;
  var filters = view._filters;
  var filterNew = ['all'];
  var type = o.type ? o.type : 'default';
  var idMap = view._idMap ? view._idMap : mx.settings.map.id;
  var m = mx.helpers.getMap(idMap);
  var layers = mx.helpers.getLayerByPrefix({id: idMap, prefix: idView});

  if (filter && filter.constructor === Array && filter.length > 1) {
    filters[type] = filter;
  } else {
    filters[type] = ['all'];
  }

  for (var t in filters) {
    var f = filters[t];
    filterNew.push(f);
  }

  for (var l = 0, ll = layers.length; l < ll; l++) {
    var layer = layers[l];
    var origFilter = mx.helpers.path(layer, 'metadata.filter_base');
    var filterFinal = [];
    if (!origFilter) {
      filterFinal = filterNew;
    } else {
      filterFinal = filterNew.concat([origFilter]);
    }
    m.setFilter(layer.id, filterFinal);
  }

  mx.helpers.fire('view_filter');
}

/**
 * Set this view opacity
 * @param {Object} o Options
 * @param {Array} o.opacity
 */
export function viewSetOpacity(o) {
  o = o || {};
  var view = this;
  var idView = view.id;
  var opacity = o.opacity;
  var idMap = view._idMap ? view._idMap : mx.settings.map.id;
  var map = mx.helpers.getMap(idMap);
  var layers = mx.helpers.getLayerByPrefix({
    map: map,
    prefix: idView
  });

  layers.forEach((layer) => {
    var property = layer.type + '-opacity';
    map.setPaintProperty(layer.id, property, opacity);
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
  var data = o.data;
  var el = o.el;
  o.type = o.type ? o.type : 'density';

  if (!data || !data.year || !data.n) {
    return;
  }

  var obj = {
    labels: data.year,
    series: [data.n]
  };

  var options = {
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
 * Get layer by prefix
 * @param {Object} o Options
 * @param {string} o.id Map element id
 * @param {string } o.prefix Prefix to search for
 * @return {array} list of layers
 */
export function getLayerByPrefix(o) {
  o = o || {};
  o.prefix = o.prefix || 'MX-';
  o.base = o.base || false;
  var map = o.map || mx.helpers.getMap(o.id);
  var layers, l;
  var out = [];

  if (map) {
    layers = map.style._layers;
    for (l in layers) {
      if (l.indexOf(o.prefix) > -1) {
        out.push(layers[l]);
      }
    }
  }
  return out;
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
  var map = mx.helpers.getMap(o.id);
  var result = [],
    layer;

  if (map && o.idLayer) {
    layer = map.getLayer(o.idLayer);
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
 * Get layer names by prefix
 * @param  {Object} o options
 * @param {String} o.id Map id
 * @param {Object} o.map (optional) Map object
 * @param {String} o.prefix Prefix to search for
 * @param {Boolean} o.base should return base layer only
 * @return {Array} Array of layer names / ids
 */
export function getLayerNamesByPrefix(o) {
  o = o || {};
  o.prefix = o.prefix || 'MX-';
  o.base = o.base || false;
  var map = o.map || mx.helpers.getMap(o.id);
  var layers, l;
  var out = [];
  if (map) {
    layers = map.style._layers;
    for (l in layers) {
      if (o.base) {
        l = getLayerBaseName(l);
      }
      if (l.indexOf(o.prefix) > -1 && out.indexOf(l) === -1) {
        out.push(l);
      }
    }
  }

  return out;
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
  var result = [],
    layers;
  var map = o.map || mx.helpers.getMap(o.id);

  if (!map) {
    return result;
  }

  layers = mx.helpers.getLayerNamesByPrefix({
    map: map,
    prefix: o.prefix
  });

  layers.forEach(function(l) {
    if (map.getLayer(l)) {
      map.removeLayer(l);
      result.push(l);
    }
  });

  return result;
}

/**
 * Search for registered maps and enable/disable position synchronisation
 * @param {object} o options
 * @param {boolean} [o.enabled=false]  Enable synchronisation
 */
export function syncAll(o) {
  var enabled, maps, ids;

  enabled = o.enabled;

  if (!enabled) {
    enabled = false;
  }

  maps = mx.maps;
  ids = [];

  for (var m in maps) {
    ids.push(m);
  }

  ids.forEach(function(x) {
    var others, m, locked, exists, pos, m2;

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
    for (var i in li) {
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
    for (var j in li) {
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
 * Parse view of type cc and add it to the map
 * @param {Object} o Options
 * @param {Object} o.view View data
 * @param {Object} o.map Map object
 * @param {String} o.before Name of an existing layer to insert the new layer(s) before.
 */
function addViewCc(o) {
  var view = o.view;
  var map = o.map;
  var methods = mx.helpers.path(view, 'data.methods');

  if (!methods) {
    return Promise.resolve(true);
  }

  return new Promise(function(resolve, reject) {
    var r = new Function(methods)();
    if (r) {
      resolve(r);
    } else {
      reject(methods);
    }
  }).then(function(cc) {
    if (!(cc.onInit instanceof Function) || !(cc.onClose instanceof Function)) {
      return;
    }

    var opt = {
      map: map,
      view: view,
      idView: view.id,
      idSource: view.id + '-SRC',
      idLegend: 'check_view_legend_' + view.id,
      onClose: cc.onClose,
      onInit: cc.onInit
    };

    opt.elLegend = document.getElementById(opt.idLegend);

    if (opt.map.getSource(opt.idSource)) {
      opt.map.removeSource(opt.idSource);
    }

    mx.helpers.removeLayersByPrefix({
      prefix: opt.idView,
      id: mx.settings.map.id
    });

    view._onRemoveCustomView = function() {
      opt.onClose(opt);
    };

    /**
     * Init custom map
     */
    opt.onInit(opt);
  });
}

/**
 * Parse view of type rt and add it to the map
 * @param {Object} o Options
 * @param {Object} o.view View data
 * @param {Object} o.map Map object
 * @param {String} o.before Name of an existing layer to insert the new layer(s) before.
 */
function addViewRt(o) {
  var view = o.view;
  var map = o.map;
  return new Promise((resolve) => {
    if (!mx.helpers.path(view, 'data.source.tiles')) {
      resolve(false);
    }

    /**
     * source as already be added. Add layer
     */
    map.addLayer(
      {
        id: view.id,
        type: 'raster',
        source: view.id + '-SRC'
      },
      o.before
    );

    /*
     * Add legend
     */
    var legend = mx.helpers.path(view, 'data.source.legend');
    var elLegend = document.querySelector('#check_view_legend_' + view.id);

    if (legend) {
      var defaultImg = function() {
        this.onerror = null;
        this.src = require('../../src/svg/no_legend.svg');
      };

      if (elLegend) {
        var oldImg = elLegend.querySelector('img');
        if (!oldImg) {
          var img = new Image();
          img.src = legend;
          img.alt = 'Legend';
          img.setAttribute('crossorigin', 'anonymous');
          img.onerror = defaultImg;
          img.style = 'cursor:zoom.in';
          elLegend.appendChild(img);
          img.onload = function() {
            elLegend.classList.add('mx-legend-box');
          };
          elLegend.onclick = function() {
            var title = mx.helpers.getLabelFromObjectPath({
              obj: view,
              path: 'data.title',
              defaultKey: 'noTitle'
            });
            var imgModal = new Image();
            imgModal.src = legend;
            imgModal.setAttribute('crossorigin', 'anonymous');
            imgModal.onerror = defaultImg;
            imgModal.alt = 'Legend';
            mx.helpers.modal({
              title: title,
              id: 'legend-raster-' + view.id,
              content: imgModal,
              addBackground: false
            });
          };
        }
      }
    }
    resolve(true);
  });
}

/**
 * Parse view of type vt and add it to the map
 * @param {Object} o Options
 * @param {Object} o.view View data
 * @param {Object} o.map Map object
 * @param {String} o.before Name of an existing layer to insert the new layer(s) before.
 */
export function addViewVt(o) {
  var p = mx.helpers.path;

  return new Promise((resolve) => {
    var view = o.view,
      map = o.map,
      layers = [],
      def = p(view, 'data'),
      idSource = view.id + '-SRC',
      idView = view.id,
      style = p(view, 'data.style'),
      rules = p(view, 'data.style.rules', []),
      zoomConfig = p(view, 'data.style.zoomConfig', {}),
      nulls = p(view, 'data.style.nulls', [])[0],
      hideNulls = p(view, 'data.style.hideNulls', false),
      geomType = p(view, 'data.geometry.type'),
      source = p(view, 'data.source'),
      num = 0,
      styleCustom,
      defaultOrder = true;

    var idSourceLayer = mx.helpers.path(source, 'layerInfo.name');
    if (!idSourceLayer) {
      resolve(false);
    }

    /**
     * Set default
     */
    zoomConfig.zoomMax = zoomConfig.zoomMax || 22;
    zoomConfig.zoomMin = zoomConfig.zoomMin || 0;
    zoomConfig.sizeFactorZoomMax = zoomConfig.sizeFactorZoomMax || 0;
    zoomConfig.sizeFactorZoomMin = zoomConfig.sizeFactorZoomMin || 0;
    zoomConfig.sizeFactorZoomExponent = zoomConfig.sizeFactorZoomExponent || 1;

    /**
     * Parse custom style
     */
    styleCustom = JSON.parse(p(style, 'custom.json'));

    /**
     * Add source meta
     */
    if (!view._meta) {
      /**
       * ! metadata are added erlier, using mx.helpers.addSourceMetadataToView()
       */
      view._meta = {};
    }

    var sepLayer = p(mx, 'settings.separators.sublayer') || '@';

    /**
     * clean values
     */

    rules = rules.filter(function(r) {
      return r && r.value !== undefined;
    });
    rules = rules instanceof Array ? rules : [rules];
    rules = mx.helpers.clone(rules);
    if (nulls && !hideNulls) {
      nulls.isNullRule = true;
      rules.push(nulls);
    }

    if (style && style.reverseLayer === true) {
      defaultOrder = false;
      num = rules.length || 1;
    }

    var ruleAll = rules.filter(function(r) {
      return r.value === 'all';
    });
    var idLayer;
    var getIdLayer = function() {
      idLayer = idView + sepLayer + (defaultOrder ? num++ : num--);
      return idLayer;
    };

    var hasStyleCustom =
      styleCustom &&
      styleCustom instanceof Object &&
      styleCustom.enable === true;
    var hasStyleRules = rules.length > 0 && rules[0].value !== undefined;
    var hasRuleAll = ruleAll.length > 0;

    /**
     * Make custom layer
     */
    if (hasStyleCustom) {
      var layerCustom = {
        id: getIdLayer(),
        source: idSource,
        'source-layer': idView,
        type: styleCustom.type || 'circle',
        paint: styleCustom.paint || {},
        layout: styleCustom.layout || {},
        minzoom: styleCustom.minzoom || zoomConfig.zoomMin,
        maxzoom: styleCustom.maxzoom || zoomConfig.zoomMax
      };

      layers.push(layerCustom);

      view._setFilter({
        filter: styleCustom.filter || ['all'],
        type: 'custom_style'
      });
    }

    /**
     * Create layer for single rule covering all values
     */
    if (hasRuleAll && !hasStyleCustom) {
      var rule = ruleAll.splice(0, 1, 1)[0];

      /**
       * add a second layer for symbol if point + sprite
       */
      if (rule.sprite && rule.sprite !== 'none' && geomType === 'point') {
        var layerSprite = makeSimpleLayer({
          id: getIdLayer(),
          idSource: idSource,
          idSourceLayer: idView,
          geomType: 'symbol',
          hexColor: rule.color,
          opacity: rule.opacity,
          size: rule.size,
          sizeFactorZoomExponent: zoomConfig.sizeFactorZoomExponent,
          sizeFactorZoomMax: zoomConfig.sizeFactorZoomMax,
          sizeFactorZoomMin: zoomConfig.sizeFactorZoomMin,
          zoomMax: zoomConfig.zoomMax,
          zoomMin: zoomConfig.zoomMin,
          sprite: rule.sprite
        });

        layers.push(layerSprite);
      }

      if (rule.sprite && rule.sprite !== 'none' && geomType === 'polygon') {
        var layerPattern = makeSimpleLayer({
          id: getIdLayer(),
          idSource: idSource,
          idSourceLayer: idView,
          geomType: 'pattern',
          hexColor: rule.color,
          opacity: rule.opacity,
          size: rule.size,
          sizeFactorZoomExponent: zoomConfig.sizeFactorZoomExponent,
          sizeFactorZoomMax: zoomConfig.sizeFactorZoomMax,
          sizeFactorZoomMin: zoomConfig.sizeFactorZoomMin,
          zoomMax: zoomConfig.zoomMax,
          zoomMin: zoomConfig.zoomMin,
          sprite: rule.sprite
        });

        layers.push(layerPattern);
      }

      /*
       * add the layer for all
       */
      var layerAll = makeSimpleLayer({
        id: getIdLayer(),
        idSourceLayer: idView,
        idSource: idSource,
        geomType: geomType,
        hexColor: rule.color,
        opacity: rule.opacity,
        size: rule.size,
        sizeFactorZoomExponent: zoomConfig.sizeFactorZoomExponent,
        sizeFactorZoomMax: zoomConfig.sizeFactorZoomMax,
        sizeFactorZoomMin: zoomConfig.sizeFactorZoomMin,
        zoomMax: zoomConfig.zoomMax,
        zoomMin: zoomConfig.zoomMin,
        sprite: rule.sprite
      });

      layers.push(layerAll);
    }

    /*
     * Apply default style is no style is defined
     */
    if (!hasStyleRules && !hasStyleCustom) {
      var layerDefault = makeSimpleLayer({
        id: getIdLayer(),
        idSource: idSource,
        idSourceLayer: idView,
        geomType: geomType,
        sizeFactorZoomExponent: zoomConfig.sizeFactorZoomExponent,
        sizeFactorZoomMax: zoomConfig.sizeFactorZoomMax,
        sizeFactorZoomMin: zoomConfig.sizeFactorZoomMin,
        zoomMax: zoomConfig.zoomMax,
        zoomMin: zoomConfig.zoomMin
      });

      layers.push(layerDefault);
    }

    /*
     * Apply style if avaialble
     */
    if (hasStyleRules && !hasRuleAll && !hasStyleCustom) {
      /* convert opacity to rgba */
      rules.forEach(function(rule) {
        rule.rgba = mx.helpers.hex2rgba(rule.color, rule.opacity);
        rule.rgb = mx.helpers.hex2rgba(rule.color);
      });

      /**
       * evaluate rules
       */
      rules.forEach(function(rule, i) {
        var value = rule.value;
        var isNullRule = rule.isNullRule === true;
        var max = p(view, 'data.attribute.max') + 1;
        //var min = p(view, 'data.attribute.min') - 1;
        var nextRule = rules[i + 1];
        var nextRuleIsNullRule = nextRule && nextRule.isNullRule;
        var nextValue =
          nextRule && !nextRuleIsNullRule
            ? nextRule.value !== undefined
              ? nextRule.value
              : max
            : max;
        var isNumeric = p(view, 'data.attribute.type') === 'number';
        var idView = view.id;
        var filter = ['all'];
        var attr = def.attribute.name;
        //var paint = {};
        //var layerSprite = {};

        /**
         * Set filter
         */

        //if( isNullRule && isNumeric && value !== null ){
        //if( value || value === 0 ){
        //value = value * 1;
        //}else{
        //value = null;
        //}
        /*}*/

        if (!isNullRule) {
          if (isNumeric) {
            /**
             * Case where attr to filter is numeric
             */
            filter.push(['>=', attr, value]);
            filter.push(['<', attr, nextValue]);
          } else {
            /**
             * String and boolean
             */
            filter.push(['==', attr, value]);
          }
        } else {
          if (isNumeric) {
            if (value) {
              /**
               * Convert to numeric if there is a value, included 0
               */

              filter.push(['==', attr, value * 1]);
            } else {
              /**
               * As we can't [==, attr, null], try to use has
               */
              filter.push(['==', attr, '']);
            }
          } else {
            if (value || value === false) {
              filter.push(['==', attr, value]);
            } else {
              filter.push(['==', attr, '']);
            }
          }
        }

        rule.filter = filter;

        /**
         * Add layer for symbols
         */
        if (rule.sprite && rule.sprite !== 'none' && geomType === 'point') {
          var layerSymbol = makeSimpleLayer({
            id: getIdLayer(),
            idSource: idSource,
            idSourceLayer: idView,
            geomType: 'symbol',
            hexColor: rule.color,
            opacity: rule.opacity,
            size: rule.size,
            sizeFactorZoomExponent: zoomConfig.sizeFactorZoomExponent,
            sizeFactorZoomMax: zoomConfig.sizeFactorZoomMax,
            sizeFactorZoomMin: zoomConfig.sizeFactorZoomMin,
            zoomMax: zoomConfig.zoomMax,
            zoomMin: zoomConfig.zoomMin,
            sprite: rule.sprite,
            filter: filter
          });

          layers.push(layerSymbol);
        }

        if (rule.sprite && rule.sprite !== 'none' && geomType === 'polygon') {
          var layerPattern = makeSimpleLayer({
            id: getIdLayer(),
            idSource: idSource,
            idSourceLayer: idView,
            geomType: 'pattern',
            hexColor: rule.color,
            opacity: rule.opacity,
            size: rule.size,
            sizeFactorZoomExponent: zoomConfig.sizeFactorZoomExponent,
            sizeFactorZoomMax: zoomConfig.sizeFactorZoomMax,
            sizeFactorZoomMin: zoomConfig.sizeFactorZoomMin,
            zoomMax: zoomConfig.zoomMax,
            zoomMin: zoomConfig.zoomMin,
            sprite: rule.sprite,
            filter: filter
          });

          layers.push(layerPattern);
        }

        /**
         * Add layer for curent rule
         */
        var layerMain = makeSimpleLayer({
          id: getIdLayer(),
          idSource: idSource,
          idSourceLayer: idView,
          geomType: geomType,
          hexColor: rule.color,
          opacity: rule.opacity,
          size: rule.size,
          sizeFactorZoomExponent: zoomConfig.sizeFactorZoomExponent,
          sizeFactorZoomMax: zoomConfig.sizeFactorZoomMax,
          sizeFactorZoomMin: zoomConfig.sizeFactorZoomMin,
          zoomMax: zoomConfig.zoomMax,
          zoomMin: zoomConfig.zoomMin,
          sprite: rule.sprite,
          filter: filter
        });

        layers.push(layerMain);
      });
    }

    /**
     * Add layer and legends
     */
    if (layers.length > 0) {
      /**
       * handle order
       */
      if (defaultOrder) {
        layers = layers.reverse();
      }

      /*
       * Add layers to map
       */
      layers.forEach(function(layer) {
        map.addLayer(layer, o.before);
      });

      /*
       * Update layer order based in displayed list
       */
      updateViewOrder(o);

      /**
       * Evaluate rules;
       * - If next rules is identical, remove it from legend
       * - Set sprite path
       */
      if (!o.noLegend && hasStyleRules) {
        var elLegend = document.querySelector('#check_view_legend_' + view.id);

        if (elLegend) {
          for (var i = 0; i < rules.length; i++) {
            if (rules[i]) {
              var ruleHasSprite = rules[i].sprite && rules[i].sprite !== 'none';
              var nextRuleIsSame =
                !!rules[i + 1] && rules[i + 1].value === rules[i].value;
              var nextRuleHasSprite =
                !!rules[i + 1] &&
                rules[i + 1].sprite &&
                rules[i + 1].sprite !== 'none';

              if (ruleHasSprite) {
                rules[i].sprite =
                  'url(sprites/svg/' + rules[i].sprite + '.svg)';
              } else {
                rules[i].sprite = null;
              }

              if (nextRuleIsSame) {
                if (nextRuleHasSprite) {
                  rules[i].sprite =
                    rules[i].sprite +
                    ',' +
                    'url(sprites/svg/' +
                    rules[i + 1].sprite +
                    '.svg)';
                }
                rules[i + 1] = null;
              }
            }
          }
          /**
           * Update rules
           */
          view.data.style.rulesCopy = rules;

          /*
           * Add legend using template
           */
          elLegend.innerHTML = mx.templates.viewListLegend(view);
        }
      }
    }

    resolve(true);
  });
}

/**
 * Add option and legend box for the given view
 * @param {Object} o Options
 * @param {String} o.id map id
 * @param {Object} o.view View item
 * @param {Boolean} o.noUi Don't add ui components
 */
export function addOptions(o) {
  var view = o.view;

  view._idMap = o.id;
  view._interactive = {};
  view._filters = {
    style: ['all'],
    legend: ['all'],
    time_slider: ['all'],
    search_box: ['all'],
    numeric_slider: ['all'],
    custom_style: ['all']
  };
  view._setFilter = mx.helpers.viewSetFilter;
  view._setOpacity = mx.helpers.viewSetOpacity;

  if (!o.noUi) {
    var elOptions = document.querySelector(
      "[data-view_options_for='" + view.id + "']"
    );

    if (elOptions) {
      //var optMade = new Promise(function(resolve,reject){
      //resolve(elOptions);
      //});
      //optMade.then(function(el){
      /*  mx.helpers.uiReadMore('.make-readmore',{*/
      //selectorParent : el,
      //maxHeightClosed : 105,
      //maxHeightOpened : 400
      //});
      //});

      elOptions.innerHTML = mx.templates.viewListOptions(view);
      mx.helpers.makeTimeSlider({view: view, idMap: o.id});
      mx.helpers.makeNumericSlider({view: view, idMap: o.id});
      mx.helpers.makeTransparencySlider({view: view, idMap: o.id});
      mx.helpers.makeSearchBox({view: view, idMap: o.id});

      /*
       * translate based on dict key
       */
      mx.helpers.updateLanguageElements({
        el: elOptions
      });
    }
  }
}

/**
 * Add MapX view on the map
 * @param {object} o Options
 * @param {string} o.id map id
 * @param {string} o.idView view id
 * @param {objsect} o.viewData view
 * @param {Boolean} o.noUi Don't add ui components
 * @param {string} o.idViewsList id of ui views list element
 * @param {string} o.before Layer before which insert this view layer(s)
 * @param
 */
export function addView(o) {
  var m = mx.helpers.getMapData(o.id);
  var view = o.viewData;
  var idMap = o.id;

  if (!o.viewData && !o.idView) {
    console.log('Add view called without idView or view Data. Options :');
    console.log(o);
    return;
  }

  if (o.before) {
    var l = mx.helpers.getLayerNamesByPrefix({
      id: o.id,
      prefix: o.before
    });
    o.before = l[0];
  } else {
    o.before = mx.settings.layerBefore;
  }

  /* Remove previous layer if needed */
  mx.helpers.removeLayersByPrefix({
    id: o.id,
    prefix: view ? view.id : o.idView
  });

  /* replace it to have current values */
  if (view && view.id) {
    var viewIndex;

    var oldView = mx.helpers.getViews({
      id: o.id,
      idView: view.id
    });

    /*
     * NOTE: this should be passed as an option:
     * update a view should not be evaluated by comparison..
     */
    var hasChanged = !mx.helpers.isEqual(oldView, view);

    if (hasChanged) {
      /*
       * This is an refresh or update
       */
      mx.helpers.cleanRemoveModules(oldView);
      viewIndex = m.views.indexOf(oldView);
      m.views[viewIndex] = view;
      mx.helpers.updateLanguageViewsList({id: o.id});
      mx.helpers.updateViewsFilter();
    }
  }

  /*
   * If id view, get view data
   */
  if (o.idView) {
    o.idView = o.idView.split(mx.settings.separators.sublayer)[0];
    view = mx.helpers.getViews(o);
  }

  if (!view.id) {
    console.log('View ' + o.idView + ' not found');
    return;
  }

  /**
   * Add options
   */
  mx.helpers.addOptions({
    id: o.id,
    view: view,
    noUi: o.noUi
  });

  /*
   * Check if dashboard data is there and build it if needed
   */
  if (!o.noUi) {
    mx.helpers.Dashboard.init({
      idContainer: 'mxDashboards',
      idDasboard: 'mx-dashboard-' + view.id,
      idMap: idMap,
      view: view
    });
  }

  /**
   * Add source from view
   */
  mx.helpers.addSourceFromView({
    map: m.map,
    view: view
  });

  /**
   * Add view
   */
  handler(view.type);

  /**
   * handler based on view type
   */
  function handler(viewType) {
    /* Switch on view type*/
    var handler = {
      rt: function() {
        return addViewRt({
          view: view,
          map: m.map,
          before: o.before
        });
      },
      cc: function() {
        return addViewCc({
          view: view,
          map: m.map,
          before: o.before
        });
      },
      vt: function() {
        return addViewVt({
          view: view,
          map: m.map,
          debug: o.debug,
          before: o.before
        });
      },
      gj: function() {
        return addViewGj({
          view: view,
          map: m.map,
          before: o.before
        });
      },
      sm: function() {
        return Promise.resolve(true);
      }
    };

    /* Call function according to view type */
    handler[viewType]().catch(function(e) {
      mx.helpers.modal({
        id: 'modalError',
        title: 'Error',
        content: '<p>Error during methods evaluation :' + e
      });
    });
  }
}

export function addViewGj(opt) {
  return new Promise((resolve) => {
    var layer = mx.helpers.path(opt.view, 'data.layer');
    opt.map.addLayer(layer, opt.before);
    resolve(true);
  });
}

/**
 * Add source, handle existing
 * @param {Object} o Options
 * @param {String} o.id  Map id
 * @param {String} o.idSource  Source id
 * @param {Object} o.source Source values
 */
export function addSource(o) {
  var map = mx.helpers.getMap(o.id);

  if (map) {
    var sourceExists =
      Object.keys(map.style.sourceCaches).indexOf(o.idSource) > -1;

    if (sourceExists) {
      map.removeSource(o.idSource);
    }

    map.addSource(o.idSource, o.source);
  }
}

/**
 * Apply a filter on a layer
 * @param {object} o Options
 * @param {string} o.id Map id
 * @param {string} o.idView  view id
 * @param {array} o.filter Filter array to apply
 */
export function setFilter(o) {
  var exists = !!document.getElementById(o.id);
  if (exists) {
    var m = mx.helpers.getMap(o.id);
    m.setFilter(o.idView, o.filter);
  }
}
/**
 * Apply a filter on country-code
 * @param {object} o Options
 * @param {string} o.id Map id
 * @param {string} o.idLayer layer id
 * @param {array} o.countries Array of countries code
 */
export function setHighlightedCountries(o) {
  var countries = o.countries || null;
  var filter = [];
  var m = mx.helpers.getMap(o.id);
  var hasCountries = mx.helpers.isArray(countries) && countries.length > 0;
  var hasWorld = hasCountries && countries.indexOf('WLD') > -1;
  var rule = ['==', 'iso3code', ''];
  mx.settings.highlightedCountries = hasCountries ? countries : [];

  if (hasCountries && !hasWorld) {
    rule = ['!in', 'iso3code'].concat(countries);
  }

  filter = ['any', rule, ['!has', 'iso3code']];

  m.setFilter(o.idLayer, filter);
}

/**
 * Return the intersect between two Polygons or multiPolygon
 * @param {Object} poly1
 * @param {Object} poly2
 * @return {Object} Intersect or null
 */
export function intersect(poly1, poly2) {
  return Promise.all([
    import('martinez-polygon-clipping'),
    import('@turf/helpers')
  ]).then((m) => {
    var martinez = m[0];
    var helpers = m[1];

    var polygon = helpers.polygon;
    var multiPolygon = helpers.multiPolygon;

    var geom1 = poly1.geometry;
    var geom2 = poly2.geometry;
    var properties = poly1.properties || {};

    var intersection = martinez.intersection(
      geom1.coordinates,
      geom2.coordinates
    );
    if (intersection === null || intersection.length === 0) {
      return null;
    }
    if (intersection.length === 1) {
      var start = intersection[0][0][0];
      var end = intersection[0][0][intersection[0][0].length - 1];
      if (start[0] === end[0] && start[1] === end[1]) {
        return polygon(intersection[0], properties);
      }
      return null;
    }
    return multiPolygon(intersection, properties);
  });
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
  var map = mx.helpers.getMap(o.id);

  if (map) {
    var calcAreaWorker = require('./mx_helper_calc_area.worker.js');
    var layers = mx.helpers.getLayerNamesByPrefix({
      id: o.id,
      prefix: o.prefix
    });

    if (layers.length > 0) {
      var features = map.queryRenderedFeatures({layers: layers});

      var geomTemp = {
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

      var data = {
        geojson: geomTemp,
        bbox: getBoundsArray(o)
      };

      var worker = new calcAreaWorker();
      worker.postMessage(data);
      worker.addEventListener('message', function(e) {
        if (e.data.message) {
          o.onMessage(e.data.message);
        }
        if (e.data.end) {
          o.onEnd(e.data.end);
        }
      });
    }
  }
}

export function sendRenderedLayersAreaToUi(o) {
  var el = document.getElementById(o.idEl);
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
  var map = o.map || mx.maps[o.id].map;
  var a = map.getBounds();
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
  var h = mx.helpers;
  var map = h.getMap(opt.map);
  var hasViewId = h.isString(opt.idView);
  var modeObject = opt.asObject === true || false;
  var items = {};
  var idViews = [];
  var excludeProp = ['mx_t0', 'mx_t1', 'gid'];
  var type = opt.type || 'vt' || 'rt' || 'gj';
  type = h.isArray(type) ? type : [type];
  /**
   * Use id from idView as array OR get all mapx displayed base layer
   * to get array of view ID.
   */
  idViews = hasViewId
    ? [opt.idView]
    : h.getLayerNamesByPrefix({
        map: map,
        base: true,
        prefix: 'MX-'
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
    .filter((view) => type.indexOf(view.type) > -1)
    .forEach((view) => {
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
    var url = h.path(view, 'data.source.tiles', [])[0].split('?');
    var endpoint = url[0];
    var params = h.paramsToObject(url[1]);
    var out = modeObject ? {} : [];
    /**
     * Check if this is a WMS valid param object
     */
    var isWms =
      params &&
      params.layers &&
      params.service &&
      params.service.toLowerCase() === 'wms';

    if (isWms) {
      return h.queryWms({
        point: opt.point,
        layers: params.layers,
        styles: params.styles,
        url: endpoint,
        asObject: modeObject
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
      var id = view.id;

      var layers = h.getLayerNamesByPrefix({
        map: map,
        prefix: id
      });

      var features = map.queryRenderedFeatures(opt.point, {
        layers: layers
      });

      var out = modeObject ? {} : [];

      features.forEach((f) => {
        if (modeObject) {
          for (var p in f.properties) {
            /**
             * Exclude prop (time, gid, etc)
             */
            if (excludeProp.indexOf(p) === -1) {
              /**
               * Aggregate value by attribute
               */
              var value = f.properties[p];
              var values = out[p] || [];
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
export function makeSearchBox(o) {
  var view = o.view;
  var el = document.querySelector("[data-search_box_for='" + view.id + "']");
  //var hasSelectize = typeof window.jQuery === "function" && window.jQuery().selectize;
  if (!el) {
    return;
  }

  makeSelectize();

  function tableToData(table) {
    var r, rL, row, res;
    var data = [];
    for (r = 0, rL = table.length; r < rL; r++) {
      row = table[r];
      res = {};
      res.value = row.value;
      res.label = row.value;
      data.push(res);
    }
    return data;
  }

  function makeSelectize() {
    return mx.helpers.moduleLoad('selectize').then(() => {
      var table = mx.helpers.path(view, 'data.attribute.table');
      var attr = mx.helpers.path(view, 'data.attribute.name');
      var data = tableToData(table);

      var selectOnChange = function() {
        var view = this.view;
        var listObj = this.getValue();
        var filter = ['any'];
        listObj.forEach(function(x) {
          filter.push(['==', attr, x]);
        });
        view._setFilter({
          filter: filter,
          type: 'search_box'
        });
      };

      var searchBox = $(el)
        .selectize({
          placeholder: 'Search',
          choices: data,
          valueField: 'value',
          labelField: 'label',
          searchField: ['value'],
          options: data,
          onChange: selectOnChange
        })
        .data().selectize;
      /**
       * Save selectr object in the view
       */
      searchBox.view = view;
      view._interactive.searchBox = searchBox;
    });
  }
}

export function filterViewValues(o) {
  var attr, idMap, idView, search;
  var view, map, features, values, filter;
  var isNumeric;

  attr = o.attribute;
  idMap = o.id;
  idView = o.idView;
  search = o.search;
  operator = o.operator || '>=';
  filterType = o.filterType || 'filter';

  search = search.trim();
  isNumeric = mx.helpers.isNumeric(search);
  view = mx.helpers.getViews({id: idMap, idView: idView});

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
        var value = f.properties[attr];
        var splited = value.split(/\s*,\s*/);
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
 */
export function addLayer(o) {
  var map = mx.helpers.getMap(o.id);
  if (map) {
    if (o.layer.id in map.style._layers) {
      console.log('Layer already exists');
    } else {
      map.addLayer(o.layer, o.before);
    }
  }
}

/**
 * Fly to view id using geometry extent
 * @param {object} o options
 * @param {string} o.id map id
 * @param {string} o.idView view id
 */
export function zoomToViewId(o) {
  var view, isArray, extent, llb;
  var map = mx.helpers.getMap(o.id);
  if (map) {
    isArray = o.idView.constructor === Array;

    o.idView = isArray ? o.idView[0] : o.idView;
    /* in case of layer group */
    o.idView = o.idView.split(mx.settings.separators.sublayer)[0];
    /* get map and view */
    view = mx.helpers.getViews(o);

    if (!view) {
      return;
    }

    extent = mx.helpers.path(view, 'data.geometry.extent');

    if (!extent) {
      return;
    }

    llb = new mx.mapboxgl.LngLatBounds(
      [extent.lng1, extent.lat1],
      [extent.lng2, extent.lat2]
    );

    if (llb) {
      try {
        map.fitBounds(llb);
      } catch (err) {
        console.log(err);
      }
    }
  }
}

/**
 * Find bounds of a series of views
 * @param {Array} views Array of views
 * @return {Object} MapBox gl bounds object
 */
export function getViewsBounds(views) {
  return new Promise(function(resolve) {
    var bounds;
    var h = mx.helpers;
    views = views.constructor === Array ? views : [views];

    var extent = {
      lat1: -80,
      lat2: 80,
      lng1: -180,
      lng2: 180
    };

    views.forEach((v, i) => {
      var ext = h.path(v, 'data.geometry.extent');
      if (ext) {
        if (i === 0) {
          extent = ext;
        }
        extent = {
          lat1: ext.lat1 > extent.lat1 ? ext.lat1 : extent.lat1,
          lat2: ext.lat2 < extent.lat2 ? ext.lat2 : extent.lat2,
          lng1: ext.lng1 > extent.lng1 ? ext.lng1 : extent.lng1,
          lng2: ext.lng2 < extent.lng2 ? ext.lng2 : extent.lng2
        };
      }
    });

    bounds = new mx.mapboxgl.LngLatBounds(
      [extent.lng1, extent.lat1],
      [extent.lng2, extent.lat2]
    );

    resolve(bounds);
  });
}

/**
 * Fly to view id using rendered features
 * @param {object} o options
 * @param {string} o.id map id
 * @param {string} o.idView view id
 */
export function zoomToViewIdVisible(o) {
  return mx.helpers
    .moduleLoad('turf-bbox')
    .then((bbox) => {
      var geomTemp, idLayerAll, features;

      geomTemp = {
        type: 'FeatureCollection',
        features: []
      };

      var map = mx.helpers.getMap(o.id);

      if (map) {
        idLayerAll = mx.helpers.getLayerNamesByPrefix({
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
          var bbx = bbox(geomTemp);
          var sw = new mx.mapboxgl.LngLat(bbx[0], bbx[1]);
          var ne = new mx.mapboxgl.LngLat(bbx[2], bbx[3]);
          var llb = new mx.mapboxgl.LngLatBounds(sw, ne);
          map.fitBounds(llb);
        }
      }
    })
    .catch((err) => {
      throw new Error(err);
    });
}

export function resetViewStyle(o) {
  if (!o.id || !o.idView) {
    return;
  }

  mx.helpers.addView({
    id: o.id,
    idView: o.idView
  });
}

/**
 * Fly to location and zoom
 * @param {object} o options
 * @param {string} o.id map id
 * @param {boolean} o.jump
 * @param {number} o.param Parameters to use
 */
export function flyTo(o) {
  var map = mx.helpers.getMap(o.id);

  if (map) {
    var p = o.param;

    if (!o.fromQuery && p.fitToBounds === true && !p.jump) {
      map.fitBounds([p.w || 0, p.s || 0, p.e || 0, p.n || 0]);
    } else {
      var opt = {
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
 * Toggle visibility for existing layer in style
 * TODO: This is quite messy : simplify, generalize
 * @param {Object} o options
 * @param {String} o.id map id
 * @param {String} o.idLayer Layer id to toggle
 * @param {String} o.idSwitch Add a class "active" to given element id.
 * @param {String} o.action hide, show, toggle
 * @return {String} Toggled
 */
export function btnToggleLayer(o) {
  var shades;

  o.id = o.id || mx.settings.map.id;
  var map = mx.helpers.getMap(o.id);
  var btn = document.getElementById(o.idSwitch);
  var lay = map.getLayer(o.idLayer);

  if (!lay) {
    alert("Layer '" + o.idLayer + "' not found");
    return;
  }

  o.action = o.action || 'toggle';
  var isAerial = o.idLayer === 'here_aerial'; // hide also shades...
  var toShow = o.action === 'show';
  var toHide = o.action === 'hide';
  var isVisible = lay.visibility === 'visible';
  var toToggle =
    o.action === 'toggle' || (toShow && !isVisible) || (toHide && isVisible);

  if (isAerial) {
    shades = mx.helpers.getLayerNamesByPrefix({id: o.id, prefix: 'shade'});
  }

  if (toToggle) {
    if (isVisible) {
      map.setLayoutProperty(o.idLayer, 'visibility', 'none');
      if (isAerial) {
        shades.forEach(function(s) {
          map.setLayoutProperty(s, 'visibility', 'visible');
        });
      }
      if (btn) {
        btn.classList.remove('active');
      }
    } else {
      map.setLayoutProperty(o.idLayer, 'visibility', 'visible');
      if (isAerial) {
        shades.forEach(function(s) {
          map.setLayoutProperty(s, 'visibility', 'none');
        });
      }
      if (btn) {
        btn.classList.add('active');
      }
    }
  }
  return toToggle;
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
  var resolution = (2 * Math.PI * 6378137) / 256 / Math.pow(2, z),
    merc_x = x * resolution - (2 * Math.PI * 6378137) / 2.0,
    merc_y = y * resolution - (2 * Math.PI * 6378137) / 2.0;

  return [merc_x, merc_y];
}

/**
 * Get a view title by id or view object
 * @param {String|Object} id  View id or view
 * @param {String} lang Optional. Language : e.g. fr, en, sp ..
 * @return {String} title
 */
export function getViewTitle(id, lang) {
  var view = id;
  if (typeof id === 'string') {
    view = mx.helpers.getView(id);
  }
  lang = lang || mx.settings.language;
  var langs = mx.settings.languages;

  return mx.helpers.getLabelFromObjectPath({
    obj: view,
    path: 'data.title',
    lang: lang,
    langs: langs,
    defaultKey: 'noTitle'
  });
}
/**
 * Get a view desc by id or view object
 * @param {String|Object} id  View id or view
 * @param {String} lang Optional. Language : e.g. fr, en, sp ..
 * @return {String} desc
 */
export function getViewDescription(id, lang) {
  var view = id;
  if (typeof id === 'string') {
    view = mx.helpers.getView(id);
  }
  lang = lang || mx.settings.language;
  var langs = mx.settings.languages;

  return mx.helpers.getLabelFromObjectPath({
    obj: view,
    path: 'data.abstract',
    lang: lang,
    langs: langs,
    defaultKey: ''
  });
}

export function getViewLegend(id, opt) {
  opt = opt || {};

  var h = mx.helpers;
  if (h.isView(id)) {
    id = id.id;
  }
  var elLegend = document.getElementById('check_view_legend_' + id);

  mx.helpers.convertAllImagesToBase64(elLegend);

  if (elLegend && opt.clone === true) {
    elLegend = elLegend.cloneNode(true);
  }
  if (elLegend && opt.clone === true && opt.input === false) {
    elLegend.querySelectorAll('input').forEach((e) => e.remove());
  }
  return elLegend || h.el('div');
}

/**
 * Get a map object by id
 * @param {String|Object} idMap Id of the map or the map itself.
 * @return {Object} map
 */
export function getMap(idMap) {
  idMap = idMap || mx.settings.map.id;
  var map = {};

  var isId = typeof idMap === 'string';
  var isMap = !isId && mx.helpers.isMap(idMap);

  if (isMap) {
    return idMap;
  }

  if (isId && mx.maps[idMap]) {
    map = mx.maps[idMap].map;
    map.id = idMap;
  }

  if (mx.helpers.isMap(map)) {
    return map;
  } else {
    return null;
  }
}

/**
 * Get a map data object (map and views) by id of the map
 * @param {String} idMap Id of the map
 * @return {Object} data
 */
export function getMapData(idMap) {
  idMap = idMap || mx.settings.map.id;
  var data = mx.maps[idMap || mx.settings.map.id];
  data.id = idMap;
  return data;
}

/**
 * Get map position summary
 * @param {object} o options
 * @param {string} o.id map id
 */
export function getMapPos(o) {
  o = o || {};
  var out, map, bounds, center, zoom, bearing, pitch;
  var r = mx.helpers.round;
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
 * @param {String} o.asArray Default is false, return an object
 * @param {String} o.idView Optional. Filter view to return. Default = all.
 * @param {String} o.type Optional. Filter by type
 * @return {Object | Array} array of views or object with views id as key
 */
export function getViews(o) {
  o = o || mx.settings.map.id;

  var asArray = o.asArray || false;
  var byMapId = typeof o === 'string';
  var out = asArray ? [] : {};
  var id = byMapId ? o : o.id;
  var dat = mx.helpers.getMapData(id);
  var idView =
    byMapId || !o.idView
      ? []
      : o.idView instanceof Array
      ? o.idView
      : [o.idView];
  var type = o.type;

  var hasNoViews = !dat || !dat.views || dat.views.length === 0;

  var hasFilter = idView.length > 0 || typeof type !== 'undefined';

  if (hasNoViews) {
    return out;
  }

  /**
   * Set default
   */
  var views = dat.views;

  /**
   * Full result
   */
  var retFullArray = asArray && !hasFilter;
  var retFullObject = !asArray && !hasFilter;

  /**
   * Filtered result
   */
  var retFilteredArray = asArray && hasFilter;
  var retFilteredObject = !asArray && hasFilter;

  /**
   * Return all views in array
   */
  if (retFullArray) {
    return views;
  }

  /**
   * Return full object with id as key
   */
  if (retFullObject) {
    views.forEach((v) => {
      out[v.id] = v;
    });
    return out;
  }

  /**
   * Return filtered view
   */
  if (retFilteredArray || retFilteredObject) {
    out = views.filter((v) => {
      return idView.indexOf(v.id) > -1 || (type ? v.type === type : false);
    });

    if (retFilteredArray) {
      return out;
    } else {
      /*
       * NOTE: This break the general logic. if result should returned as an object,
       * {'mx-id-view':{<view>}} form should be used to match retFullObject output.
       * Check where this is used and modify it
       */
      return out[0] || [];
    }
  }

  return out;
}

/**
 * Return a single view
 * @param {String} id of the view
 * @param {String} idMap Id of the map
 */
export function getView(id, idMap) {
  if (typeof id === 'string') {
    return mx.helpers.getViews({idView: id, id: idMap});
  } else {
    return id;
  }
}

/**
 * Toy function to make layer move
 */
export function makeLayerJiggle(mapId, prefix) {
  /*jshint validthis:true*/

  var layersName = mx.helpers.getLayerNamesByPrefix({
    id: mapId,
    prefix: prefix
  });

  if (layersName.length > 0) {
    var varTranslate = {
      line: 'line-translate',
      fill: 'fill-translate',
      circle: 'circle-translate',
      symbol: 'icon-translate'
    };

    var m = mx.helpers.getMap(mapId);

    layersName.forEach(function(x) {
      var l = m.getLayer(x);
      var t = l.type;
      var o = varTranslate[t];
      var n = 0;
      var max = 20;
      var time = 200;
      var dist = [[-20, 0], [20, 0]];
      var interval = setInterval(function() {
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
 * Take every layer and randomly change the color
 * @param {string} mapId Map identifier
 */
export function randomFillAll() {
  setInterval(function() {
    var map = mx.helpers.getMap(idMap);

    var layers = map.style._layers;

    //map.setBearing(Math.random() * 360);
    //map.setPitch(Math.random() * 60);

    for (var l in layers) {
      var type = layers[l].type;
      if (type) {
        switch (type) {
          case 'fill':
            map.setPaintProperty(l, 'fill-color', mx.helpers.randomHsl(1));
            break;
          case 'background':
            map.setPaintProperty(
              l,
              'background-color',
              mx.helpers.randomHsl(1)
            );
            break;
          case 'line':
            map.setPaintProperty(l, 'line-color', mx.helpers.randomHsl(1));
            break;
        }
      }
    }
  }, 100);
}

export function randomUicolor() {
  mx.helpers.setUiColorScheme({
    colors: {
      mx_ui_text: mx.helpers.randomHsl(1),
      mx_ui_text_faded: mx.helpers.randomHsl(1),
      mx_ui_hidden: mx.helpers.randomHsl(1),
      mx_ui_border: mx.helpers.randomHsl(1),
      mx_ui_background: mx.helpers.randomHsl(1),
      mx_ui_shadow: mx.helpers.randomHsl(1),
      mx_map_text: mx.helpers.randomHsl(1),
      mx_map_background: mx.helpers.randomHsl(1),
      mx_map_mask: mx.helpers.randomHsl(1),
      mx_map_water: mx.helpers.randomHsl(1),
      mx_map_road: mx.helpers.randomHsl(1),
      mx_map_road_border: mx.helpers.randomHsl(1),
      mx_map_building: mx.helpers.randomHsl(1),
      mx_map_admin: mx.helpers.randomHsl(1),
      mx_map_admin_disputed: mx.helpers.randomHsl(1)
    }
  });
}
