import { el } from "./../el/src/index.js";
import { elSpanTranslate } from "./../el_mapx/index.js";
import { modal, modalConfirm, modalPrompt } from "./../mx_helper_modal.js";
import { modalIframe } from "../modal_iframe/index.js";
import { Button } from "./../panel_controls/button.js";
import { ControlsPanel } from "./../panel_controls/index.js";
import { getDictItem } from "./../language";
import { bindAll } from "./../bind_class_methods/index.js";
import { spatialDataToView } from "./../mx_helper_map_dragdrop.js";
import { viewsListAddSingle } from "./../views_list_manager";
import { EventSimple } from "../event_simple";
import { controls } from "./../mx.js";

import "./style.less";

const def = {};

const local = {
  instance: null,
};

class MapxDraw extends EventSimple {
  constructor() {
    super();
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
    md.discard();
    md._buttons.forEach(md.removeButton);
    if (md._modal_config) {
      md._modal_config.close();
    }
    md.fire("destroy");
  }

  async toggle(e) {
    const md = this;
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
    if (md._enabled) {
      return;
    }
    if (!md._draw) {
      const moduleDraw = await import("@mapbox/mapbox-gl-draw");
      const moduleDrawCircle = await import("mapbox-gl-draw-circle");
      const MapboxDraw = moduleDraw.default;

      md._draw = new MapboxDraw({
        displayControlsDefault: false,
        userProperties: true,
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
          /**
           * Select circle handling
           */
          direct_select: moduleDrawCircle.DirectMode,
          simple_select: moduleDrawCircle.SimpleSelectMode,
        },
      });
      md._map.addControl(md._draw);
    }
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
    elBtn.classList.add("active");
    md._enabled = true;
    md.fire("enable");
  }

  async disable() {
    const md = this;
    const elBtn = md._btn_toggle.elButton;

    if (!md._enabled) {
      return;
    }
    const discard = await md.discardPrompt();
    if (!discard) {
      return;
    }
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
    md._draw.deleteAll();
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
    key = key instanceof Button ? key.key : key;
    while (i--) {
      const btn = md._buttons[i];
      if (btn.key === key) {
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
  }

  getData() {
    const md = this;
    return md._draw.getAll();
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
