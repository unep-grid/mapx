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
  isEmpty,
} from "../is_test_mapx/index.js";
import { settings } from "../mx.js";
import { getAttributesAlias } from "../metadata/utils.js";
import { dashboard } from "../dashboards/index.js";
import { EventSimple } from "../event_simple/index.js";
import { Widget } from "../dashboards/widget.js";
import { elWait, el } from "../el_mapx/index.js";
import "./style.less";
import { onNextFrame, waitTimeoutAsync } from "../animation_frame/index.js";
import { TabulatorFull as Tabulator } from "tabulator-tables";
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

export class FeaturesToWidget extends EventSimple {
  constructor() {
    super();
    this._widget = {};
    this._tables = {};
    this._filters = {};
    this._attributes = {};
    this._el_container = null;
  }

  async set(data) {
    const fw = this;
    fw._attributes = data.attributes;
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
    this.clear();

    // destroy the widget
    if (this.widget?.destroy) {
      this.widget.destroy();
    }

    // new empty object
    this._widget = {};
    this._filters = {};
    this._tables = {};
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
    const isVector = isViewVt(view) || isViewGj(view);
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

      const attrNames = Object.keys(attributes);
      const attrOrder = getViewAttributes(view);

      if (isEmpty(attrNames)) {
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
      const tableColumns = [
        {
          formatter: "rowSelection",
          titleFormatter: "rowSelection",
          headerSort: false,
          width: 50,
          headerFilter: false,
          frozen: true,
          headerTooltip: false,
          tooltip: false,
          resizable: false,
        },
      ];

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
          tooltip: true,
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
        //responsiveLayout: "hide", // Hide columns that don't fit
        movableColumns: false, // Allow column reordering
        columnMinWidth: 100, // Set minimum column width
        resizableColumns: true, // Allow column resizing
        selectable: "multiple",
        selectableRows: true,
        placeholder: "[ No Value ]",
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
}
