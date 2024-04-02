import { Box } from "./box.js";
import { el, elButtonFa, elSpanTranslate as tt } from "../../el_mapx";
import { getDictItem } from "../../language";
import presets from "./../data/paper_sizes.json";
import { throttleFrame } from "../../mx_helper_misc.js";

class Toolbar extends Box {
  constructor(boxParent) {
    super(boxParent);
    const toolbar = this;
    toolbar.mc = boxParent;
    toolbar.initToolbar();
  }

  initToolbar() {
    const toolbar = this;
    toolbar.title = "toolbar";
    toolbar.init({
      class: ["mc-toolbar"],
      boxContainer: toolbar.mc,
      content: toolbar.buildToolbar(),
      draggable: false,
      resizable: false,
    });

    toolbar.lStore.addListener({
      target: toolbar.el,
      type: "change",
      idGroup: "toolbar_change",
      callback: throttleFrame(toolbar.changeCallback),
      bind: toolbar,
    });

    toolbar.lStore.addListener({
      target: toolbar.el,
      type: "input",
      idGroup: "toolbar_change",
      callback: throttleFrame(toolbar.inputCallback),
      bind: toolbar,
    });

    toolbar.lStore.addListener({
      target: toolbar.el,
      type: "click",
      idGroup: "toolbar_click",
      callback: toolbar.clickCallback,
      bind: toolbar,
    });
    toolbar.buildPresetOptions();
  }

  async inputCallback(e) {
    const toolbar = this;
    const mc = toolbar.mc;
    if (!mc.ready) {
      return;
    }
    const elTarget = e.target;
    const d = elTarget.dataset;
    const idAction = d.mc_action;
    const isInput = d.mc_event_type == "input";
    if (!isInput || idAction !== "update_state") {
      return;
    }
    const value = toolbar.validateValue(e.target);
    const idState = d.mc_state_name;

    mc.setState(idState, value);
  }

  async changeCallback(e) {
    const toolbar = this;
    const mc = toolbar.mc;
    if (!mc.ready) {
      return;
    }
    const elTarget = e.target;
    const d = elTarget.dataset;
    const idAction = d.mc_action;

    const isChange = d.mc_event_type == "change";
    if (!isChange || idAction !== "update_state") {
      return;
    }
    const value = toolbar.validateValue(e.target);
    const idState = d.mc_state_name;

    mc.setState(idState, value);
  }

  async clickCallback(e) {
    const toolbar = this;
    const mc = toolbar.mc;
    if (!mc.ready) {
      return;
    }
    const elTarget = e.target;
    const d = elTarget.dataset;
    const idAction = d.mc_action;

    switch (idAction) {
      case "export_page":
        await mc.workspace.page.export();
        break;
      case "toggle_landscape":
        mc.inversePageHeightWidth();
        break;
      case "fit_map_to_page":
        mc.fitMapToPage();
        break;
      case "zoom_in":
        mc.workspace.page.zoomIn();
        break;
      case "zoom_out":
        mc.workspace.page.zoomOut();
        break;
      case "zoom_fit_width":
        mc.workspace.page.zoomFitWidth();
        break;
      case "zoom_fit_height":
        mc.workspace.page.zoomFitHeight();
        break;
      default:
        null;
    }
  }

  validateValueNumber(el) {
    let value = el.value * 1;
    const min = el.min * 1;
    const max = el.max * 1;
    if (value >= max) {
      value = max;
    }
    if (value <= min) {
      value = min;
    }
    el.value = value;
    return value;
  }

  validateValueString(el) {
    const value = el.value + "";
    el.value = value;
    return value;
  }

  validateValueSelect(el) {
    const toolbar = this;
    return toolbar.validateValueString(el);
  }

  validateValueCheckbox(el) {
    return !!el.checked;
  }

  validateValue(el) {
    const toolbar = this;
    if (el.type === "checkbox") {
      return toolbar.validateValueCheckbox(el);
    }
    if (el.type === "number" || el.type === "range") {
      return toolbar.validateValueNumber(el);
    }
    if (el.type === "select-one") {
      return toolbar.validateValueSelect(el);
    }
    if (el.type === "string") {
      return toolbar.validateValueString(el);
    }
    return "";
  }

  getControl(id) {
    const toolbar = this;
    const elControl = toolbar.el.querySelector(`[data-mc_state_name=${id}]`);
    return elControl;
  }

  enableControl(id) {
    const toolbar = this;
    const elControl = toolbar.getControl(id);
    if (elControl) {
      elControl.removeAttribute("disabled");
      elControl.classList.remove("mc-disabled");
    }
  }

  disableControl(id) {
    const toolbar = this;
    const elControl = toolbar.getControl(id);
    if (elControl) {
      elControl.setAttribute("disabled", true);
      elControl.classList.add("mc-disabled");
    }
  }

  /**
   * Build preset options : paper sizes
   */
  buildPresetOptions() {
    const toolbar = this;
    /**
     * Generate preset options
     */
    const elOptions = document.createDocumentFragment();

    for (const presetGroup of Object.keys(presets)) {
      const preset = presets[presetGroup];
      const elPresetGroup = el("optgroup");
      getDictItem(presetGroup)
        .then((v) => {
          elPresetGroup.setAttribute("label", v);
        })
        .catch(console.error);

      for (const item of preset) {
        if (item.disabled) {
          continue;
        }
        const elOption = el("option", { value: item.name });
        getDictItem(item.name)
          .then((v) => {
            elOption.innerText = v;
          })
          .catch(console.error);
        elPresetGroup.appendChild(elOption);
      }
      elOptions.appendChild(elPresetGroup);
    }
    toolbar.elSelectPreset.innerHTML = "";
    toolbar.elSelectPreset.appendChild(elOptions);
  }
  /**
   * Build toolbox form / ui
   */
  buildToolbar() {
    const toolbar = this;
    const { unit, units, mode, modes } = toolbar.state;

    /**
     * Preset
     */
    toolbar.elSelectPreset = el(
      "select",
      {
        class: "form-control",
        dataset: {
          mc_action: "update_state",
          mc_event_type: "change",
          mc_state_name: "predefined_dim",
        },
      }
      // options generated later (translations);
    );
    toolbar.elGroupPreset = el(
      "div",
      {
        class: "form-group",
      },
      [el("label", tt("mc_label_predefined_dim")), toolbar.elSelectPreset],
      el("span", { class: "text-muted" }, tt("mc_label_predefined_dim_desc"))
    );

    /**
     * Landscape
     */
    toolbar.elGroupLandscape = el(
      "div",
      {
        class: "form-group",
      },
      el(
        "button",
        {
          type: "button",
          class: ["btn", "btn-default"],
          dataset: {
            mc_action: "toggle_landscape",
            mc_event_type: "click",
          },
        },
        tt("mc_button_toggle_landscape")
      ),
      el("span", { class: "text-muted" }, tt("mc_button_toggle_landscape_desc"))
    );

    /**
     * Fit to map
     */
    toolbar.elGroupFitToMap = el(
      "div",
      {
        class: "form-group",
      },
      el(
        "button",
        {
          type: "button",
          class: ["btn", "btn-default"],
          dataset: {
            mc_action: "fit_map_to_page",
            mc_event_type: "click",
          },
        },
        tt("mc_button_fit_map_page")
      ),
      el("span", { class: "text-muted" }, tt("mc_button_fit_map_page_desc"))
    );

    /**
     * Layout zoom
     */
    toolbar.elGroupZoom = el(
      "div",
      {
        class: ["form-group"],
      },
      [
        el("label", tt("mc_label_zoom")),
        el(
          "div",
          {
            class: "btn-group",
          },
          [
            elButtonFa("mc_button_zoom_in", {
              icon: "search-plus",
              mode: "icon",
              dataset: {
                mc_action: "zoom_in",
                mc_event_type: "click",
              },
            }),

            elButtonFa("mc_button_zoom_out", {
              icon: "search-minus",
              mode: "icon",
              dataset: {
                mc_action: "zoom_out",
                mc_event_type: "click",
              },
            }),
            elButtonFa("mc_button_zoom_fit_height", {
              icon: "arrows-v",
              mode: "icon",
              dataset: {
                mc_action: "zoom_fit_height",
                mc_event_type: "click",
              },
            }),
            elButtonFa("mc_button_zoom_fit_width", {
              icon: "arrows-h",
              mode: "icon",
              dataset: {
                mc_action: "zoom_fit_width",
                mc_event_type: "click",
              },
            }),
          ]
        ),
        el("span", { class: "text-muted" }, tt("mc_button_zoom_desc")),
      ]
    );

    /**
     * Export
     */

    toolbar.elGroupExport = el(
      "div",
      {
        class: "form-group",
      },
      el(
        "button",
        {
          type: "button",
          class: ["btn", "btn-default"],
          dataset: {
            mc_action: "export_page",
            mc_event_type: "click",
          },
        },
        tt("mc_button_export")
      ),
      el("span", { class: "text-muted" }, tt("mc_button_export_desc"))
    );

    /**
     * Group units
     */
    const elUnitOptions = units.map((u) => {
      return unit === u ? el("option", { selected: true }, u) : el("option", u);
    });

    toolbar.elInputUnit = el(
      "select",
      {
        class: "form-control",
        dataset: {
          mc_action: "update_state",
          mc_event_type: "change",
          mc_state_name: "unit",
        },
      },
      elUnitOptions
    );

    toolbar.elGroupUnits = el(
      "div",
      {
        class: "form-group",
      },
      [el("label", tt("mc_label_unit")), toolbar.elInputUnit],
      el("span", { class: "text-muted" }, tt("mc_label_unit_desc"))
    );

    /**
     * Content scale
     */
    toolbar.elInputScaleContent = el("input", {
      type: "range",
      class: "form-control",
      dataset: {
        mc_action: "update_state",
        mc_event_type: "input",
        mc_state_name: "scale_content",
      },
      step: 0.1,
      value: 1,
      max: 3,
      min: 0.5,
    });

    toolbar.elGroupScaleContent = el(
      "div",
      {
        class: "form-group",
      },
      el("label", tt("mc_label_scale")),
      toolbar.elInputScaleContent,
      el("span", { class: "text-muted" }, tt("mc_label_scale_desc"))
    );

    /**
     * Width
     */
    toolbar.elInputPageWidth = el("input", {
      type: "number",
      class: "form-control",
      dataset: {
        mc_action: "update_state",
        mc_event_type: "change",
        mc_state_name: "page_width",
      },
      step: 1,
      max: 1000,
      min: 1,
    });
    toolbar.elGroupWidth = el(
      "div",
      {
        class: "form-group",
      },
      el("label", tt("mc_label_width")),
      toolbar.elInputPageWidth,
      el("span", { class: "text-muted" }, tt("mc_label_width_desc"))
    );

    /**
     * Height
     */
    toolbar.elInputPageHeight = el("input", {
      type: "number",
      class: "form-control",
      dataset: {
        mc_action: "update_state",
        mc_event_type: "change",
        mc_state_name: "page_height",
      },
      step: 1,
      max: 1000,
      min: 1,
    });
    toolbar.elGroupHeight = el(
      "div",
      {
        class: "form-group",
      },
      el("label", tt("mc_label_height")),
      toolbar.elInputPageHeight,
      el("span", { class: "text-muted" }, tt("mc_label_height_desc"))
    );

    /**
     * Columns legends
     */
    toolbar.elGroupLegendColumns = el(
      "div",
      {
        class: "form-group",
      },
      el("label", tt("mc_label_legend_columns")),
      el("input", {
        type: "number",
        class: "form-control",
        dataset: {
          mc_action: "update_state",
          mc_event_type: "change",
          mc_state_name: "legends_n_columns",
        },

        value: 1,
        max: 10,
        min: 1,
      }),
      el("span", { class: "text-muted" }, tt("mc_label_legend_columns_desc"))
    );

    /**
     * Modes
     */
    const elModesOptions = modes.map((m) => {
      return mode === m
        ? el("option", { selected: true, value: m }, m)
        : el("option", { value: m }, m);
    });
    toolbar.elGroupModes = el(
      "div",
      {
        class: "form-group",
      },
      [
        el("label", tt("mc_label_mode")),
        el(
          "select",
          {
            class: "form-control",
            dataset: {
              mc_action: "update_state",
              mc_event_type: "change",
              mc_state_name: "mode",
            },
          },
          elModesOptions
        ),
      ],
      el("span", { class: "text-muted" }, tt("mc_label_mode_desc"))
    );

    return el(
      "form",
      {
        class: "mc-toolbar-content",
      },
      [
        toolbar.elGroupPreset,
        toolbar.elGroupLandscape,
        toolbar.elGroupFitToMap,
        toolbar.elGroupZoom,
        toolbar.elGroupExport,
        toolbar.elGroupUnits,
        toolbar.elGroupScaleContent,
        toolbar.elGroupWidth,
        toolbar.elGroupHeight,
        toolbar.elGroupLegendColumns,
        toolbar.elGroupModes,
      ]
    );
  }
}

export { Toolbar };
