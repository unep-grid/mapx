import { el } from "./../el/src/index.js";
import { elSpanTranslate } from "./../el_mapx/index.js";
import {
  modal,
  modalConfirm,
  modalDialog,
  modalPrompt,
} from "./../mx_helper_modal.js";
import { modalIframe } from "../modal_iframe/index.js";
import { Button } from "./../panel_controls/button.js";
import { ControlsPanel } from "./../panel_controls/index.js";
import { getDictItem } from "./../language";
import { bindAll } from "./../bind_class_methods/index.js";
import { spatialDataToView } from "./../mx_helper_map_dragdrop.js";
import { viewsListAddSingle } from "./../views_list_manager";
import { EventSimple } from "../event_simple";
import { controls } from "./../mx.js";
import { clone } from "./../mx_helper_misc.js";
import {
  applyGeometrySave,
  getCircleCompatibleSelectModes,
  getCompleteFeatureCollection,
  getFeatureCollectionGeometryHash,
  getGeometryFocus,
  splitFeatureForEditing,
} from "./edit_session.js";
import { GeometryPreview } from "./geometry_preview.js";

import "./style.less";

const def = {
  edit_max_zoom: 12,
};

const local = {
  instance: null,
};

class MapxDraw extends EventSimple {
  constructor() {
    super();
    this._geometryPreview = new GeometryPreview();
  }

  /**
   * Set up essential stuff.
   */
  async init(opt) {
    const md = this;
    md._opt = Object.assign({}, def, opt);
    md._map = md._opt.map;
    md._controls = md._opt.controls || controls;

    if (md._init) {
      return;
    }

    const controlsValid = md._controls instanceof ControlsPanel;

    if (!controlsValid) {
      throw new Error(
        "MapxDraw require a ControlsPanel to be provided in options {controls:<ControlsPanel>}",
      );
    }

    if (local.instance instanceof MapxDraw) {
      local.instance.destroy();
    }
    local.instance = md;

    /**
     * Toggle button should exists in controls
     * e.g. in panel_controls/mapx_buttons.js
     */
    md._btn_toggle = md._controls.get("draw_btn_toggle");

    /**
     * Binds all method at once
     */
    bindAll(md);

    /**
     * internal storage
     */
    md._buttons = [];
  }

  destroy() {
    const md = this;
    md.cancelEditSession();
    md.clearGeometryPreview();
    md.discard();
    md._buttons.forEach(md.removeButton);
    if (md._modal_config) {
      md._modal_config.close();
    }
    md.fire("destroy");
  }

  async toggle(e) {
    const md = this;
    if (md._editSession) {
      return;
    }
    if (md._enabled) {
      await md.disable();
    } else {
      await md.enable();
    }
    md.fire("toggle");
  }

  async enable() {
    const md = this;
    const elBtn = md._btn_toggle.elButton;
    if (md._enabled || md._editSession) {
      return;
    }
    md.clearGeometryPreview();
    await md.ensureDraw();
    const discard = await md.discardPrompt();
    if (!discard) {
      return;
    }
    md.discard();
    const conf = await md.showModalConfig();
    if (!conf) {
      return;
    }
    if (!conf.title) {
      conf.title = md._default_title();
    }
    md._opt = Object.assign({}, md._opt, conf);
    md.initButtonsType();
    md.startDrawHistory();
    elBtn.classList.add("active");
    md._enabled = true;
    md.fire("enable");
  }

  async disable() {
    const md = this;
    const elBtn = md._btn_toggle.elButton;

    if (!md._enabled || md._editSession) {
      return;
    }
    const discard = await md.discardPrompt();
    if (!discard) {
      return;
    }
    md.stopDrawHistory();
    md.discard();
    md.clearButtonsType();
    elBtn.classList.remove("active");
    md.fire("disable");
    md._enabled = false;
  }

  async discardPrompt() {
    const md = this;
    const hasData = md.hasData();
    if (hasData) {
      const discard = await modalConfirm({
        title: elSpanTranslate("draw_discard_change_title"),
        content: elSpanTranslate("draw_discard_change"),
        cancel: elSpanTranslate("draw_discard_change_btn_cancel"),
        confirm: elSpanTranslate("draw_discard_change_btn_confirm"),
      });
      return discard;
    }
    return true;
  }

  discard() {
    const md = this;
    if (!md._draw) {
      return;
    }
    md._draw.deleteAll();
  }

  async ensureDraw() {
    const md = this;
    if (md._draw) {
      return md._draw;
    }
    if (!md._map) {
      throw new Error("MapxDraw requires an initialized map");
    }

    const [moduleDraw, moduleDrawCircle, { default: drawTheme }] =
      await Promise.all([
        import("@mapbox/mapbox-gl-draw"),
        import("mapbox-gl-draw-circle"),
        import("@mapbox/mapbox-gl-draw/src/lib/theme.js"),
      ]);
    const MapboxDraw = moduleDraw.default;
    const selectModes = getCircleCompatibleSelectModes(
      MapboxDraw.modes,
      moduleDrawCircle,
    );

    // MapLibre GL v3+ requires bare array values in paint expressions to be
    // wrapped in ["literal", [...]]. Patch line-dasharray entries accordingly.
    const drawStyles = clone(drawTheme).map((layer) => {
      if (Array.isArray(layer.paint?.["line-dasharray"])) {
        layer.paint["line-dasharray"] = [
          "literal",
          layer.paint["line-dasharray"],
        ];
      }
      return layer;
    });

    md._draw = new MapboxDraw({
      displayControlsDefault: false,
      userProperties: true,
      styles: drawStyles,
      modes: {
        ...MapboxDraw.modes,
        /**
         * Click and drag to create a circle
         * does not work : https://github.com/iamanvesh/mapbox-gl-draw-circle/issues/21
         */
        // drag_circle: moduleDrawCircle.DragCircleMode,
        /**
         * Click to have circle center, ask user for the diameter
         */
        draw_circle: moduleDrawCircle.CircleMode,
        ...selectModes,
      },
    });
    md._map.addControl(md._draw);
    return md._draw;
  }

  hasData() {
    const md = this;
    if (!md._draw) {
      return false;
    }
    const data = md.getData();
    const n = data.features.length;
    return n > 0;
  }

  addButton(opt) {
    const md = this;
    opt = Object.assign({}, { classesButton: ["mx-draw--btn"] }, opt);
    const btn = new Button(opt);
    md._buttons.push(btn);
    md._controls.register(btn, 14);
    return btn;
  }

  getButton(key) {
    const md = this;
    return md._buttons.find((b) => b.opt.key === key);
  }

  async noActionIfEmpty(method, key, cb) {
    const md = this;
    let isEmpty = true;
    switch (method) {
      case "get_all":
        let data = md._draw.getAll();
        isEmpty = !data || data.features.length === 0;
        break;
      case "get_selected_ids":
        isEmpty = md._draw.getSelectedIds().length === 0;
        break;
    }
    if (isEmpty) {
      const btn = md.getButton(key);
      btn.shake();
    } else {
      await cb();
    }
  }

  /*
   * Remove button by key or button instance
   * @param {String | Button} Key identifire or Button to remove
   */
  removeButton(key) {
    const md = this;
    let i = md._buttons.length;
    key = key instanceof Button ? key.opt.key : key;
    while (i--) {
      const btn = md._buttons[i];
      if (btn.opt.key === key) {
        btn.destroy();
        md._buttons.splice(i, 1);
      }
    }
  }

  initButtonsType() {
    const md = this;
    md.clearButtonsType();
    switch (md._opt.type) {
      case "point":
        md.addButton({
          key: "draw_btn_mode_point",
          classesIcon: "mx-draw--btn-point",
          action: () => {
            md._draw.changeMode("draw_point");
          },
        });
        break;
      case "line":
        md.addButton({
          key: "draw_btn_mode_line",
          classesIcon: "mx-draw--btn-line",
          action: () => {
            md._draw.changeMode("draw_line_string");
          },
        });
        break;
      case "polygon":
        md.addButton({
          key: "draw_btn_mode_polygon",
          classesIcon: "mx-draw--btn-polygon",
          action: () => {
            md._draw.changeMode("draw_polygon");
          },
        });
        md.addButton({
          key: "draw_btn_mode_circle",
          classesIcon: "mx-draw--btn-circle",
          action: async () => {
            const idStorage = "mx_draw_circle_radius";
            const previousRadius = localStorage.getItem(idStorage);
            const radius = await modalPrompt({
              title: elSpanTranslate("draw_mode_circle_radius_prompt_title"),
              label: elSpanTranslate("draw_mode_circle_radius_prompt_label"),
              inputOptions: {
                value: previousRadius * 1,
                type: "numeric",
              },
            });
            md._draw.changeMode("draw_circle", {
              initialRadiusInKm: radius || 10,
            });
            localStorage.setItem(idStorage, radius || 10);
          },
        });
        break;
      default:
        null;
    }
    md.addButton({
      key: "btn_edit_undo",
      classesIcon: ["fa", "fa-undo"],
      action: md.undoDrawHistory,
    });
    md.addButton({
      key: "btn_edit_redo",
      classesIcon: ["fa", "fa-repeat"],
      action: md.redoDrawHistory,
    });
    md.addButton({
      key: "draw_btn_combine",
      classesIcon: "mx-draw--btn-combine",
      action: () => {
        md.noActionIfEmpty("get_selected_ids", "draw_btn_combine", async () => {
          md._draw.combineFeatures();
        });
      },
    });
    md.addButton({
      key: "draw_btn_uncombine",
      classesIcon: "mx-draw--btn-uncombine",
      action: () => {
        md.noActionIfEmpty(
          "get_selected_ids",
          "draw_btn_uncombine",
          async () => {
            md._draw.uncombineFeatures();
          },
        );
      },
    });
    md.addButton({
      key: "draw_btn_trash",
      classesIcon: "mx-draw--btn-trash",
      action: md.trashSelected,
    });
    md.addButton({
      key: "draw_btn_save",
      classesIcon: "mx-draw--btn-save",
      action: md.createView,
    });
    md.addButton({
      key: "draw_btn_help",
      classesIcon: "mx-draw--btn-help",
      action: md.showModalHelp,
    });
    md.updateDrawHistoryButtons();
  }

  initButtonsEditSession() {
    const md = this;
    const opt = md._editSession.opt;
    md.clearButtonsType();
    md.addGeometryModeButton(opt.type);
    if (opt.type === "polygon") {
      md.addCircleModeButton();
    }
    if (opt.allowMultipart) {
      md.addButton({
        key: "draw_btn_combine",
        classesIcon: "mx-draw--btn-combine",
        action: () => {
          md.noActionIfEmpty(
            "get_selected_ids",
            "draw_btn_combine",
            async () => {
              md._draw.combineFeatures();
            },
          );
        },
      });
      md.addButton({
        key: "draw_btn_uncombine",
        classesIcon: "mx-draw--btn-uncombine",
        action: () => {
          md.noActionIfEmpty(
            "get_selected_ids",
            "draw_btn_uncombine",
            async () => {
              md._draw.uncombineFeatures();
            },
          );
        },
      });
    }
    md.addButton({
      key: "btn_edit_undo",
      classesIcon: ["fa", "fa-undo"],
      action: md.undoEditSession,
    });
    md.addButton({
      key: "btn_edit_redo",
      classesIcon: ["fa", "fa-repeat"],
      action: md.redoEditSession,
    });
    md.addButton({
      key: "draw_btn_trash",
      classesIcon: "mx-draw--btn-trash",
      action: opt.allowMultipart
        ? md.trashSelected
        : () => {
            md._draw.deleteAll();
            md.pushEditHistory();
          },
    });
    md.addButton({
      key: "btn_save",
      classesIcon: "mx-draw--btn-save",
      action: md.saveEditSession,
    });
    md.addButton({
      key: "btn_cancel",
      classesIcon: ["fa", "fa-times"],
      action: md.cancelEditSession,
    });
    md.updateEditHistoryButtons();
  }

  addGeometryModeButton(type) {
    const md = this;
    const mode = md.getDrawMode(type);
    const classesIcon = {
      point: "mx-draw--btn-point",
      line: "mx-draw--btn-line",
      polygon: "mx-draw--btn-polygon",
    }[type || "polygon"];
    const key = {
      point: "draw_btn_mode_point",
      line: "draw_btn_mode_line",
      polygon: "draw_btn_mode_polygon",
    }[type || "polygon"];
    md.addButton({
      key,
      classesIcon,
      action: () => {
        if (!md._editSession.opt.allowMultipart) {
          md._editSession.replacing = true;
          md._draw.deleteAll();
        }
        md._draw.changeMode(mode);
      },
    });
  }

  addCircleModeButton() {
    const md = this;
    md.addButton({
      key: "draw_btn_mode_circle",
      classesIcon: "mx-draw--btn-circle",
      action: async () => {
        const idStorage = "mx_draw_circle_radius";
        const previousRadius = localStorage.getItem(idStorage);
        const radius = await modalPrompt({
          title: elSpanTranslate("draw_mode_circle_radius_prompt_title"),
          label: elSpanTranslate("draw_mode_circle_radius_prompt_label"),
          inputOptions: {
            value: previousRadius * 1,
            type: "numeric",
          },
        });
        if (!md._editSession.opt.allowMultipart) {
          md._editSession.replacing = true;
          md._draw.deleteAll();
        }
        md._draw.changeMode("draw_circle", {
          initialRadiusInKm: radius || 10,
        });
        localStorage.setItem(idStorage, radius || 10);
      },
    });
  }

  getData() {
    const md = this;
    return md._draw.getAll();
  }

  startDrawHistory() {
    const md = this;
    md.stopDrawHistory();
    md._drawHistory = {
      history: [],
      historyIndex: -1,
      restoring: false,
      listeners: [],
    };
    const events = [
      "draw.create",
      "draw.update",
      "draw.delete",
      "draw.combine",
      "draw.uncombine",
    ];
    for (const type of events) {
      md._map.on(type, md.onDrawHistoryChange);
      md._drawHistory.listeners.push(type);
    }
    md.pushDrawHistory();
  }

  stopDrawHistory() {
    const md = this;
    for (const type of md._drawHistory?.listeners || []) {
      md._map.off(type, md.onDrawHistoryChange);
    }
    md._drawHistory = null;
  }

  onDrawHistoryChange() {
    const md = this;
    const session = md._drawHistory;
    if (!session || session.restoring) {
      return;
    }
    md.pushDrawHistory();
  }

  pushDrawHistory() {
    const md = this;
    const session = md._drawHistory;
    if (!session || session.restoring) {
      return;
    }
    const data = md._draw.getAll();
    const next = JSON.stringify(data);
    const previous = session.history[session.historyIndex]?.hash;
    if (next === previous) {
      md.updateDrawHistoryButtons();
      return;
    }
    session.history.splice(session.historyIndex + 1);
    session.history.push({
      hash: next,
      data: clone(data),
    });
    session.historyIndex = session.history.length - 1;
    md.updateDrawHistoryButtons();
  }

  restoreDrawHistory(index) {
    const md = this;
    const session = md._drawHistory;
    const item = session?.history[index];
    if (!session || !item) {
      return;
    }
    session.restoring = true;
    md._draw.deleteAll();
    if (item.data.features.length) {
      md._draw.add(clone(item.data));
    }
    session.historyIndex = index;
    session.restoring = false;
    md.updateDrawHistoryButtons();
  }

  undoDrawHistory() {
    const md = this;
    const session = md._drawHistory;
    if (session && session.historyIndex > 0) {
      md.restoreDrawHistory(session.historyIndex - 1);
    }
  }

  redoDrawHistory() {
    const md = this;
    const session = md._drawHistory;
    if (session && session.historyIndex < session.history.length - 1) {
      md.restoreDrawHistory(session.historyIndex + 1);
    }
  }

  updateDrawHistoryButtons() {
    const md = this;
    const session = md._drawHistory;
    const btnUndo = md.getButton("btn_edit_undo");
    const btnRedo = md.getButton("btn_edit_redo");
    if (!session) {
      btnUndo?.lock();
      btnRedo?.lock();
      return;
    }
    if (session.historyIndex > 0) {
      btnUndo?.unlock();
    } else {
      btnUndo?.lock();
    }
    if (session.historyIndex < session.history.length - 1) {
      btnRedo?.unlock();
    } else {
      btnRedo?.lock();
    }
  }

  async startEditSession(opt = {}) {
    const md = this;
    const sessionOpt = Object.assign(
      {
        type: "polygon",
        feature: null,
        geometry: null,
        maxZoom: md._opt.edit_max_zoom,
        allowMultipart: false,
        promoteToMulti: false,
        onSave: null,
        onCancel: null,
      },
      opt,
    );

    if (md._editSession) {
      return {
        status: "cancelled",
        geometry: null,
      };
    }

    md.clearGeometryPreview();
    await md.ensureDraw();

    if (md._enabled || md.hasData()) {
      const discard = await md.discardPrompt();
      if (!discard) {
        return {
          status: "cancelled",
          geometry: null,
        };
      }
      md.discard();
      if (md._enabled) {
        md.stopDrawHistory();
        md.clearButtonsType();
        md._btn_toggle.elButton.classList.remove("active");
        md._enabled = false;
        md.fire("disable");
      }
    }

    return new Promise((resolve) => {
      md._editSession = {
        opt: sessionOpt,
        initiallyEmpty: !(
          md.getFeatureGeometry(sessionOpt.feature) || sessionOpt.geometry
        ),
        history: [],
        historyIndex: -1,
        restoring: false,
        replacing: false,
        listeners: [],
        resolve,
      };

      md._btn_toggle.lock();
      md.initButtonsEditSession();
      md.discard();
      md.loadEditFeature(sessionOpt);
      md.bindEditSessionEvents();
      md.pushEditHistory();
      md.fire("enable");
      md.fire("edit_session_start", sessionOpt);
    });
  }

  loadEditFeature(opt) {
    const md = this;
    const geometry = md.getFeatureGeometry(opt.feature) || opt.geometry;
    if (geometry) {
      const feature = {
        type: "Feature",
        properties: {
          ...opt.feature?.properties,
          gid: opt.feature?.gid,
        },
        geometry,
      };
      const features = opt.allowMultipart
        ? splitFeatureForEditing(feature)
        : [feature];
      const ids = md._draw.add({
        type: "FeatureCollection",
        features,
      });
      if (opt.allowMultipart) {
        md._draw.changeMode("simple_select");
      } else {
        md._draw.changeMode("simple_select", { featureIds: ids });
      }
      md.focusGeometry(geometry, { maxZoom: opt.maxZoom });
    } else {
      md._draw.changeMode(md.getDrawMode(opt.type));
    }
  }

  bindEditSessionEvents() {
    const md = this;
    const session = md._editSession;
    const events = [
      "draw.create",
      "draw.update",
      "draw.delete",
      "draw.combine",
      "draw.uncombine",
    ];
    for (const type of events) {
      md._map.on(type, md.onEditDrawChange);
      session.listeners.push(type);
    }
  }

  unbindEditSessionEvents() {
    const md = this;
    const session = md._editSession;
    for (const type of session?.listeners || []) {
      md._map.off(type, md.onEditDrawChange);
    }
  }

  onEditDrawChange() {
    const md = this;
    const session = md._editSession;
    if (!session || session.restoring) {
      return;
    }
    const data = getCompleteFeatureCollection(md._draw.getAll());
    if (session.replacing && data.features.length === 0) {
      md.updateEditHistoryButtons();
      return;
    }
    session.replacing = false;
    if (!session.opt.allowMultipart) {
      md.enforceSingleEditFeature();
    }
    md.pushEditHistory();
  }

  enforceSingleEditFeature() {
    const md = this;
    const session = md._editSession;
    const data = getCompleteFeatureCollection(md._draw.getAll());
    if (!session || data.features.length <= 1) {
      return;
    }
    const keep = data.features[data.features.length - 1];
    session.restoring = true;
    md._draw.deleteAll();
    md._draw.add(keep);
    session.restoring = false;
  }

  pushEditHistory() {
    const md = this;
    const session = md._editSession;
    if (!session || session.restoring) {
      return;
    }
    const data = getCompleteFeatureCollection(md._draw.getAll());
    const next = getFeatureCollectionGeometryHash(data);
    const previous = session.history[session.historyIndex]?.hash;
    if (next === previous) {
      md.updateEditHistoryButtons();
      return;
    }
    session.history.splice(session.historyIndex + 1);
    session.history.push({
      hash: next,
      data: clone(data),
    });
    session.historyIndex = session.history.length - 1;
    md.updateEditHistoryButtons();
  }

  restoreEditHistory(index) {
    const md = this;
    const session = md._editSession;
    const item = session?.history[index];
    if (!session || !item) {
      return;
    }
    session.restoring = true;
    md._draw.changeMode("simple_select");
    md._draw.deleteAll();
    if (item.data.features.length) {
      const ids = md._draw.add(clone(item.data));
      if (session.opt.allowMultipart) {
        md._draw.changeMode("simple_select");
      } else {
        md._draw.changeMode("simple_select", { featureIds: ids });
      }
    } else {
      md._draw.changeMode(md.getDrawMode(session.opt.type));
    }
    session.historyIndex = index;
    session.replacing = false;
    session.restoring = false;
    md.updateEditHistoryButtons();
  }

  undoEditSession() {
    const md = this;
    const session = md._editSession;
    if (session && session.historyIndex > 0) {
      md.restoreEditHistory(session.historyIndex - 1);
    }
  }

  redoEditSession() {
    const md = this;
    const session = md._editSession;
    if (session && session.historyIndex < session.history.length - 1) {
      md.restoreEditHistory(session.historyIndex + 1);
    }
  }

  updateEditHistoryButtons() {
    const md = this;
    const session = md._editSession;
    const btnUndo = md.getButton("btn_edit_undo");
    const btnRedo = md.getButton("btn_edit_redo");
    if (!session) {
      return;
    }
    if (session.historyIndex > 0) {
      btnUndo?.unlock();
    } else {
      btnUndo?.lock();
    }
    if (session.historyIndex < session.history.length - 1) {
      btnRedo?.unlock();
    } else {
      btnRedo?.lock();
    }
  }

  async saveEditSession() {
    const md = this;
    const session = md._editSession;
    if (!session) {
      return;
    }
    const activeMode = md._draw.getMode();
    if (!session.opt.allowMultipart && !activeMode?.startsWith("draw_")) {
      md.enforceSingleEditFeature();
    }
    let result;
    try {
      result = await applyGeometrySave(
        md._draw.getAll(),
        {
          type: session.opt.type,
          allowMultipart: session.opt.allowMultipart,
          promoteToMulti: session.opt.promoteToMulti,
          allowEmptyPlaceholder: session.initiallyEmpty,
          activeMode,
        },
        session.opt.onSave,
      );
    } catch (e) {
      console.error("Draw edit session save failed", e);
      return;
    }
    if (result.status !== "saved") {
      const content = {
        active_drawing:
          "Finish the active drawing with Enter or double-click, or discard it with Escape, before saving.",
        incomplete:
          "Finish or discard the geometry currently being drawn before saving.",
        incompatible:
          "All geometry parts must use the source's point, line, or polygon type.",
        multipart_not_allowed:
          "This geometry column accepts only one geometry part.",
      }[result.status];
      await modalDialog({
        title: "Geometry cannot be saved",
        content,
      });
      return;
    }
    md.finishEditSession(result);
  }

  async cancelEditSession() {
    const md = this;
    const session = md._editSession;
    if (!session) {
      return;
    }
    const result = {
      status: "cancelled",
      geometry: null,
    };
    if (typeof session.opt.onCancel === "function") {
      await session.opt.onCancel(result);
    }
    md.finishEditSession(result);
  }

  finishEditSession(result) {
    const md = this;
    const session = md._editSession;
    if (!session) {
      return;
    }
    md.unbindEditSessionEvents();
    md.discard();
    md.clearButtonsType();
    md._btn_toggle.unlock();
    md._editSession = null;
    md.fire("disable");
    md.fire("edit_session_end", result);
    session.resolve(result);
  }

  getDrawMode(type) {
    switch (type) {
      case "point":
        return "draw_point";
      case "line":
        return "draw_line_string";
      case "polygon":
      default:
        return "draw_polygon";
    }
  }

  getFeatureGeometry(feature) {
    if (!feature) {
      return null;
    }
    if (feature.type === "Feature") {
      return feature.geometry || null;
    }
    return feature.geom || feature.geometry || null;
  }

  focusGeometry(geometry, opt = {}) {
    const md = this;
    const maxZoom = Number(opt.maxZoom || 0);
    const focus = getGeometryFocus(geometry);
    if (!focus) {
      return;
    }
    if (focus.isPoint) {
      md._map.flyTo({
        center: focus.center,
        zoom: maxZoom || md._map.getZoom(),
        duration: 300,
      });
      return;
    }
    md._map.fitBounds(focus.bounds, {
      padding: 80,
      maxZoom: maxZoom || md._map.getZoom(),
      duration: 300,
    });
  }

  /**
   * Display one geometry independently from project views, then focus it.
   * The preview is replaced on the next call and remains until explicitly
   * cleared or a draw/edit session starts.
   * @param {Object} geometry GeoJSON geometry
   * @param {Object} [opt] focusGeometry options
   * @returns {Boolean} whether the preview was displayed
   */
  showGeometryPreview(geometry, opt = {}) {
    const md = this;
    const map = md._map;
    if (!getGeometryFocus(geometry) || !map?.getStyle?.()) {
      return false;
    }

    const data = {
      type: "Feature",
      properties: {},
      geometry,
    };
    md._geometryPreview.show(map, data, opt.owner);
    md.focusGeometry(geometry, opt);
    return true;
  }

  /** Remove the temporary feature preview if it exists in the current style. */
  clearGeometryPreview(owner) {
    return this._geometryPreview.clear(this._map, owner);
  }

  clearButtonsType() {
    const md = this;
    let i = md._buttons.length;
    while (i--) {
      const btn = md._buttons[i];
      if (btn.opt.key !== "draw_btn_toggle") {
        btn.destroy();
        md._buttons.splice(i, 1);
      }
    }
  }

  showModalHelp() {
    return modalIframe({
      title: getDictItem("draw_help_title"),
      doc_id: "doc_draw_tool",
    });
  }

  showModalConfig() {
    let elType, elTitle;
    const md = this;
    return new Promise((resolve) => {
      const elForm = el(
        "form",
        el("div", { class: "form-group" }, [
          el("label", elSpanTranslate("draw_feature_type")),
          (elType = el(
            "select",
            { class: "form-control" },
            el("option", { value: "polygon" }, elSpanTranslate("draw_polygon")),
            el("option", { value: "line" }, elSpanTranslate("draw_line")),
            el("option", { value: "point" }, elSpanTranslate("draw_point")),
          )),
        ]),
        el("div", { class: "form-group" }, [
          el(
            "label",
            { class: "control-label" },
            elSpanTranslate("draw_layer_name"),
          ),
          (elTitle = el("input", {
            class: "form-control",
            type: "text",
            value: md._default_title(),
          })),
        ]),
      );

      const elBtnSubmit = el(
        "div",
        {
          class: "btn btn-default",
          on: {
            click: () => {
              resolve({
                type: elType.value,
                title: elTitle.value,
              });
              if (md._modal_config) {
                md._modal_config.close();
              }
            },
          },
        },
        elSpanTranslate("draw_config_submit"),
      );
      md._modal_config = modal({
        noShinyBinding: true,
        addSelectize: false,
        title: elSpanTranslate("draw_config_title"),
        content: elForm,
        buttons: [elBtnSubmit],
        addBackground: true,
        onClose: resolve,
      });
    });
  }

  async trashSelected() {
    const md = this;
    md.noActionIfEmpty("get_selected_ids", "draw_btn_trash", async () => {
      const confirmed = await modalConfirm({
        title: elSpanTranslate("draw_trash_confirm_title"),
        content: elSpanTranslate("draw_trash_confirm_content"),
      });
      if (confirmed) {
        md._draw.trash();
      }
    });
  }

  async createView() {
    const md = this;
    await md.noActionIfEmpty("get_all", "draw_btn_save", async () => {
      const data = md.getData();

      const view = await spatialDataToView({
        title: md._opt.title,
        fileName: md._opt.title,
        fileType: "geojson",
        data: data,
        save: true,
      });

      await viewsListAddSingle(view, {
        open: true,
      });

      const quit = await modalConfirm({
        title: elSpanTranslate("draw_saved_quit_title"),
        content: elSpanTranslate("draw_saved_quit"),
        confirm: elSpanTranslate("draw_saved_quit_confirm"),
        cancel: elSpanTranslate("draw_saved_quit_stay"),
      });

      if (quit) {
        md.discard();
        md.disable();
      }
    });
  }

  _default_title() {
    return `Untitled ${new Date().toLocaleString()}`;
  }
}
export { MapxDraw };
