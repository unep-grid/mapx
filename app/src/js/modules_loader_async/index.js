import { isArray, isString, isFunction } from "./../is_test/index.js";

const modules = {
  csvjson: loadCsvJSON,
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
  downloadjs: loadDownloadjs,
  "wms-capabilities": loadWmsCapabilities,
  "mx-drag-drop-worker": loadDragDropWorker,
  handsontable: loadHandsontable,
  map_composer: loadMapComposer,
  nested_list: loadNestedList,
  packery: loadPackery,
  draggabilly: loadDraggabilly,
  "size-of": loadSizeOf,
  dashboard: loadDashboard,
  ace: loadAceEditor,
  "js-beautify": loadJsBeautify,
  html2canvas: loadHtmlToCanvas,
  "chroma-js": loadChromaJs,
  "radio-group": loadRadioGroup,
  proj4: loadProj4,
  button_panel: loadButtonPanel,
  "tom-select": loadTomSelect,
  "monaco-editor": loadMonacoEditor,
};

export async function moduleLoad(name) {
  const loader = modules[name];
  if (!isFunction(loader)) {
    console.warn(`Module ${name} not found`);
    return Promise.resolve({});
  }
  const m = await loader();
  return m;
}

export async function modulesLoad(arr) {
  arr = isArray(arr) ? arr : isString(arr) ? [arr] : [];
  const promAll = arr.map(moduleLoad);
  return Promise.all(promAll);
}

/*
 * Loader definitions
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

async function loadJsBeautify() {
  const m = await import("js-beautify");
  return m.default;
}

async function loadSizeOf() {
  const m = await import("object-sizeof");
  return m.default;
}

async function loadDashboard() {
  const m = await import("./../dashboards");
  return m.Dashboard;
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
async function loadDownloadjs() {
  const m = await import("downloadjs");
  return m.default;
}

async function loadAceEditor() {
  await import("ace-builds");
  await import("ace-builds/webpack-resolver.js");
}

async function loadDragDropWorker() {
  const m = await import("./../mx_helper_map_dragdrop.mxworker.js");
  return m.default;
}

async function loadWmsCapabilities() {
  const m = await import("wms-capabilities");
  return m.default;
}

async function loadTopoJSON() {
  return import("topojson-client");
}

async function loadD3() {
  return import("d3");
}

async function loadCsvJSON() {
  return import("csvjson");
}

async function loadD3Geo() {
  return import("d3-geo");
}

async function loadNoUiSlider() {
  return Promise.all([
    import("nouislider"),
    import("nouislider/distribute/nouislider.css"),
  ]);
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

  window.Selectize = Selectize;
  return Selectize;
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
  ]);
  const Highcharts = m[0].default;
  m[1].default(Highcharts);
  m[2].default(Highcharts);
  m[3].default(Highcharts);
  m[4].default(Highcharts);
  m[5].default(Highcharts);
  m[6].default(Highcharts);
  return Highcharts;
}

async function loadShapefile() {
  return import("shapefile");
}

async function loadJsonEditor() {
  await import("json-editor");
  await moduleLoad("selectize");
  return Promise.all([
    import("./../../css/mx_jed.css"),
    import("./../mx_extend_jed_number_na.js"),
    import("./../mx_extend_jed_position.js"),
    import("./../mx_extend_jed_array_confirm_delete"),
    import("./../mx_extend_jed_ace.js"),
    import("./../mx_extend_jed_validation.js"),
    import("./../mx_extend_jed_table_source_stat_style.js"),
    import("./../mx_extend_jed_color_picker.js"),
    import("./../mx_extend_jed_selectize.js"),
  ]);
}

async function loadHandsontable() {
  const m = await Promise.all([
    import("handsontable/dist/handsontable.full.js"),
    import("handsontable/dist/handsontable.css"),
    import("../handsontable/style.css"),
    //import("handsontable/dist/languages/de-DE.js"),
    /*import("handsontable/languages/es-MX.js"),*/
    /*import("handsontable/languages/fr-FR.js"),*/
    /*import("handsontable/languages/ru-RU.js"),*/
    /*import("handsontable/languages/zh-CN.js"),*/
  ]);
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
