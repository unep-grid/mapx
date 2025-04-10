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
  isEmpty,
  isString,
} from "../is_test_mapx/index.js";
import { getAttributesAlias } from "../metadata/utils.js";
import { dashboard } from "../dashboards/index.js";
import { EventSimple } from "../event_simple/index.js";
import { Widget } from "../dashboards/widget.js";
import { elWait, el } from "../el_mapx/index.js";
import "./style.less";
import { onNextFrame, waitTimeoutAsync } from "../animation_frame/index.js";
import { TabulatorFull as Tabulator } from "tabulator-tables";
import "tabulator-tables/dist/css/tabulator.min.css";
import "./tabulator.less";

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

export class FeaturesToWidget extends EventSimple {
  constructor(opt = {}) {
    super();
    this._widget = {};
    this._tables = {};
    this._filters = {};
    this._attributes = {};
    this._el_container = null;
    this._activeFilters = {}; // Store active column value filters
    this._highlighter_config_init = null;

    // Create a custom highlighter with specific options
    this._highlighter = opt?.highlighter;
    window._fw = this;
  }

  async set(data) {
    const fw = this;
    fw._attributes = data.attributes;
    fw._highlighter_config_init = this._highlighter.get();

    if (fw.hasWidget) {
      fw._el_container = this.widget.elContent.firstElementChild;
    } else {
      fw._el_container = el("div", {
        class: ["mx-feature-widget--container"],
      });
      fw._widget = await fw.createWidget();
      fw._widget.elContent.appendChild(fw._el_container);
      fw._widget.on("destroyed", () => {
        fw.destroy();
      });
    }

    fw.render();

    await fw.show();
  }
  get attributes() {
    return this._attributes;
  }
  get widget() {
    return this._widget;
  }
  get tables() {
    return this._tables;
  }
  get filters() {
    return this._filters;
  }
  get container() {
    return this._el_container;
  }

  setDashboardWidth() {
    const fw = this;
    fw.dashboard.elDashboard.style.minWidth = `${defaults.fw_dashboard.minWidth}px`;
  }

  get dashboard() {
    return this.widget.dashboard;
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
          this.widget.updateSize();
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

    // reset views filter
    fw.resetFilter();

    // Reset active column filters
    fw._activeFilters = {};

    // Reset highlighter to clear any highlights
    fw._resetHighlights();

    // Destroy all Tabulator instances
    for (const id in this.tables) {
      if (this.tables[id]) {
        this.tables[id].destroy();
        delete this.tables[id];
      }
    }

    // Clear DOM
    while (fw.container.firstElementChild) {
      fw.container.removeChild(fw.container.firstElementChild);
    }
  }

  destroy() {
    if (this._is_destroyed) {
      return;
    }
    this._is_destroyed = true;
    this.clear();

    // destroy the widget
    if (this.widget?.destroy) {
      this.widget.destroy();
    }

    // new empty object
    this._widget = {};
    this._filters = {};
    this._tables = {};
    this._highlighter = null;
    this._highlighter_config_init = null;

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

  async createWidget() {
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
    const isVt = isViewVt(view);
    const isVector = isVt || isViewGj(view);
    const title = getViewTitle(idView);
    const labels = {};
    let item;
    try {
      // Initialize the item with a title, spinner, and container
      item = fw._create_item(title);
      fw.container.appendChild(item.elItem);

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

      const attrOrder = getViewAttributes(view);
      const attrNames = Object.keys(attributes[0] || {});

      if (isEmpty(attrOrder)) {
        attrOrder.push(...attrNames);
      }

      if (isEmpty(attrNames)) {
        item.elAttributesContainer.appendChild(
          await fw.elIssueMessage("noValue"),
        );
        item.elItem.classList.add("disabled");
        return;
      }

      // Fetch attribute labels if the view is vector
      if (isVt) {
        const idSource = getViewVtSourceId(view);
        Object.assign(labels, await getAttributesAlias(idSource, attrNames));
      }

      // Prepare attribute data for Tabulator
      /*  const tableColumns = isVector*/
      /*? [*/
      /*{*/
      /*formatter: "rowSelection",*/
      /*titleFormatter: "rowSelection",*/
      /*headerSort: false,*/
      /*width: 25,*/
      /*headerFilter: false,*/
      /*frozen: true,*/
      /*headerTooltip: false,*/
      /*tooltip: false,*/
      /*resizable: false,*/
      /*},*/
      /*]*/
      /*: [];*/
      const tableColumns = [];

      let isFirst = true;

      for (const attribute of attrOrder) {
        /**
         * Get value from language object
         * {en:<value>, fr:<label>,...}
         *
         */
        const label = getLabelFromObjectPath({
          obj: labels[attribute],
          defaultValue: attribute,
        });

        // Configure column for this attribute
        tableColumns.push({
          frozen: isFirst,
          title: label,
          field: attribute,
          headerSortTristate: true,
          headerTooltip: true,
          vertAlign: "middle",
          tooltip: false,
          cellClick: (_, cell) => {
            if (isVector) {
              fw._handleCellClick(idView, cell);
            }
          },
          sorter: (a, b) => {
            if (isNumeric(a) && isNumeric(b)) {
              return Number(a) - Number(b);
            }
            return String(a).localeCompare(String(b));
          },
        });
        isFirst = false;
      }

      // Create Tabulator table
      const elTable = el("div", {
        class: ["mx-feature-widget--table"],
      });
      item.elAttributesContainer.appendChild(elTable);
      const table = new Tabulator(elTable, {
        data: attributes,
        columns: tableColumns,
        layout: "fitDataTable", // Use fitDataTable instead of fitColumns
        maxHeight: "300px", // Set max height to ensure scrolling
        minHeight: "100px", // Set min height
        columnMinWidth: 100, // Set minimum column width
        placeholder: "[ No Value ]",
        rowHeader: {
          headerSort: false,
          resizable: false,
          frozen: true,
          headerHozAlign: "center",
          hozAlign: "center",
          formatter: "rowSelection",
          titleFormatter: "rowSelection",
        },
      });

      // Add cell click event to handle selection and filtering
      if (isVector) {
        table.on("rowSelectionChanged", (data) => {
          fw._handleSelectChange(idView, data);
        });
      }

      this.tables[idView] = table;

      // Resize after table is fully rendered
      table.on("tableBuilt", () => {
        fw.fit();
        fw.updateLayout();
      });
    } catch (err) {
      this._render_on_error(item, err);
    }
  }

  _handleSelectChange(idView, data) {
    const fw = this;

    // Initialize filter arrays if not exists
    const view = getView(idView);
    //const gids = data.map((d) => `${d.gid}`);
    const gids = data.map((d) => d.gid);
    const filter =
      gids.length > 0 ? ["in", ["get", "gid"], ["literal", gids]] : ["all"];

    view._setFilter({
      filter: filter,
      type: "popup_filter",
    });
    fw.filters[idView] = filter;
  }

  _create_item(title) {
    const item = {};
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
    return item;
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

  /**
   * Handle cell click to filter by cell value within a column
   * @param {String} idView View id
   * @param {Object} cell Tabulator cell object
   */
  _handleCellClick(idView, cell) {
    const fw = this;
    const value = cell.getValue();
    const field = cell.getColumn().getField();
    const table = fw.tables[idView];

    // Value can be null or undefined for empty fields, which we should still handle
    if (!field || !table) {
      return;
    }

    // Check if this specific cell value is already active
    const isCellActive = this._isCellActive(idView, field, value);

    // Always reset ALL cell highlighting (across all columns) and map highlights
    this._clearAllActiveCells(idView);

    // Toggle behavior: If this exact cell was active, just clear everything and return

    if (isCellActive) {
      this._resetHighlights(idView);
      return;
    }

    // Activate this cell value and highlight features
    this._setCellActive(idView, field, value);
    this._highlightMatchingCells(idView, field, value);
    this._highlightMatchingFeatures(idView, field, value);
  }

  /**
   * Check if a specific cell value is active
   * @param {String} idView View id
   * @param {String} field Field name
   * @param {*} value Cell value
   * @returns {Boolean} True if the cell is active
   */
  _isCellActive(idView, field, value) {
    const fw = this;
    const filterKey = `${field}:${value}`;
    return !!fw._activeFilters[idView]?.[filterKey];
  }

  /**
   * Mark a cell value as active in the state
   * @param {String} idView View id
   * @param {String} field Field name
   * @param {*} value Cell value
   */
  _setCellActive(idView, field, value) {
    const fw = this;
    const filterKey = `${field}:${value}`;

    if (!fw._activeFilters[idView]) {
      fw._activeFilters[idView] = {};
    }

    fw._activeFilters[idView][filterKey] = true;
  }

  /**
   * Clear all active cells in a view
   * @param {String} idView View id
   */
  _clearAllActiveCells(idView) {
    const fw = this;
    const table = fw.tables[idView];

    if (!fw._activeFilters[idView] || !table) {
      return;
    }

    // Clear all active filters in the state
    fw._activeFilters[idView] = {};

    // Remove visual highlighting from all cells in the table
    table.getRows().forEach((row) => {
      for (const cellObj of row.getCells()) {
        const cellElement = cellObj.getElement();
        if (cellElement) {
          cellElement.classList.remove("selected-cell");
        }
      }
    });
  }

  /**
   * Reset the highlighter to clear visual highlights on the map
   */
  _resetHighlights(id) {
    const fw = this;

    if (fw._highlighter_config_init) {
      const init = this._highlighter_config_init;

      if (id) {
        for (const i_f of init.filters) {
          if (i_f.id === id) {
            fw._highlighter.set({ filters: [i_f] });
            return;
          }
        }
      }

      fw._highlighter.set(init);
    }
  }

  /**
   * Highlight all cells in the table that match a specific value
   * @param {String} idView View id
   * @param {String} field Field name
   * @param {*} value Cell value to match
   */
  _highlightMatchingCells(idView, field, value) {
    const fw = this;
    const table = fw.tables[idView];

    if (!table) {
      return;
    }

    table.getRows().forEach((row) => {
      const cellToCheck = row.getCell(field);
      if (cellToCheck) {
        const cellValue = cellToCheck.getValue();

        // Check if both are empty or have the same value
        const bothEmpty = isEmpty(value) && isEmpty(cellValue);
        const sameValue =
          isNumeric(value) && isNumeric(cellValue)
            ? Number(value) === Number(cellValue)
            : value === cellValue;

        if (bothEmpty || sameValue) {
          const cellElement = cellToCheck.getElement();
          if (cellElement) {
            cellElement.classList.add("selected-cell");
          }
        }
      }
    });
  }

  /**
   * Highlight features on the map that match a specific attribute value
   * @param {String} idView View id
   * @param {String} field Field name
   * @param {*} value Attribute value to match
   */
  _highlightMatchingFeatures(idView, field, value) {
    const fw = this;
    let filter;

    // Create appropriate filter based on value type
    if (isEmpty(value)) {
      filter = ["!has", field];
    } else if (isString(value)) {
      filter = ["==", ["get", field], value];
    } else if (isNumeric(value)) {
      filter = ["==", ["to-number", ["get", field]], value];
    } else {
      console.warn("Unexpected for", value);
      filter = ["all"];
    }

    // Set highlighter with the filter
    fw._highlighter.set({
      filters: [{ id: idView, filter: filter }],
    });
  }
}
