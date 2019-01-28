const modules = {
  'topojson': loadTopoJSON,
  'd3': loadD3,
  'd3-geo': loadD3Geo,
  'highcharts': loadHighcharts,
  'json-editor': loadJsonEditor,
  'selectize': loadSelectize,
  'mapbox-gj-js': loadMapboxGlJs,
  'pickolor': loadPickolor,
  'nouislider': loadNoUiSlider,
};

export function moduleLoad(name) {
  const module = modules[name]();
  if (!module) return Promise.resolve({});
  return module;
}

export function modulesLoad(arr) {
  arr = arr || [];
  arr = arr.map(m => moduleLoad(m));
  return Promise.all(arr);
}

/*
 * Loader definitions
 */
function loadMapboxGlJs(){
  return Promise.all([
    import('mapbox-gl/dist/mapbox-gl.css'),
    import('../css/mx_mapbox.css'),
    import("mapbox-gl")])
    .then(m => {
      return m[2].default;
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
    import('../../node_modules/nouislider/distribute/nouislider.css'),
  ]);
}

function loadPickolor() {
  return Promise.all([
    import('../js/pickolor/pickolor.js'),
    import('../js/pickolor/pickolor.css'),
  ]).then(m => {
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
    import('../css/mx_selectize.css'),
  ]).then(m => {
    var Selectize = m[0].default;
    window.Selectize = Selectize;
    return Selectize;
  });
}

function loadHighcharts() {
  
  return Promise.all([
    import('highcharts'),
    import('highcharts/highcharts-more.js'),
    import('highcharts/modules/solid-gauge'),
    import('highcharts/modules/stock'),
  ]).then(m => {
    var Highcharts = m[0].default;
    m[1].default(Highcharts);
    m[2].default(Highcharts);
    m[3].default(Highcharts);
    return Promise.resolve(Highcharts);
  });
}

function loadJsonEditor() {
  return import('json-editor').then(m => {
    return Promise.all([
      import('../css/mx_jed.css'),
      import('./mx_extend_jed_position.js'),
      import('./mx_extend_jed_ace.js'),
      import('./mx_extend_jed_pickolor.js'),
      /***
       * Global plugin for all editors.
       */
      moduleLoad('selectize'),
    ]);
  });
}
