const modules = {
  topojson: loadTopoJSON,
  d3: loadD3,
  'd3-geo': loadD3Geo,
  shapefile: loadShapefile,
  'turf-bbox': loadTurfBbox,
  highcharts: loadHighcharts,
  'json-editor': loadJsonEditor,
  selectize: loadSelectize,
  'mapbox-gl-draw': loadMapboxGlDraw,
  pickolor: loadPickolor,
  nouislider: loadNoUiSlider,
  downloadjs: loadDownloadjs,
  'wms-capabilities': loadWmsCapabilities,
  'mx-drag-drop-worker': loadDragDropWorker,
  handsontable: loadHandsontable,
  map_composer: loadMapComposer,
  nested_list: loadNestedList
};

export function moduleLoad(name) {
  const module = modules[name]();
  if (!module) {
    return Promise.resolve({});
  }
  return module;
}

export function modulesLoad(arr) {
  arr = arr || [];
  arr = arr.map((m) => moduleLoad(m));
  return Promise.all(arr);
}

/*
 * Loader definitions
 */

function loadTurfBbox() {
  return import('@turf/bbox').then((m) => {
    return m.default;
  });
}

function loadDownloadjs() {
  return import('downloadjs').then((m) => {
    return m.default;
  });
}

function loadMapboxGlDraw() {
  return Promise.all([
    import('@mapbox/mapbox-gl-draw'),
    import('@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css')
  ]).then((m) => {
    return m[0].default;
  });
}

function loadDragDropWorker() {
  return import('./mx_helper_map_dragdrop.worker.js').then((m) => {
    return m.default;
  });
}

function loadWmsCapabilities() {
  return import('wms-capabilities').then((m) => {
    return m.default;
  });
}

function loadTopoJSON() {
  return import('topojson-client');
}

function loadD3() {
  return import('d3');
}

function loadD3Geo() {
  return import('d3-geo');
}

function loadNoUiSlider() {
  return Promise.all([
    import('nouislider'),
    import('../../node_modules/nouislider/distribute/nouislider.css')
  ]);
}

function loadPickolor() {
  return Promise.all([
    import('../js/pickolor/pickolor.js'),
    import('../js/pickolor/pickolor.css')
  ]).then((m) => {
    var Pickolor = m[0].default;
    return Pickolor;
  });
}

function loadSelectize() {
  return Promise.all([
    import('selectize'),
    import('webpack-jquery-ui/sortable'),
    import('selectize/dist/css/selectize.css'),
    import('selectize/dist/css/selectize.bootstrap3.css'),
    import('../css/mx_selectize.css')
  ]).then((m) => {
    var Selectize = m[0].default;

    /*
    * Patch for placing drop downrelative to a div
    * https://github.com/selectize/selectize.js/pull/1447/commits
    */
    Selectize.prototype.positionDropdown = function() {
      var $control = this.$control;
      this.$dropdown.offset({
        top:  $control.offset().top + $control[0].offsetHeight,
        left: $control.offset().left,
      }).css({
        width : $control[0].getBoundingClientRect().width,
      });
    };

    window.Selectize = Selectize;
    return Selectize;
  });
}

function loadHighcharts() {
  return Promise.all([
    import('highcharts'),
    import('highcharts/highcharts-more.js'),
    import('highcharts/modules/solid-gauge'),
    import('highcharts/modules/stock')
  ]).then((m) => {
    var Highcharts = m[0].default;
    m[1].default(Highcharts);
    m[2].default(Highcharts);
    m[3].default(Highcharts);
    return Promise.resolve(Highcharts);
  });
}

function loadShapefile() {
  return import('shapefile');
}

function loadJsonEditor() {
  return import('json-editor').then(() => {
    return Promise.all([
      import('../css/mx_jed.css'),
      import('./mx_extend_jed_position.js'),
      import('./mx_extend_jed_ace.js'),
      import('./mx_extend_jed_pickolor.js'),
      /***
       * Global plugin for all editors.
       */
      moduleLoad('selectize')
    ]);
  });
}

function loadHandsontable() {
  return Promise.all([
    import('handsontable'),
    import('handsontable/dist/handsontable.css'),
    import('handsontable/languages/de-DE.js'),
    import('handsontable/languages/es-MX.js'),
    import('handsontable/languages/fr-FR.js'),
    import('handsontable/languages/ru-RU.js'),
    import('handsontable/languages/zh-CN.js')
  ]).then((m) => {
    return m[0].default;
  });
}

function loadMapComposer() {
  return import('./map_composer/index.js').then((m) => m.MapComposer);
}
function loadNestedList() {
  return import('./nested_list/index.js').then((m) => m.NestedList);
}
