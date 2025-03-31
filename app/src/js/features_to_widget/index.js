import { getArrayStat } from "./../array_stat/index.js";
import { getDictItem, getLabelFromObjectPath } from "./../language";
import {
  getView,
  getViewAttributes,
  getViewTitle,
  getViewVtSourceId,
} from "../map_helpers/index.js";
import {
  isElement,
  isNumeric,
  isViewVt,
  isViewGj,
} from "../is_test_mapx/index.js";
import { settings } from "../mx.js";
import { getAttributesAlias } from "../metadata/utils.js";
import { dashboard } from "../dashboards/index.js";
import { EventSimple } from "../event_simple/index.js";
import { Widget } from "../dashboards/widget.js";
import { elWait, el } from "../el_mapx/index.js";
import "./style.less";
import { onNextFrame, waitTimeoutAsync } from "../animation_frame/index.js";
import  Tabulator  from "tabulator-tables/src/js/core/Tabulator.js";
import "tabulator-tables/dist/css/tabulator.min.css";

const defaults = {
  fw_timeout: {
    attribute: 5e3,
  },
  fw_anim: {
    delay: 50,
  },
  fw_dashboard: {
    minWidth: 400,
  },
  fw_widget: {
    modules: [],
    layout: "auto",
    panel_init_close: false,
    disabled: false,
    widgets: [
      {
        width: "fit_dashboard",
        height: "auto",
        style: {
          minWidth: "325px",
          maxWidth: "655px",
          order: -1,
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

const state = {
  widget: null,
  filters: {},
  tables: {},
  selectedCells: {},
};

window._fw_state = state;

export class FeaturesToWidget extends EventSimple {
  constructor() {
    super();
  }

  async init(options) {
    const fw = this;
    fw.attributes = options.layersAttributes;
    const hasPrevious = fw.hasWidget;
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
    fw.render();
    await fw.show();
  }

  setDashboardWidth() {
    const fw = this;
    fw.dashboard.elDashboard.style.minWidth = `${defaults.fw_dashboard.minWidth}px`;
  }

  get dashboard() {
    return this.widget.dashboard;
  }

  get widget() {
    return state.widget;
  }

  get hasWidget() {
    return this.widget instanceof Widget && !this.widget.destroyed;
  }

  /**
   * Update size after a change, e.g. feature_to_widget details open
   * - the widget size could change
   * - it must trigger grid lyout update later
   */
  async fit() {
    return new Promise((resolve, _) => {
      // animation frame cb is required as detail click event is returned
      // before the actual details is actually open.
      onNextFrame(() => {
        try {
          state.widget.updateSize();
          resolve(true);
        } catch (e) {
          console.error(e);
        }
      });
    });
  }

  updateLayout() {
    this.widget.dashboard.updatePanelLayout();
  }

  clear() {
    const fw = this;
    fw.resetFilter();

    // Destroy all Tabulator instances
    for (const id in state.tables) {
      if (state.tables[id]) {
        state.tables[id].destroy();
      }
    }
    state.tables = {};
    state.selectedCells = {};

    // Clear DOM
    while (fw.elContainer.firstElementChild) {
      fw.elContainer.removeChild(fw.elContainer.firstElementChild);
    }
  }

  destroy() {
    if (this._is_destroyed) {
      return;
    }
    this.clear();

    if (state.widget?.destroy) {
      state.widget.destroy();
    }

    state.widget = {};
    state.filters = {};
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
    d.setLayout(conf.layout); //overwrite current layout
    const [widget] = await d.addWidgets(conf);
    return widget;
  }

  render() {
    const fw = this;
    fw.clear();
    for (const idView in fw.attributes) {
      fw._render_item(idView, fw.attributes[idView]);
    }
  }

  async show() {
    const fw = this;
    return fw.dashboard.show();
  }

  async _render_item(idView, promAttributes) {
    const fw = this;
    const view = getView(idView);
    const isVector = isViewVt(view) || isViewGj(view);
    const title = getViewTitle(idView);

    const labels = {};
    const item = {};

    try {
      // Initialize the item with a title, spinner, and container
      fw._render_init_item(item, title);
      fw.elContainer.appendChild(item.elItem);

      // Wait for the attributes promise to resolve
      const promWait = waitTimeoutAsync(
        defaults.fw_timeout.attribute,
        null,
        "timeout",
      );
      const attributes = await Promise.race([promAttributes, promWait]);
      if (attributes === "timeout") {
        throw new Error("Attribute took too long to render");
      }
      item.elSpinner.remove();

      const attrNames = Object.keys(attributes);
      const attrOrder = getViewAttributes(view);

      if (attrNames.length === 0) {
        item.elAttributesContainer.appendChild(
          await fw.elIssueMessage("noValue"),
        );
        item.elItem.classList.add("disabled");
        return;
      }

      // Fetch attribute labels if the view is vector
      if (isViewVt(view)) {
        const idSource = getViewVtSourceId(view);
        Object.assign(labels, await getAttributesAlias(idSource, attrNames));
      }

      // Prepare attribute data for Tabulator
      const tableData = [];
      const tableColumns = [];

      for (const attribute of attrNames) {
        const label = getLabelFromObjectPath({
          obj: labels[attribute],
          defaultValue: attribute,
        });

        const position = attrOrder.indexOf(attribute);

        // Configure column for this attribute
        tableColumns.push({
          title: label,
          field: attribute,
          headerSortTristate:true,
          headerTooltip:true,
          vertAlign: "middle",
          tooltip: true,
          sorter: (a, b) => {
            if (isNumeric(a) && isNumeric(b)) {
              return Number(a) - Number(b);
            }
            return String(a).localeCompare(String(b));
          },
        });

        // Get values for this attribute
        const values = attributes[attribute];
        const valuesSorted = getArrayStat({ stat: "sortNatural", arr: values });

        // Create data rows for each value
        valuesSorted.forEach((value, index) => {
          if (!tableData[index]) {
            tableData[index] = {};
          }
          tableData[index][attribute] = value;
        });
      }

      // Create Tabulator table
      const elTable = el("div", {
        class: ["mx-feature-widget--table"],
      });
      item.elAttributesContainer.appendChild(elTable);

      console.log(console.table(tableColumns));

      const table = new Tabulator(elTable, {
        data: tableData,
        columns: tableColumns,
        layout: "fitDataTable", // Use fitDataTable instead of fitColumns
        maxHeight: "300px", // Set max height to ensure scrolling
        minHeight: "100px", // Set min height
        //responsiveLayout: "hide", // Hide columns that don't fit
        movableColumns: true, // Allow column reordering
        columnMinWidth: 100, // Set minimum column width
        resizableColumns: true, // Allow column resizing
        selectable: false,
        placeholder: "No Data Available",
      });

      // Add cell click event to handle selection and filtering
      if (isVector) {
        table.on("cellClick", (e, cell) => {
          const column = cell.getColumn();
          const attribute = column.getField();
          const value = cell.getValue();
          console.log('click', {columnm, attribute, value})

          fw._handleCellClick(idView, attribute, value, cell);
        });
      }

      state.tables[idView] = table;

      // Resize after table is fully rendered
      table.on("tableBuilt", () => {
        fw.fit();
        fw.updateLayout();
      });
    } catch (err) {
      this._render_on_error(item, err);
    }
  }

  _handleCellClick(idView, attribute, value, cell) {
    console.log("Cell clicked:", idView, attribute, value);

    // Initialize filter arrays if not exists
    if (!state.filters[idView]) {
      state.filters[idView] = ["any"];
    }

    // Get table instance
    const table = state.tables[idView];
    if (!table) return;

    // Toggle selection state
    const cellElement = cell.getElement();
    const isSelected = cellElement.classList.contains("selected-cell");

    // Find all cells with the same value in this column
    const rows = table.getRows();
    const cells = [];

    rows.forEach((row) => {
      const cell = row.getCell(attribute);
      if (cell && String(cell.getValue()) === String(value)) {
        cells.push(cell);
      }
    });

    console.log(
      `Found ${cells.length} matching cells for value "${value}" in column "${attribute}"`,
    );

    // Unselect if already selected
    if (isSelected) {
      cells.forEach((c) => {
        c.getElement().classList.remove("selected-cell");
      });

      // Remove from filters
      this._removeFromFilters(idView, attribute, value);
    } else {
      // Select this value
      cells.forEach((c) => {
        c.getElement().classList.add("selected-cell");
      });

      // Add to filters
      this._addToFilters(idView, attribute, value);
    }

    // Apply the filter to map
    this.applyFilters(idView);
  }

  _addToFilters(idView, attribute, value) {
    if (!state.filters[idView]) {
      state.filters[idView] = ["any"];
    }

    const isNum = isNumeric(value);
    let rule = [];

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

    state.filters[idView].push(rule);
  }

  _removeFromFilters(idView, attribute, value) {
    if (!state.filters[idView] || state.filters[idView].length <= 1) {
      state.filters[idView] = ["any"];
      return;
    }

    const isNum = isNumeric(value);

    // Find and remove matching rule
    for (let i = 1; i < state.filters[idView].length; i++) {
      const rule = state.filters[idView][i];

      if (
        value === settings.valuesMap.null &&
        rule[0] === "!" &&
        rule[1][0] === "has" &&
        rule[1][1] === attribute
      ) {
        state.filters[idView].splice(i, 1);
        break;
      } else if (
        isNum &&
        rule[0] === "any" &&
        rule[1][0] === "==" &&
        rule[1][1][0] === "get" &&
        rule[1][1][1] === attribute &&
        (rule[1][2] === value || rule[1][2] === value * 1)
      ) {
        state.filters[idView].splice(i, 1);
        break;
      } else if (
        !isNum &&
        rule[0] === "==" &&
        rule[1][0] === "get" &&
        rule[1][1] === attribute &&
        rule[2] === value
      ) {
        state.filters[idView].splice(i, 1);
        break;
      }
    }
  }

  _render_init_item(item, title) {
    item.elTitle = el("spane", { class: "mx-feature-widget--title" }, title);
    item.elSpinner = elWait("Fetch values...");
    item.elAttributesContainer = el("div", {
      class: "mx-feature-widget--attributes",
    });

    item.elItem = el(
      "div",
      {
        class: "mx-feature-widget--item",
      },
      [item.elTitle, item.elSpinner, item.elAttributesContainer],
    );
  }

  // Methods removed as they're replaced by Tabulator functionality

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
    for (const idV in state.filters) {
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

  // These methods are replaced by _handleCellClick, _addToFilters, and _removeFromFilters

  applyFilters(idV) {
    const filter = state.filters[idV];
    const view = getView(idV);
    if (!view._setFilter) {
      return;
    }
    view._setFilter({
      filter: filter,
      type: "popup_filter",
    });

    state.filters[idV] = filter;
  }
}
