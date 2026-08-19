// @ts-check
import { getMapxWindowManager } from "../window/index.js";
import { ws } from "../mx.js";
import { settings } from "../settings";
import { bindAll } from "../bind_class_methods";
import { tt } from "../el_mapx";
import { wmsGetLayers, urlTile, urlLegend } from "../wms/index.js";

const WINDOW_KEY = "view-raster-url-configurator";

/**
 * Shared raster source configurator for report and Shiny view editing.
 * Saving is intentionally handled by Node/API so the Shiny editor does not
 * need to serialize the nested view JSON through R.
 */
export class RasterUrlConfigurator {
  constructor() {
    const rc = this;
    rc.refs = {};
    rc.windowManager = getMapxWindowManager();
    rc.el = rc.windowManager.el;
    bindAll(rc);
  }

  /**
   * @param {{idView: string, config?: object, onSaved?: Function}} options
   */
  async show({ idView, config, onSaved }) {
    const rc = this;
    rc.idView = idView;
    rc.onSaved = onSaved;
    rc.config = config || (await rc.fetchConfig());
    rc.buildWindow();
  }

  async fetchConfig() {
    const data = await ws.emitAsync(
      "/client/view/raster/config/get",
      { idView: this.idView },
      15 * 1000,
    );
    if (data.error) throw new Error(data.error);
    return data.config;
  }

  buildWindow() {
    const rc = this;
    const el = rc.el;
    const config = rc.config || {};

    rc.refs.tiles = el("textarea", {
      class: "form-control",
      rows: 4,
      autocomplete: "off",
      spellcheck: "false",
    });
    rc.refs.tiles.value = config.tiles || "";
    rc.refs.legend = el("textarea", {
      class: "form-control",
      rows: 3,
      autocomplete: "off",
      spellcheck: "false",
    });
    rc.refs.legend.value = config.legend || "";
    rc.refs.tileSize = el(
      "select",
      { class: "form-control" },
      [256, 512].map((size) => el("option", { value: size }, String(size))),
    );
    rc.refs.tileSize.value = String(config.tileSize || 512);
    rc.refs.useMirror = el("input", {
      type: "checkbox",
      checked: Boolean(config.useMirror),
    });
    rc.refs.result = el("div", {
      class: ["help-block", "tiles-url-editor-result"],
      "aria-live": "polite",
    });

    const service = el("input", {
      type: "url",
      class: "form-control",
      placeholder: "https://example.org/geoserver/wms",
    });
    const reviewedService = el(
      "select",
      { class: "form-control", on: { change: () => { service.value = reviewedService.value; } } },
      (settings.wms || []).map(({ label, value }) => el("option", { value }, label)),
    );
    if (reviewedService.options.length) {
      service.value = reviewedService.value;
    }
    const layer = el("select", { class: "form-control" });
    const getLayers = el(
      "button",
      { class: ["btn", "btn-default"], type: "button", on: { click: () => rc.getLayers(service, layer) } },
      tt("wms_btn_get_layers"),
    );
    const generate = el(
      "button",
      { class: ["btn", "btn-default"], type: "button", on: { click: () => rc.generateUrls(service, layer) } },
      tt("wms_btn_generate_url"),
    );
    const generator = el("div", { class: "raster-url-wms-generator" }, [
      el("div", { class: "form-group" }, [
        el("label", tt("wms_select_reviewed_service")),
        reviewedService,
      ]),
      el("div", { class: "form-group" }, [
        el("label", tt("wms_input_service_url")),
        el("div", { class: "input-group" }, [
          service,
          el("span", { class: "input-group-btn" }, getLayers),
        ]),
      ]),
      el("div", { class: "form-group" }, [
        el("label", tt("wms_select_layer")),
        layer,
        generate,
      ]),
    ]);

    const field = (label, input, id) => {
      input.id = id;
      return el("div", { class: "form-group" }, [
        el("label", { class: "control-label", for: id }, label),
        input,
      ]);
    };
    const content = el("div", { class: "mx-window-dialog__content" }, [
      field(tt("source_raster_tile_url"), rc.refs.tiles, "mx-raster-url-tiles"),
      field(tt("source_raster_tile_legend"), rc.refs.legend, "mx-raster-url-legend"),
      field(tt("source_raster_tile_size"), rc.refs.tileSize, "mx-raster-url-tile-size"),
      el("div", { class: "checkbox" }, [
        el("label", [rc.refs.useMirror, " ", tt("tool_mirror_enable")]),
      ]),
      el("hr"),
      el("h4", tt("wms_display_tool_title")),
      generator,
      rc.refs.result,
    ]);

    rc.refs.btnTest = el(
      "button",
      { class: ["btn", "btn-default"], type: "button", on: { click: rc.handleTest } },
      tt("project_tiles_url_editor_btn_test"),
    );
    rc.refs.btnSave = el(
      "button",
      { class: ["btn", "btn-primary"], type: "button", on: { click: rc.handleSave } },
      tt("project_tiles_url_editor_btn_save"),
    );
    const cancel = el(
      "button",
      { class: ["btn", "btn-default"], type: "button", on: { click: () => rc.window?.close("cancel") } },
      tt("btn_close"),
    );

    rc.window = rc.windowManager.open({
      key: WINDOW_KEY,
      title: tt("project_tiles_url_editor_title"),
      content,
      footerEnd: [rc.refs.btnTest, rc.refs.btnSave, cancel],
      modal: true,
      closeable: true,
      draggable: true,
      resizable: true,
      geometry: {
        width: "min(760px, calc(100vw - 32px))",
        height: "min(720px, calc(100vh - 32px))",
        minHeight: 420,
      },
    });
  }

  getConfig() {
    const rc = this;
    return {
      tiles: rc.refs.tiles.value.trim(),
      legend: rc.refs.legend.value.trim(),
      tileSize: Number(rc.refs.tileSize.value) || 512,
      useMirror: rc.refs.useMirror.checked,
    };
  }

  setResult(...children) {
    this.refs.result.replaceChildren(...children);
  }

  async handleTest() {
    const rc = this;
    rc.setResult(tt("project_tiles_url_editor_testing"));
    try {
      const data = await ws.emitAsync(
        "/client/view/raster/config/test",
        { idView: rc.idView, ...rc.getConfig() },
        30 * 1000,
      );
      if (data.error) throw new Error(data.error);
      const result = data.result || {};
      rc.setResult(
        `Tiles: ${result.tile_valid ? "OK" : "Broken"}; ` +
          `Legend: ${result.legend_configured ? (result.legend_valid ? "OK" : "Broken") : "Not configured"}`,
      );
    } catch (error) {
      rc.setResult(error.message || String(error));
    }
  }

  async handleSave() {
    const rc = this;
    rc.setResult(tt("project_tiles_url_editor_saving"));
    rc.refs.btnSave.disabled = true;
    try {
      const config = rc.getConfig();
      const data = await ws.emitAsync(
        "/client/view/raster/config/save",
        { idView: rc.idView, config },
        30 * 1000,
      );
      if (data.error) throw new Error(data.error);
      rc.onSaved?.(data.row, config);
      rc.window?.close("saved");
    } catch (error) {
      rc.refs.btnSave.disabled = false;
      rc.setResult(error.message || String(error));
    }
  }

  async getLayers(service, layer) {
    const url = service.value.trim();
    if (!url) return;
    try {
      const layers = await wmsGetLayers(url, {
        optGetCapabilities: {
          useMirror: this.refs.useMirror.checked,
          useCache: false,
        },
      });
      layer.replaceChildren(
        ...layers.map((item) => this.el("option", { value: item.Name }, item.Title || item.Name)),
      );
      this.setResult(`${layers.length} WMS layer(s) found`);
    } catch (error) {
      this.setResult(error.message || String(error));
    }
  }

  generateUrls(service, layer) {
    const layerName = layer.value;
    if (!service.value || !layerName) {
      this.setResult("Select a WMS service and layer first");
      return;
    }
    this.refs.tiles.value = urlTile({
      layer: layerName,
      url: service.value.trim(),
      width: this.refs.tileSize.value || 512,
      height: this.refs.tileSize.value || 512,
    });
    this.refs.legend.value = urlLegend({
      url: service.value.trim(),
      layer: layerName,
    });
    this.setResult("Tile and legend URLs generated");
  }
}
