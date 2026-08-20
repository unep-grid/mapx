// @ts-check
import { getMapxWindowManager } from "../window/index.js";
import { ws } from "../mx.js";
import { settings } from "../settings";
import { bindAll } from "../bind_class_methods";
import { tt } from "../el_mapx";
import { getDictItem } from "../language";
import { moduleLoad } from "../modules_loader_async";
import { wmsGetLayers, urlTile, urlLegend } from "../wms/index.js";
import { rasterStatusConfig, rasterStatusLabel } from "./raster_url_health.js";

const WINDOW_KEY = "view-raster-url-configurator";

/** Shared raster source configurator for the report and Shiny view editor. */
export class RasterUrlConfigurator {
  /** @param {{root: HTMLElement}} options */
  constructor({ root }) {
    const rc = this;
    if (!root?.ownerDocument) {
      throw new TypeError("RasterUrlConfigurator requires an application root");
    }
    rc.root = root;
    rc.refs = {};
    rc.windowManager = getMapxWindowManager(root);
    rc.el = rc.windowManager.el;
    rc.working = false;
    rc.sessionId = 0;
    rc.layerRequestId = 0;
    rc.layerSelect = null;
    bindAll(rc);
  }

  /**
   * @param {{
   *   idView: string,
   *   mode: "draft" | "persist",
   *   config?: object,
   *   onApplied?: Function
   * }} options
   */
  async show({ idView, mode, config, onApplied }) {
    const rc = this;
    if (mode !== "draft" && mode !== "persist") {
      throw new TypeError("RasterUrlConfigurator requires a valid mode");
    }
    const sessionId = ++rc.sessionId;
    rc.working = false;
    rc.idView = idView;
    rc.mode = mode;
    rc.onApplied = onApplied;
    const nextConfig = config || (await rc.fetchConfig(idView));
    if (!rc.isSessionCurrent(sessionId)) return;
    rc.config = nextConfig;
    rc.buildWindow(sessionId);
  }

  async fetchConfig(idView = this.idView) {
    const data = await ws.emitAsync(
      "/client/view/raster/config/get",
      { idView },
      15 * 1000,
    );
    if (data.error) throw new Error(data.error);
    return data.config;
  }

  buildWindow(sessionId = this.sessionId) {
    const rc = this;
    rc.working = false;
    rc.destroyLayerSelect();
    const el = rc.el;
    const config = rc.config || {};

    rc.refs.tilesStatus = el("span");
    rc.refs.legendStatus = el("span");
    rc.refs.tiles = el("textarea", {
      class: "form-control",
      rows: 3,
      autocomplete: "off",
      spellcheck: "false",
      on: { input: () => rc.handleResourceInput("tile") },
    });
    rc.refs.tiles.value = config.tiles || "";
    rc.refs.legend = el("textarea", {
      class: "form-control",
      rows: 3,
      autocomplete: "off",
      spellcheck: "false",
      on: { input: () => rc.handleResourceInput("legend") },
    });
    rc.refs.legend.value = config.legend || "";
    rc.refs.tileSize = el(
      "select",
      { class: "form-control", on: { change: () => rc.handleResourceInput("tile") } },
      [256, 512].map((size) => el("option", { value: size }, String(size))),
    );
    rc.refs.tileSize.value = String(config.tileSize || 512);
    rc.refs.useMirror = el("input", {
      type: "checkbox",
      checked: Boolean(config.useMirror),
      on: { change: () => rc.handleResourceInput("both") },
    });
    rc.refs.feedback = el("div", {
      class: "raster-url-configurator__feedback",
      role: "status",
      "aria-live": "polite",
    });
    rc.refs.feedback.hidden = true;

    rc.buildWmsControls();

    const settingsSection = rc.section(
      "fa-th-large",
      tt("raster_url_settings_title"),
      tt("raster_url_settings_description"),
      [
        rc.urlField(
          tt("source_raster_tile_url"),
          rc.refs.tiles,
          rc.refs.tilesStatus,
          "mx-raster-url-tiles",
        ),
        rc.urlField(
          tt("source_raster_tile_legend"),
          rc.refs.legend,
          rc.refs.legendStatus,
          "mx-raster-url-legend",
        ),
        el("div", { class: "raster-url-configurator__options" }, [
          rc.field(
            tt("source_raster_tile_size"),
            rc.refs.tileSize,
            "mx-raster-url-tile-size",
          ),
          el("div", { class: "raster-url-configurator__mirror" }, [
            el("span", { class: "control-label" }, tt("tool_mirror_enable")),
            el("label", { class: "checkbox-inline" }, [
              rc.refs.useMirror,
              " ",
              tt("tool_mirror_enable_desc_short"),
            ]),
          ]),
        ]),
      ],
    );
    const wmsSection = rc.section(
      "fa-globe",
      tt("wms_display_tool_title"),
      tt("wms_display_tool_desc"),
      rc.buildWmsSteps(),
    );

    rc.refs.btnTest = el("button", {
      class: ["btn", "btn-default"],
      type: "button",
      on: { click: rc.handleTest },
    }, [
      el("i", { class: ["fa", "fa-flask"], "aria-hidden": "true" }),
      " ",
      tt("project_tiles_url_editor_btn_test"),
    ]);
    rc.refs.btnSave = el("button", {
      class: ["btn", "btn-primary"],
      type: "button",
      on: { click: rc.handleSave },
    }, tt(
      rc.mode === "draft"
        ? "btn_update"
        : "project_tiles_url_editor_btn_save",
    ));
    rc.refs.btnCancel = el("button", {
      class: ["btn", "btn-default"],
      type: "button",
      on: { click: () => rc.window?.close("cancel") },
    }, tt("btn_cancel"));

    rc.window = rc.windowManager.open({
      key: WINDOW_KEY,
      title: tt("project_tiles_url_editor_title"),
      content: el("div", {
        class: ["mx-window-dialog__content", "raster-url-configurator"],
      }, [settingsSection, wmsSection, rc.refs.feedback]),
      footerStart: rc.refs.btnCancel,
      footerEnd: [rc.refs.btnTest, rc.refs.btnSave],
      modal: true,
      closeable: true,
      draggable: true,
      resizable: true,
      geometry: {
        width: "min(860px, calc(100vw - 32px))",
        height: "min(780px, calc(100vh - 32px))",
        minHeight: 480,
      },
      onClose: () => rc.closeSession(sessionId),
    });
    rc.renderHealth(config.health);
    rc.setWorking(false);
  }

  isSessionCurrent(sessionId) {
    return sessionId === this.sessionId;
  }

  closeSession(sessionId) {
    if (!this.isSessionCurrent(sessionId)) return;
    this.sessionId += 1;
    this.working = false;
    this.destroyLayerSelect();
  }

  buildWmsControls() {
    const rc = this;
    const el = rc.el;
    rc.refs.service = el("input", {
      type: "url",
      class: "form-control",
      placeholder: "https://example.org/geoserver/wms",
      on: { input: rc.handleServiceInput },
    });
    rc.refs.preset = el(
      "select",
      { class: "form-control", on: { change: rc.handlePresetChange } },
      (settings.wms || []).map(({ label, value }) =>
        el("option", { value }, label),
      ),
    );
    if (rc.refs.preset.options.length) {
      rc.refs.service.value = rc.refs.preset.value;
    }
    rc.refs.layer = el("select", {
      class: "form-control",
      disabled: true,
      on: { change: rc.updateGenerateButton },
    }, el("option", { value: "" }, tt("raster_url_wms_select_layer")));
    rc.refs.btnLoad = el("button", {
      class: ["btn", "btn-default"],
      type: "button",
      on: { click: rc.getLayers },
    }, [
      el("i", { class: ["fa", "fa-refresh"], "aria-hidden": "true" }),
      el("span", { class: "sr-only" }, tt("raster_url_wms_load_layers")),
    ]);
    rc.setAccessibleLabel(rc.refs.btnLoad, "raster_url_wms_load_layers");
    rc.refs.btnGenerate = el("button", {
      class: ["btn", "btn-info"],
      type: "button",
      disabled: true,
      on: { click: rc.generateUrls },
    }, [
      el("i", { class: ["fa", "fa-magic"], "aria-hidden": "true" }),
      " ",
      tt("raster_url_wms_generate"),
    ]);
  }

  buildWmsSteps() {
    const rc = this;
    const el = rc.el;
    return el("div", { class: "raster-url-wms-steps" }, [
      rc.step(1, tt("wms_select_reviewed_service"), rc.refs.preset),
      rc.step(2, tt("wms_input_service_url"), el("div", {
        class: "input-group",
      }, [
        rc.refs.service,
        el("span", { class: "input-group-btn" }, rc.refs.btnLoad),
      ])),
      rc.step(3, tt("wms_select_layer"), rc.refs.layer),
      el("div", { class: "raster-url-wms-steps__action" }, [
        rc.refs.btnGenerate,
        el("span", { class: "help-block" }, tt("raster_url_wms_generate_help")),
      ]),
    ]);
  }

  section(icon, title, description, content) {
    const el = this.el;
    return el("section", { class: "raster-url-section" }, [
      el("header", { class: "raster-url-section__header" }, [
        el("i", { class: ["fa", icon], "aria-hidden": "true" }),
        el("div", [
          el("h4", { class: "raster-url-section__title" }, title),
          el("p", { class: "help-block" }, description),
        ]),
      ]),
      el("div", { class: "raster-url-section__body" }, content),
    ]);
  }

  field(label, input, id) {
    input.id = id;
    return this.el("div", { class: "form-group" }, [
      this.el("label", { class: "control-label", for: id }, label),
      input,
    ]);
  }

  urlField(label, input, status, id) {
    input.id = id;
    return this.el("div", { class: "form-group" }, [
      this.el("div", { class: "raster-url-configurator__field-label" }, [
        this.el("label", { class: "control-label", for: id }, label),
        status,
      ]),
      input,
    ]);
  }

  step(number, label, control) {
    return this.el("div", { class: "raster-url-wms-step" }, [
      this.el("span", {
        class: "raster-url-wms-step__number",
        "aria-hidden": "true",
      }, String(number)),
      this.el("label", { class: "control-label" }, label),
      this.el("div", { class: "raster-url-wms-step__control" }, control),
    ]);
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

  renderStatus(target, status) {
    target.className = `label label-${status.className} raster-url-status`;
    target.dataset.state = status.state;
    target.replaceChildren(
      this.el("i", { class: status.icon, "aria-hidden": "true" }),
      " ",
      tt(status.translationKey),
    );
  }

  renderHealth(health) {
    this.renderStatus(
      this.refs.tilesStatus,
      rasterStatusLabel(health, "tile", { configured: Boolean(this.refs.tiles.value.trim()) }),
    );
    this.renderStatus(
      this.refs.legendStatus,
      rasterStatusLabel(health, "legend", { configured: Boolean(this.refs.legend.value.trim()) }),
    );
  }

  handleResourceInput(resource = "both") {
    const rc = this;
    if (resource === "tile" || resource === "both") {
      rc.renderStatus(
        rc.refs.tilesStatus,
        rc.refs.tiles.value.trim()
          ? rasterStatusConfig("unchecked")
          : rasterStatusConfig("not_configured"),
      );
    }
    if (resource === "legend" || resource === "both") {
      rc.renderStatus(
        rc.refs.legendStatus,
        rc.refs.legend.value.trim()
          ? rasterStatusConfig("unchecked")
          : rasterStatusConfig("not_configured"),
      );
    }
    rc.clearFeedback();
  }

  setFeedback(level, ...children) {
    const feedback = this.refs.feedback;
    feedback.hidden = false;
    feedback.className = `alert alert-${level} raster-url-configurator__feedback`;
    feedback.replaceChildren(...children);
  }

  clearFeedback() {
    this.refs.feedback.hidden = true;
    this.refs.feedback.replaceChildren();
  }

  setWorking(value) {
    const rc = this;
    rc.working = value;
    for (const button of [rc.refs.btnTest, rc.refs.btnSave, rc.refs.btnCancel]) {
      if (button) button.disabled = value;
    }
    if (rc.refs.btnLoad) rc.refs.btnLoad.disabled = value;
    rc.updateGenerateButton();
  }

  async testConfig(config = this.getConfig()) {
    const data = await ws.emitAsync(
      "/client/view/raster/config/test",
      { idView: this.idView, ...config },
      30 * 1000,
    );
    if (data.error) throw new Error(data.error);
    return data.result || {};
  }

  async handleTest() {
    const rc = this;
    if (rc.working) return;
    const sessionId = rc.sessionId;
    rc.setWorking(true);
    rc.setFeedback("info", tt("project_tiles_url_editor_testing"));
    rc.renderStatus(rc.refs.tilesStatus, rasterStatusConfig("checking"));
    if (rc.refs.legend.value.trim()) {
      rc.renderStatus(rc.refs.legendStatus, rasterStatusConfig("checking"));
    }
    try {
      const result = await rc.testConfig();
      if (!rc.isSessionCurrent(sessionId)) return;
      rc.renderHealth(result);
      rc.setFeedback("info", rc.healthSummary(result));
    } catch (error) {
      if (!rc.isSessionCurrent(sessionId)) return;
      rc.setFeedback("danger", error?.message || String(error));
      rc.renderStatus(rc.refs.tilesStatus, rasterStatusConfig("incomplete"));
      if (rc.refs.legend.value.trim()) {
        rc.renderStatus(rc.refs.legendStatus, rasterStatusConfig("incomplete"));
      }
    } finally {
      if (rc.isSessionCurrent(sessionId)) rc.setWorking(false);
    }
  }

  async handleSave() {
    const rc = this;
    if (rc.working) return;
    const sessionId = rc.sessionId;
    const window = rc.window;
    const onApplied = rc.onApplied;
    rc.setWorking(true);
    rc.setFeedback(
      "info",
      tt(
        rc.mode === "draft"
          ? "project_tiles_url_editor_testing"
          : "project_tiles_url_editor_saving",
      ),
    );
    try {
      const config = rc.getConfig();
      let result;
      if (rc.mode === "draft") {
        result = await rc.testConfig(config);
        if (!rc.isSessionCurrent(sessionId)) return;
        rc.renderHealth(result);
        if (result.valid !== true) {
          rc.setFeedback("info", rc.healthSummary(result));
          rc.setWorking(false);
          return;
        }
      } else {
        const data = await ws.emitAsync(
          "/client/view/raster/config/save",
          { idView: rc.idView, config },
          30 * 1000,
        );
        if (data.error) throw new Error(data.error);
        result = data.row;
      }
      onApplied?.(result, config);
      if (!rc.isSessionCurrent(sessionId) || rc.window !== window) return;
      rc.setWorking(false);
      window?.close(rc.mode === "draft" ? "applied" : "saved");
    } catch (error) {
      if (!rc.isSessionCurrent(sessionId)) return;
      rc.setFeedback("danger", error?.message || String(error));
      rc.setWorking(false);
    }
  }

  handlePresetChange() {
    this.refs.service.value = this.refs.preset.value;
    this.resetLayers();
    this.clearFeedback();
  }

  handleServiceInput() {
    this.resetLayers();
    this.clearFeedback();
  }

  resetLayers() {
    this.layerRequestId += 1;
    this.destroyLayerSelect();
    this.refs.layer.replaceChildren(
      this.el("option", { value: "" }, tt("raster_url_wms_select_layer")),
    );
    this.refs.layer.disabled = true;
    this.updateGenerateButton();
  }

  updateGenerateButton() {
    if (this.refs.btnGenerate) {
      const value = this.layerSelect?.getValue() || this.refs.layer.value;
      this.refs.btnGenerate.disabled = this.working || !value;
    }
  }

  destroyLayerSelect() {
    const rc = this;
    rc.layerRequestId += 1;
    if (rc.layerSelect?.destroy) rc.layerSelect.destroy();
    rc.layerSelect = null;
  }

  layerOption(data, includeAbstract) {
    const el = this.el;
    const title = data.title || data.name || data.value;
    const children = [el("span", { class: "raster-url-layer-option__title" }, title)];
    if (data.name) {
      children.push(el("span", {
        class: ["text-muted", "small", "raster-url-layer-option__id"],
      }, data.name));
    }
    if (includeAbstract && data.abstract) {
      children.push(el("span", {
        class: ["text-muted", "small", "raster-url-layer-option__abstract"],
        title: data.abstract,
      }, data.abstract.slice(0, 300)));
    }
    return el("div", { class: "raster-url-layer-option" }, children);
  }

  setAccessibleLabel(target, key) {
    target.dataset.lang_key = key;
    target.dataset.lang_type = "tooltip";
    target.classList.add("hint--left");
    getDictItem(key)
      .then((label) => {
        target.setAttribute("aria-label", label);
      })
      .catch(console.error);
  }

  async initLayerSelect(layers, requestId) {
    const rc = this;
    const options = layers.map((item) => ({
      value: item.Name,
      text: item.Title || item.Name,
      name: item.Name,
      title: item.Title || item.Name,
      abstract: item.Abstract || "",
    }));
    rc.refs.layer.replaceChildren(
      rc.el("option", { value: "" }, tt("raster_url_wms_select_layer")),
      ...options.map((option) => rc.el("option", {
        value: option.value,
        dataset: { data: JSON.stringify(option) },
      }, option.text)),
    );
    rc.refs.layer.disabled = options.length === 0;
    if (!options.length) return;

    const TomSelect = await moduleLoad("tom-select");
    if (requestId !== rc.layerRequestId || !rc.refs.layer.isConnected) return;
    rc.layerSelect = new TomSelect(rc.refs.layer, {
      allowEmptyOption: true,
      closeAfterSelect: true,
      create: false,
      dataAttr: "data",
      labelField: "text",
      maxOptions: 100,
      searchConjunction: "and",
      searchField: ["name", "title", "abstract"],
      valueField: "value",
      onChange: rc.updateGenerateButton,
      render: {
        item: (data) => rc.layerOption(data, false),
        option: (data) => rc.layerOption(data, true),
      },
    });
    rc.updateGenerateButton();
  }

  async getLayers() {
    const rc = this;
    const url = rc.refs.service.value.trim();
    if (rc.working) return;
    if (!url) {
      rc.setFeedback("warning", tt("raster_url_wms_service_required"));
      return;
    }
    rc.destroyLayerSelect();
    const requestId = rc.layerRequestId;
    rc.refs.layer.replaceChildren(
      rc.el("option", { value: "" }, tt("raster_url_wms_select_layer")),
    );
    rc.refs.btnLoad.disabled = true;
    rc.refs.layer.disabled = true;
    rc.setFeedback("info", tt("raster_url_wms_loading_layers"));
    try {
      const layers = await wmsGetLayers(url, {
        optGetCapabilities: {
          useMirror: rc.refs.useMirror.checked,
          useCache: false,
        },
      });
      await rc.initLayerSelect(layers, requestId);
      if (requestId !== rc.layerRequestId) return;
      if (layers.length) {
        rc.setFeedback(
          "success",
          tt("raster_url_wms_layers_loaded"),
          ": ",
          String(layers.length),
        );
      } else {
        rc.setFeedback("warning", tt("raster_url_wms_no_layers"));
      }
    } catch (error) {
      if (requestId !== rc.layerRequestId) return;
      rc.setFeedback("danger", error?.message || String(error));
    } finally {
      if (requestId === rc.layerRequestId) {
        rc.refs.btnLoad.disabled = false;
        rc.updateGenerateButton();
      }
    }
  }

  generateUrls() {
    const rc = this;
    const layerName = rc.layerSelect?.getValue() || rc.refs.layer.value;
    if (!rc.refs.service.value.trim() || !layerName) {
      rc.setFeedback("warning", tt("raster_url_wms_layer_required"));
      return;
    }
    rc.refs.tiles.value = urlTile({
      layer: layerName,
      url: rc.refs.service.value.trim(),
      width: rc.refs.tileSize.value || 512,
      height: rc.refs.tileSize.value || 512,
    });
    rc.refs.legend.value = urlLegend({
      url: rc.refs.service.value.trim(),
      layer: layerName,
    });
    rc.handleResourceInput("both");
    rc.setFeedback("success", tt("raster_url_wms_generated"));
  }

  healthSummary(health) {
    const tile = rasterStatusLabel(health, "tile", {
      configured: Boolean(this.refs.tiles.value.trim()),
    });
    const legend = rasterStatusLabel(health, "legend", {
      configured: Boolean(this.refs.legend.value.trim()),
    });
    const detail = [health?.tile_detail, health?.legend_detail]
      .filter(Boolean)
      .join(" · ");
    return this.el("span", [
      tt("project_tiles_report_col_tiles"),
      ": ",
      tt(tile.translationKey),
      " · ",
      tt("project_tiles_report_col_legend"),
      ": ",
      tt(legend.translationKey),
      ...(detail ? [" — ", detail] : []),
    ]);
  }
}
