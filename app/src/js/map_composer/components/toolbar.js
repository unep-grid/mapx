import { Box } from "./box.js";
import { el, elSpanTranslate as tt } from "../../el_mapx";
import { getDictItem } from "../../language";
import presets from "./../data/paper-sizes.json";

class Toolbar extends Box {
  constructor(boxParent) {
    super(boxParent);
    const toolbar = this;
    toolbar.mc = boxParent;
    toolbar.initToolbar();
  }

  onRemove() {}

  initToolbar() {
    const toolbar = this;
    toolbar.title = "toolbar";
    toolbar.init({
      class: ["mc-toolbar"],
      boxContainer: toolbar.mc,
      content: toolbar.buildEl(),
      draggable: false,
      resizable: false,
      onRemove: toolbar.onRemove.bind(toolbar),
      onResize: toolbar.onResize.bind(toolbar),
    });

    toolbar.lStore.addListener({
      target: toolbar.el,
      type: "change",
      idGroup: "toolbar_change",
      callback: changeCallback,
      bind: toolbar,
    });

    toolbar.lStore.addListener({
      target: toolbar.el,
      type: "click",
      idGroup: "toolbar_click",
      callback: clickCallback,
      bind: toolbar,
    });
    /**
     * add options : async => translation.
     * TODO: Regenerate when language change
     */
    toolbar.buildPresetOptions().catch(console.error);
  }

  /**
   * Build preset options : paper sizes
   */
  async buildPresetOptions() {
    const toolbar = this;
    /**
     * Generate preset options
     */
    const elOptions = document.createDocumentFragment();
    elOptions.appendChild(el("optgroup", "--"));

    for (const presetGroup of Object.keys(presets)) {
      const preset = presets[presetGroup];
      const elPresetGroup = el("optgroup", {
        label: await getDictItem(presetGroup),
      });
      for (const item of preset) {
        elPresetGroup.appendChild(
          el("option", { value: item.name }, await getDictItem(item.name))
        );
      }
      elOptions.appendChild(elPresetGroup);
    }
    toolbar.elSelectPreset.innerHTML = "";
    toolbar.elSelectPreset.appendChild(elOptions);
  }

  /**
   * Build toolbox form / ui
   */
  buildEl() {
    const toolbar = this;
    const state = toolbar.state;

    /**
     *  Set default  for units and mode
     */
    const elUnitOptions = state.units.map((u) => {
      return state.unit === u
        ? el("option", { selected: true }, u)
        : el("option", u);
    });
    const elModesOptions = state.modes.map((u) => {
      return state.mode === u
        ? el("option", { selected: true, value: u }, u)
        : el("option", { value: u }, u);
    });

    /**
     * Set snap size
     */
    const sizeStep = state.grid_snap_size * window.devicePixelRatio;
    return el(
      "form",
      {
        class: "mc-toolbar-content",
      },
      [
        el(
          "div",
          {
            class: "form-group",
          },
          [
            el("label", tt("mc_label_predefined_dim")),
            /*
             * NOTE: generated later, as div/span with current
             * translation system does not work in options
             */
            (toolbar.elSelectPreset = el("select", {
              class: "form-control",
              dataset: {
                mc_action: "update_state",
                mc_event_type: "change",
                mc_state_name: "predefined_dim",
              },
            })),
          ],
          el(
            "span",
            { class: "text-muted" },
            tt("mc_label_predefined_dim_desc")
          )
        ),
        el(
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
          el(
            "span",
            { class: "text-muted" },
            tt("mc_button_toggle_landscape_desc")
          )
        ),
        el(
          "div",
          {
            class: "form-group",
          },
          [
            el("label", tt("mc_label_unit")),
            (toolbar.elInputUnit = el(
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
            )),
          ],
          el("span", { class: "text-muted" }, tt("mc_label_unit_desc"))
        ),
        (toolbar.elFormDpi = el(
          "div",
          {
            class: "form-group",
          },
          el("label", tt("mc_label_resolution")),
          (toolbar.elInputDpi = el("input", {
            type: "number",
            class: "form-control",
            dataset: {
              mc_action: "update_state",
              mc_event_type: "change",
              mc_state_name: "dpi",
            },
            step: 1,
            value: state.dpi,
            max: 300,
            min: 72,
          })),
          el("span", { class: "text-muted" }, tt("mc_label_resolution_desc"))
        )),
        el(
          "div",
          {
            class: "form-group",
          },
          el("label", tt("mc_label_width")),
          (toolbar.elInputPageWidth = el("input", {
            type: "number",
            class: "form-control",
            dataset: {
              mc_action: "update_state",
              mc_event_type: "change",
              mc_state_name: "page_width",
            },
            step: sizeStep,
            max: sizeStep * 1000,
            min: sizeStep,
          })),
          el("span", { class: "text-muted" }, tt("mc_label_width_desc"))
        ),
        el(
          "div",
          {
            class: "form-group",
          },
          el("label", tt("mc_label_height")),
          (toolbar.elInputPageHeight = el("input", {
            type: "number",
            class: "form-control",
            dataset: {
              mc_action: "update_state",
              mc_event_type: "change",
              mc_state_name: "page_height",
            },
            step: sizeStep,
            max: sizeStep * 1000,
            min: sizeStep,
          })),
          el("span", { class: "text-muted" }, tt("mc_label_height_desc"))
        ),
        /** Scaling does not work with html2canvas, as the
        * css transform is not fully supported
        *
        el(
          'div',
          {
            class: 'form-group'
          },
          el('label', 'Scale'),
          el('input', {
            type: 'number',
            class: 'form-control',
            dataset: {
              mc_action: 'update_state',
              mc_event_type: 'change',
              mc_state_name: 'content_scale'
            },
            value: 1,
            max: 1,
            min: 0.5
          })
        ),
        */
        el(
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
          el(
            "span",
            { class: "text-muted" },
            tt("mc_label_legend_columns_desc")
          )
        ),
        el(
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
        ),
        el(
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
        ),
      ]
    );
  }
}

export { Toolbar };

function clickCallback(e) {
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
      mc.workspace.page.exportPng();
      break;
    case "toggle_landscape":
      mc.inversePageHeightWidth();
      break;
    default:
      console.warn(`Click handler not found for ${idAction}`);
  }
}

function changeCallback(e) {
  const toolbar = this;
  const mc = toolbar.mc;
  if (!mc.ready) {
    return;
  }
  const elTarget = e.target;
  const d = elTarget.dataset;
  const idAction = d.mc_action;
  if (idAction === "update_state") {
    const value = validateValue(e.target);
    const idState = d.mc_state_name;
    mc.setState(idState, value);
  }
}

function validateValueNumber(el) {
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

function validateValueString(el) {
  const value = el.value + "";
  el.value = value;
  return value;
}
function validateValueSelect(el) {
  return validateValueString(el);
}
function validateValueCheckbox(el) {
  return !!el.checked;
}

function validateValue(el) {
  if (el.type === "checkbox") {
    return validateValueCheckbox(el);
  }
  if (el.type === "number") {
    return validateValueNumber(el);
  }
  if (el.type === "select-one") {
    return validateValueSelect(el);
  }
  if (el.type === "string") {
    return validateValueString(el);
  }
  return "";
}
