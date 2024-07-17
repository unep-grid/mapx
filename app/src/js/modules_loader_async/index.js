import { isArray, isString, isFunction } from "./../is_test/index.js";

const modules = {
  csvjson: loadCsvJSON,
  "csv-stringify": loadCsvStringify,
  "csv-parse": loadCsvParse,
  topojson: loadTopoJSON,
  d3: loadD3,
  "d3-geo": loadD3Geo,
  shapefile: loadShapefile,
  "turf-bbox": loadTurfBbox,
  highcharts: loadHighcharts,
  "json-editor": loadJsonEditor,
  selectize: loadSelectize,
  pickolor: loadPickolor,
  nouislider: loadNoUiSlider,
  "wms-capabilities": loadWmsCapabilities,
  "mx-drag-drop-worker": loadDragDropWorker,
  handsontable: loadHandsontable,
  map_composer: loadMapComposer,
  nested_list: loadNestedList,
  packery: loadPackery,
  draggabilly: loadDraggabilly,
  "size-of": loadSizeOf,
  html2canvas: loadHtmlToCanvas,
  "chroma-js": loadChromaJs,
  "radio-group": loadRadioGroup,
  proj4: loadProj4,
  button_panel: loadButtonPanel,
  "tom-select": loadTomSelect,
  "monaco-editor": loadMonacoEditor,
  extension: loadExtension,
};

export async function moduleLoad(name, id) {
  const loader = modules[name];
  if (!isFunction(loader)) {
    console.warn(`Module ${name} not found`);
    return Promise.resolve({});
  }
  const m = await loader(id);
  return m;
}

export async function modulesLoad(arr) {
  arr = isArray(arr) ? arr : isString(arr) ? [arr] : [];
  const promAll = arr.map(moduleLoad);
  return Promise.all(promAll);
}

/*
 * LOADERS - without attribution
 */
async function loadProj4() {
  const m = await import("proj4");
  return m.default || m;
}

async function loadHtmlToCanvas() {
  const m = await import("html2canvas");
  return m.default || m;
}

async function loadChromaJs() {
  const m = await import("chroma-js");
  return m.default || m;
}

async function loadRadioGroup() {
  const m = await import("./../radio_group");
  return m.RadioGroup;
}

async function loadButtonPanel() {
  const m = await import("./../button_panel");
  return m.ButtonPanel;
}

async function loadSizeOf() {
  const m = await import("object-sizeof");
  return m.default;
}

async function loadPackery() {
  const m = await import("packery");
  return m.default;
}
async function loadDraggabilly() {
  const m = await import("draggabilly");
  return m.default;
}
async function loadTurfBbox() {
  const m = await import("@turf/bbox");
  return m.default;
}

async function loadDragDropWorker() {
  const m = await import("./../mx_helper_map_dragdrop.mxworker.js");
  return m.default;
}

async function loadWmsCapabilities() {
  const m = await import("wms-capabilities");
  return m.default;
}

async function loadCsvJSON() {
  /**
   * TODO: deprecation warning ?
   * use csv-stringify and
   * csv-parse instead
   */
  return import("csvjson");
}

async function loadCsvStringify() {
  return import("csv-stringify");
}
async function loadCsvParse() {
  return import("csv-parse");
}

async function loadPickolor() {
  const m = Promise.all([
    import("../../js/pickolor/pickolor.js"),
    import("../../js/pickolor/pickolor.css"),
  ]);
  return m[0].default;
}

async function loadTomSelect() {
  const { default: TomSelect } = await import("tom-select");
  // require sortable ? await import('webpack-jquery-ui/sortable'),
  await import("../../css/mx_tom_select.css");
  return TomSelect;
}

async function loadShapefile() {
  return import("shapefile");
}

async function loadJsonEditor() {
  const { JSONEditor } = await import("@json-editor/json-editor");
  await Promise.all([
    import("./../json_editor/validators/validation.js"),
    import("./../json_editor/editors/number_na.js"),
    import("./../json_editor/editors/position.js"),
    import("./../json_editor/editors/array_confirm_delete"),
    import("./../json_editor/editors/monaco.js"),
    import("./../json_editor/editors/table_source_stat.js"),
    import("./../json_editor/editors/select_tom.js"),
    import("./../json_editor/editors/select_tom_simple.js"),
    import("./../json_editor/editors/select_gemet.js"),
    import("./../json_editor/editors/select_group.js"),
    import("./../json_editor/editors/select_keywords.js"),
  ]);
  return { JSONEditor };
}

async function loadHandsontable() {
  const m = await Promise.all([
    import("handsontable"),
    import("handsontable/dist/handsontable.css"),
    import("handsontable/languages/de-DE.js"),
    import("handsontable/languages/es-MX.js"),
    import("handsontable/languages/fr-FR.js"),
    import("handsontable/languages/ru-RU.js"),
    import("handsontable/languages/zh-CN.js"),
  ]);
  import("../handsontable/style.css");
  return m[0].default;
}

async function loadMapComposer() {
  const m = await import("./../map_composer/index.js");
  return m.MapComposer;
}
async function loadNestedList() {
  const m = await import("./../nested_list/index.js");
  return m.NestedList;
}

async function loadMonacoEditor() {
  const m = await import("./../monaco_wrapper");
  return m.monaco;
}

async function loadExtension(id) {
  const m = await import("./../extensions/index.js");
  return m[id];
}

if (module.hot) {
  module.hot.accept("./../extensions/index.js", function () {
    console.log("Accepting the updated module!");
  });
}

/**
 * LOADERS with attributions
 * Available from dashboards:
 * -> add attributions info
 * highcharts", "d3", "d3-geo", "topojson", "selectize", "nouislider";
 */
async function loadTopoJSON() {
  const module = await import("topojson-client");

  /* Create attributions link, based on package.json*/
  if (!module._attrib_info) {
    const pkg = await import("topojson-client/package.json");
    module._attrib_info = pkgAttribInfo(pkg);
  }

  return module;
}
async function loadD3() {
  const module = await import("d3");

  /* Create attributions link, based on package.json*/
  if (!module._attrib_info) {
    const pkg = await import("d3/package.json");
    module._attrib_info = pkgAttribInfo(pkg);
  }

  return import("d3");
}

async function loadD3Geo() {
  const module = await import("d3-geo");
  /* Create attributions link, based on package.json*/
  if (!module._attrib_info) {
    const pkg = await import("d3-geo/package.json");
    module._attrib_info = pkgAttribInfo(pkg);
  }
  return module;
}

async function loadNoUiSlider() {
  const m = await Promise.all([
    import("nouislider"),
    import("nouislider/distribute/nouislider.css"),
    import("../../css/mx_sliders.css"),
  ]);
  const nouislider = m[0].default;
  nouislider[0] = { default: nouislider };

  /* Create attributions link, based on package.json*/
  if (!nouislider._attrib_info) {
    const pkg = await import("nouislider/package.json");
    nouislider._attrib_info = pkgAttribInfo(pkg);
  }

  return nouislider;
}

async function loadHighcharts() {
  const m = await Promise.all([
    import("highcharts"),
    import("highcharts/highcharts-more.js"),
    import("highcharts/modules/solid-gauge"),
    import("highcharts/modules/stock"),
    import("highcharts/modules/heatmap"),
    import("highcharts/modules/exporting.js"),
    import("highcharts/modules/export-data.js"),
    import("../../css/mx_highcharts.css"),
  ]);

  const Highcharts = m[0].default;
  m[1].default(Highcharts);
  m[2].default(Highcharts);
  m[3].default(Highcharts);
  m[4].default(Highcharts);
  m[5].default(Highcharts);
  m[6].default(Highcharts);

  /* Create attributions link, based on package.json*/
  if (!Highcharts._attrib_info) {
    const pkg = await import("highcharts/package.json");
    Highcharts._attrib_info = pkgAttribInfo(pkg);
  }
  return Highcharts;
}

async function loadSelectize() {
  /**
   * ⚠️  jquery and selectize are already imported in init_jquery.
   * Here is a patch for widget, custom code, etc.. requiring it
   */
  const hasSelectize = window.jQuery && jQuery.fn.selectize;
  if (hasSelectize) {
    /**
     * Use default
     */
    return Promise.resolve(jQuery.fn.selectize);
  }

  const m = await Promise.all([
    import("jquery"),
    import("selectize"),
    import("webpack-jquery-ui/sortable"),
    import("selectize/dist/css/selectize.css"),
    import("selectize/dist/css/selectize.bootstrap3.css"),
    import("../../css/mx_selectize.css"),
  ]);
  window.jQuery = m[0].default;
  window.$ = window.jQuery;
  const Selectize = m[1].default;

  /*
   * Patch for placing drop downrelative to a div
   * https://github.com/selectize/selectize.js/pull/1447/commits
   */
  Selectize.prototype.positionDropdown = function () {
    const $control = this.$control;
    this.$dropdown
      .offset({
        top: $control.offset().top + $control[0].offsetHeight,
        left: $control.offset().left,
      })
      .css({
        width: $control[0].getBoundingClientRect().width,
      });
  };

  /* Create attributions link, based on package.json */
  if (!Selectize._attrib_info) {
    const pkg = await import("selectize/package.json");
    Selectize._attrib_info = pkgAttribInfo(pkg);
  }

  /* Save as global  */
  window.Selectize = Selectize;
  return Selectize;
}

/**
 * Helpers
 */

/**
 * Extract formated info from package object, e.g. to create attribution link
 * @param  {Object} pkg Package.json config object
 * @return {Object} info data
 */
function pkgAttribInfo(pkg) {
  const { name, homepage, description } = pkg;
  return { name, homepage, description };
}
