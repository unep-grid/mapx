import { el } from "./../el_mapx/index.js";
import { isElement, isFunction, isHTML, isString } from "./../is_test/index.js";
import { path } from "./../mx_helper_misc.js";

/**
 * Runtime wrapper for MapX custom-code views.
 *
 * Custom-code views are developer-only client extensions. The user script must
 * return an object with onInit(cc) and onClose(cc); this class owns the MapX
 * lifecycle around that object.
 */
export class CustomCodeView {
  constructor(options = {}) {
    this.view = options.view;
    this.map = options.map;
    this.before = options.before || options.layerBefore;
    this.addTitle = options.addTitle;
    this.elLegendContainer = options.elLegendContainer;
    this.buildLegend = options.buildLegend;
    this.highlighter = options.highlighter;
    this.listeners = options.listeners;
    this.idView = this.view?.id;
    this.idSource = `${this.idView}-SRC`;
    this.idListener = `listener_cc_${this.idView}`;
    this.handler = null;
    this.runtime = null;
  }

  async init() {
    if (!this.isValid()) {
      console.warn("Custom code view not initialized, skipping");
      return false;
    }

    const handler = this.parseHandler();

    if (!this.isValidHandler(handler)) {
      console.warn("Invalid custom code view");
      return false;
    }

    this.handler = handler;
    this.elLegend = this.buildLegend(this.view, {
      type: "cc",
      elLegendContainer: this.elLegendContainer,
      addTitle: this.addTitle,
      removeOld: true,
    });

    if (!isElement(this.elLegend)) {
      console.warn("Custom code view legend container not found");
      return false;
    }

    this.runtime = this.createRuntime();
    this.clear();
    this.bindLegendEvents();

    await this.runtime.onInit(this.runtime);
    this.runtime._init = true;
    return true;
  }

  async close() {
    try {
      if (!this.runtime || this.runtime.isClosed()) {
        return;
      }
      if (!this.runtime.isInit()) {
        console.warn(
          "CC view: requested remove, but not yet initialized. Save at least one change",
        );
      }
      await this.runtime.onClose(this.runtime);
      this.clear();
    } catch (e) {
      console.error(e);
    } finally {
      if (this.view) {
        delete this.view._onRemoveCustomView;
      }
      if (this.runtime) {
        this.runtime._closed = true;
      }
    }
  }

  isValid() {
    return (
      !!this.view &&
      !!this.map &&
      isFunction(this.buildLegend) &&
      !!this.highlighter &&
      !!this.listeners
    );
  }

  parseHandler() {
    const methods = path(this.view, "data.methods");

    if (!isString(methods) || methods.length === 0) {
      return null;
    }

    try {
      let strToEval = methods.replace(
        /\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm,
        "",
      );

      if (/function handler/.test(strToEval)) {
        strToEval = strToEval.substring(
          strToEval.indexOf("{") + 1,
          strToEval.lastIndexOf("}"),
        );
      }

      return new Function(strToEval)();
    } catch (e) {
      throw new Error(`Failed to parse cc view: ${e.message}`);
    }
  }

  isValidHandler(handler) {
    return (
      !!handler &&
      handler.onInit instanceof Function &&
      handler.onClose instanceof Function
    );
  }

  createRuntime() {
    const runtime = {
      _init: false,
      _closed: false,
      map: this.map,
      view: this.view,
      idView: this.idView,
      idSource: this.idSource,
      idLegend: this.elLegend.id,
      elLegend: this.elLegend,
      clear: () => this.clear(),
      addSource: (source) => this.addSource(source),
      setLegend: (legend) => this.setLegend(legend),
      addLayer: (layer) => this.addLayer(layer),
      isClosed: () => this.isClosed(),
      isInit: () => this.isInit(),
    };

    runtime.onInit = this.handler.onInit.bind(runtime);
    runtime.onClose = this.handler.onClose.bind(runtime);

    return runtime;
  }

  bindLegendEvents() {
    this.listeners.addListener({
      group: this.idListener,
      target: this.elLegend,
      type: ["click", "mousedown", "change", "input"],
      callback: this.catchEvent,
    });
  }

  catchEvent(e) {
    e.stopPropagation();
  }

  clear() {
    this.listeners.removeListenerByGroup(this.idListener);
    this.removeHighlight();
    this.removeLayers();
    this.removeSource();
  }

  removeHighlight() {
    this.highlighter.resetLayer(this.idView);
  }

  removeSource() {
    if (this.map.getSource(this.idSource)) {
      this.map.removeSource(this.idSource);
    }
  }

  removeLayers() {
    const layers = this.map
      .getStyle()
      .layers.filter((layer) => layer.id.startsWith(this.idView));

    for (const layer of layers) {
      if (this.map.getLayer(layer.id)) {
        this.map.removeLayer(layer.id);
      }
    }
  }

  addSource(source) {
    this.removeLayers();
    this.removeSource();
    this.map.addSource(this.idSource, source);
  }

  addLayer(layer) {
    this.removeLayers();
    this.map.addLayer(layer, this.before);
  }

  setLegend(legend) {
    if (isHTML(legend) || isString(legend)) {
      legend = el("div", legend);
    }
    while (this.elLegend.firstElementChild) {
      this.elLegend.firstElementChild.remove();
    }
    this.elLegend.appendChild(legend);
    return legend;
  }

  isClosed() {
    return !!this.runtime?._closed;
  }

  isInit() {
    return !!this.runtime?._init;
  }
}
