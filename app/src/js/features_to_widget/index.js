import { getArrayStat } from "./../array_stat/index.js";
import { getDictItem, getLabelFromObjectPath } from "./../language";
import {
  getView,
  getViewAttributes,
  getViewTitle,
  getViewVtSourceId,
} from "../map_helpers/index.js";
import {
  isEmpty,
  isElement,
  isNumeric,
  isArray,
  isViewVt,
  isViewGj,
} from "../is_test_mapx/index.js";
import { settings } from "../mx.js";
import { getAttributesAlias } from "../metadata/utils.js";
import { dashboard } from "../dashboards/index.js";
import { EventSimple } from "../event_simple/index.js";
import { Widget } from "../dashboards/widget.js";
import { elWait, el, elCheckToggle } from "../el_mapx/index.js";
import "./style.less";
import { onNextFrame } from "../animation_frame/index.js";

const state = {
  widget: null,
};

const defaults = {
  fw_anim: {
    delay: 50,
  },
  fw_dashboard: {
    width: 350,
  },
  fw_widget: {
    modules: [],
    layout: "auto",
    panel_init_close: false,
    disabled: false,
    widgets: [
      {
        priority: 0,
        width: "fit_dashboard",
        height: "auto",
        style: {
          minWidth: "200px",
        },
        handlers: {
          onAdd: () => {},
          onRemove: () => {},
          onData: () => {},
        },
        source: "none",
        disabled: false,
        attribution: "MapX",
        colorBackground: "#000000",
        sourceIgnoreEmpty: true,
        addColorBackground: false,
      },
    ],
  },
};

window._fw_state = state;

export class FeaturesToWidget extends EventSimple {
  constructor() {
    super();
  }

  async init(options) {
    const fw = this;
    fw.attributes = options.layersAttributes;
    fw.filters = {};
    const hasPrevious =
      state.widget instanceof Widget && !state.widget.destroyed;
    if (hasPrevious) {
      fw.elContainer = state.widget.elContent.firstElementChild;
    } else {
      fw.elContainer = el("div", {
        class: ["mx-feature-widget--container"],
      });
      state.widget = await fw.setWidget();
      state.widget.elContent.appendChild(fw.elContainer);
      state.widget.on("destroyed", () => {
        fw.destroy();
      });
    }
    while (fw.elContainer.firstElementChild) {
      fw.elContainer.removeChild(fw.elContainer.firstElementChild);
    }
    await fw.render();
    await state.widget.dashboard.show();
    await state.widget.dashboard.setWidth(defaults.fw_dashboard.width, false);
    fw.updateSize();
  }

  updateSize() {
    state.widget.updateSize();
  }

  updateGridLayout() {
    onNextFrame(() => {
      state.widget.dashboard.updateGridLayout();
    });
  }

  destroy() {
    if (this._is_destroyed) {
      return;
    }
    this.resetFilter();
    state.widget?.destroy();
    state.widget = null;
    this._is_destroyed = true;
    this.fire("destroyed");
  }

  async elIssueMessage(idMsg) {
    const elIssue = el("div", "no values");
    idMsg = idMsg || "noValue";
    const txt = await getDictItem(idMsg);
    elIssue.innerText = txt;
    elIssue.dataset.lang_key = idMsg;
    return elIssue;
  }

  async setWidget() {
    const conf = defaults.fw_widget;
    const d = await dashboard.getOrCreate(conf);
    const [widget] = await d.addWidgets(conf);
    return widget;
  }

  async render() {
    const proms = [];
    for (const idView in this.attributes) {
      proms.push(this._render_item(idView, this.attributes[idView]));
    }
    await Promise.all(proms);
  }

  async _render_item(idView, promAttributes) {
    const view = getView(idView);
    const isVector = isViewVt(view) || isViewGj(view);
    const title = getViewTitle(idView);

    const labels = {};
    const item = {};

    try {
      // Initialize the item with a title, spinner, and attributes container
      this._render_init_item(item, title);

      this.elContainer.appendChild(item.elItem);

      // Wait for the attributes promise to resolve
      const attributes = await promAttributes;
      item.elSpinner.remove();

      const attrNames = Object.keys(attributes);
      const attrOrder = getViewAttributes(view);

      if (attrNames.length === 0) {
        item.elAttributesContainer.appendChild(
          await this.elIssueMessage("noValue"),
        );
        item.elItem.classList.add("disabled");
        return;
      }

      // Fetch attribute labels if the view is vector
      if (isViewVt(view)) {
        const idSource = getViewVtSourceId(view);
        Object.assign(labels, await getAttributesAlias(idSource, attrNames));
      }

      // Iterate through each attribute and build elements
      for (const attribute of attrNames) {
        const position = attrOrder.indexOf(attribute);
        this._render_attribute(
          item,
          attribute,
          attributes[attribute],
          labels,
          idView,
          isVector,
          position,
        );
      }
    } catch (err) {
      this._render_on_error(item, err);
    }
  }

  _render_init_item(item, title) {
    item.elTitle = el("span", { class: "mx-feature-widget--title" }, title);
    item.elSpinner = elWait("Fetch values...");
    item.elAttributesContainer = el("div", {
      class: "mx-feature-widget--attributes",
    });

    item.elItem = el("div", { class: "mx-feature-widget--item" }, [
      item.elTitle,
      item.elSpinner,
      item.elAttributesContainer,
    ]);
  }

  _render_attribute(item, attribute, values, labels, idView, isVector, order) {
    const fw = this;
    const label = getLabelFromObjectPath({
      obj: labels[attribute],
      defaultValue: attribute,
    });

    const valuesSorted = getArrayStat({ stat: "sortNatural", arr: values });
    if (valuesSorted.length === 0) {
      valuesSorted.push("-");
    }

    // Create attribute container elements
    const elAttributeValues = el("div", {
      class: "mx-feature-widget--attribute-values",
    });

    const elAttributeTitle = el(
      "summary",
      {
        class: "mx-feature-widget--attribute-title",
        title: attribute,
      },
      label,
    );
    const elAttribute = el(
      "details",
      {
        class: "mx-feature-widget--attribute",
        on: ["click", () => fw.updateGridLayout()],
      },
      [elAttributeTitle, elAttributeValues],
    );
    // raster = -1, vector 0
    if (order < 1) {
      elAttribute.setAttribute("open", true);
    }
    elAttribute.style.order = order;

    item.elAttributesContainer.appendChild(elAttribute);

    // Append values to the attribute grid
    const maxValue = 5;
    const nItems = valuesSorted.length;
    const addBtnMore = nItems > maxValue;
    const { collector, elBtnMore } = this._build_more(elAttributeValues);

    for (let i = 0, iL = valuesSorted.length; i < iL; i++) {
      const value = valuesSorted[i];
      const elValue = this._render_value(value, idView, attribute, isVector);
      if (i > maxValue) {
        collector(elValue);
      } else {
        elAttributeValues.appendChild(elValue);
      }
    }
    if (addBtnMore) {
      elAttributeValues.appendChild(elBtnMore);
    }
  }

  _build_more(elTarget) {
    const fw = this;
    const elFragItems = document.createDocumentFragment();
    const elBtnMore = el(
      "label",
      {
        on: ["click", renderMore],
        class: [
          "mx-feature-widget--value",
          "mx-feature-widget--value-clickable",
        ],
      },
      "More",
    );

    return {
      elBtnMore,
      collector,
    };

    function collector(x) {
      elFragItems.appendChild(x);
    }

    function renderMore() {
      elBtnMore.remove();
      elTarget.appendChild(elFragItems);
      fw.updateSize();
    }
  }

  _render_value(value, idView, attribute, isVector) {
    const valueArray = isArray(value) ? value : [value];
    const elFrag = document.createDocumentFragment();

    for (const val of valueArray) {
      const elValue = isVector
        ? elCheckToggle({
            label: val,
            onChange: this.filterValues.bind(this),
            data: {
              layer: idView,
              attribute,
              value: val,
              type: isNumeric(val) ? "numeric" : "string",
            },
            checked: false,
            classLabel: [
              "mx-feature-widget--value",
              "mx-feature-widget--value-clickable",
            ],
          })
        : el("label", { class: "mx-feature-widget--value" }, val);
      elFrag.appendChild(elValue);
    }

    return elFrag;
  }

  async _render_on_error(item, err) {
    if (isElement(item.elItem)) {
      item.elItem.appendChild(
        await this.elIssueMessage("property_list_failed"),
      );
    }
    if (isElement(item.elSpinner)) {
      item.elSpinner.remove();
    }
    console.error("Error rendering item:", err);
  }

  resetFilter() {
    for (const idV in this.filters) {
      const view = getView(idV);

      if (!view._setFilter) {
        return;
      }

      view._setFilter({
        filter: ["all"],
        type: "popup_filter",
      });
    }
  }

  filterValues(e) {
    const elBtn = e.target;
    const elContainer = this.elContainer;
    const layer = elBtn.dataset.layer;
    const elChecks = elContainer.querySelectorAll(`[data-layer=${layer}]`);

    this.filters[layer] = ["any"];

    for (const elCheck of elChecks) {
      this.updateFilters(elCheck);
    }

    this.applyFilters(layer);
  }

  updateFilters(el) {
    const value = el.dataset.value;
    const layer = el.dataset.layer;
    const type = el.dataset.type;
    const attribute = el.dataset.attribute;
    const add = el.checked;
    const isNum = !isEmpty(type) ? type === "numeric" : isNumeric(value);
    let rule = [];
    if (add) {
      if (value === settings.valuesMap.null) {
        rule.push(...["!", ["has", attribute]]);
      } else {
        if (isNum) {
          rule = [
            "any",
            ["==", ["get", attribute], value],
            ["==", ["get", attribute], value * 1],
          ];
        } else {
          rule = ["==", ["get", attribute], value];
        }
      }
      this.filters[layer].push(rule);
    }
  }

  applyFilters(idV) {
    const filter = this.filters[idV];
    const view = getView(idV);
    if (!view._setFilter) {
      return;
    }
    view._setFilter({
      filter: filter,
      type: "popup_filter",
    });

    this.filters[idV] = [];
  }
}
