import { isFunction, isJson } from "./../is_test_mapx";
import { el } from "../el/src/index.js";
import { modalDialog, modalSimple } from "../mx_helper_modal";
import { jsonDiff } from "../mx_helper_utils_json";
import { elSpanTranslate } from "../el_mapx";
import "./style.css";

/**
 * Class for handling data diff inspection with configurable context labels and callbacks
 */
export class DataDiffModal {
  /**
   * @param {Object} options Configuration options
   * @param {String} options.contextLabel Optional label for the context (e.g., "View", "Project")
   * @param {Object} options.dataSource Source data
   * @param {Object} options.dataTarget Target data
   * @param {Number} options.timestampSource Timestamp of source (optional)
   * @param {Number} options.timestampTarget Timestamp of target (optional)
   * @param {Function} options.onAccept Callback when accepting target data, receives target as parameter
   * @param {Object} options.langKeys Custom language keys (optional)
   */
  constructor(options = {}) {
    // Required data
    this.dataSource = this.processJsonStrings(options.dataSource);
    this.dataTarget = this.processJsonStrings(options.dataTarget);
    this.timestampSource = options.timestampSource;
    this.timestampTarget = options.timestampTarget;

    // Optional configuration
    this.contextLabel = options.contextLabel || "";
    this.onAccept = options.onAccept || null;

    // Modal reference
    this._modal = null;

    // Custom language keys
    this.langKeys = {
      modalTitle: "diff_modal_title",
      summaryTitle: "diff_modal_summary_title",
      dateSource: "diff_modal_source_date",
      dateTarget: "diff_modal_target_date",
      useTarget: "diff_modal_use_target",
      cancel: "diff_modal_cancel",
      diffs: "diff_modal_diffs",
      noDiffs: "diff_modal_no_diff",
      legend: "diff_modal_legend",
      legendSource: "diff_modal_legend_source",
      legendTarget: "diff_modal_legend_target",
      ...options.langKeys,
    };
  }

  /**
   * Translation helper method
   * @param {String} key Language key
   * @returns {HTMLElement} Translated span element
   */
  t(key) {
    return elSpanTranslate(key);
  }

  /**
   * Format datetime from posix timestamp
   * @param {Number} posix Posix timestamp
   * @returns {String} Formatted date and time
   */
  formatDateTime(posix) {
    const d = new Date(posix * 1000);
    const date = d.toLocaleDateString();
    const time = d.toLocaleTimeString();
    return date + " at " + time;
  }

  /**
   * Start the diff process
   * @returns {Promise<boolean>} True if diff was shown, false if no differences found
   */
  async start() {
    const diff = await this.getDiff();

    if (!diff || Object.keys(diff).length === 0) {
      await modalDialog({
        title: this.t(this.langKeys.modalTitle),
        content: this.t(this.langKeys.noDiffs),
      });
      return false;
    }

    await this.showDiffModal();
    return true;
  }

  /**
   * Build date information elements if timestamps are provided
   * @returns {HTMLElement|null} Date information element or null if no timestamps
   */
  buildDateInfo() {
    // Only create date elements if timestamps are provided
    if (!this.timestampSource && !this.timestampTarget) {
      return null;
    }

    const dateElements = [];

    if (this.timestampSource) {
      const dateTimeSource = this.formatDateTime(this.timestampSource);
      dateElements.push(
        el(
          "li",
          this.t(this.langKeys.dateSource),
          el("span", ": " + dateTimeSource),
        ),
      );
    }

    if (this.timestampTarget) {
      const dateTimeTarget = this.formatDateTime(this.timestampTarget);
      dateElements.push(
        el(
          "li",
          this.t(this.langKeys.dateTarget),
          el("span", ": " + dateTimeTarget),
        ),
      );
    }

    return dateElements.length > 0 ? el("ul", ...dateElements) : null;
  }

  /**
   * Build legend for diff colors
   * @returns {HTMLElement} Legend element
   */
  buildLegend() {
    return el(
      "div",
      { class: "mx-diff-legend" },
      el("h4", this.t(this.langKeys.legend)),
      el(
        "div",
        el("span", {
          style:
            "background-color: var(--mx_ui_message_danger); padding: 2px 5px; margin-right: 5px;",
        }),
        this.t(this.langKeys.legendSource),
      ),
      el(
        "div",
        el("span", {
          style:
            "background-color: var(--mx_ui_message_success); padding: 2px 5px; margin-right: 5px;",
        }),
        this.t(this.langKeys.legendTarget),
      ),
    );
  }

  /**
   * Show the diff modal
   * @returns {Promise<void>}
   */
  async showDiffModal() {
    const contextTitle = this.contextLabel ? ` ${this.contextLabel}` : "";

    // Create date info section if timestamps are available
    const dateInfo = this.buildDateInfo();

    // Create diff content
    const elDiffContainer = el("div", { class: ["mx-diff-items"] });

    // Create accept button
    const btnAccept = el(
      "button",
      {
        type: "button",
        class: ["btn", "btn-default"],
        on: ["click", () => this.accept()],
        dataset: {
          lang_key: this.langKeys.useTarget,
        },
      },
      [this.t(this.langKeys.useTarget)],
    );

    // Create modal content
    const content = el(
      "div",
      el("h3", this.t(this.langKeys.summaryTitle)),
      dateInfo,
      this.buildLegend(),
      el("h3", this.t(this.langKeys.diffs)),
      elDiffContainer,
    );

    // Create modal
    this._modal = modalSimple({
      addBackground: true,
      id: "modalDataDiff",
      title: el("span", [
        this.t(this.langKeys.modalTitle),
        document.createTextNode(contextTitle),
      ]),
      buttons: [btnAccept],
      textCloseButton: this.t(this.langKeys.cancel),
      content: content,
    });

    // Show diff immediately
    await this.previewDiff(elDiffContainer);
  }

  /**
   * Get diff between the two data objects
   * @returns {Promise<Object>} Diff result
   */
  async getDiff() {
    const config = {
      propertyFilter: this.filterProperties,
    };
    return await jsonDiff(this.dataSource, this.dataTarget, config);
  }

  /**
   * Filter function for properties to include in diff
   * @param {String} name Property name
   * @returns {Boolean} Whether to include the property
   */
  filterProperties(name) {
    const firstChar = name.slice(0, 1);
    /**
     * Set of known keys that should not be used in diff
     */
    return name !== "spriteEnable" && firstChar !== "_" && firstChar !== "$";
  }

  /**
   * Show the diff preview
   * @param {HTMLElement} elContainer Element to render the diff in
   * @returns {Promise<void>}
   */
  async previewDiff(elContainer) {
    const elItem = el("div", {
      class: ["mx-diff-item"],
    });
    elContainer.appendChild(elItem);
    const html = await jsonDiff(this.dataSource, this.dataTarget, {
      toHTML: true,
      propertyFilter: this.filterProperties,
    });
    elItem.innerHTML = html;
  }

  /**
   * Accept the target data
   */
  accept() {
    // Create a clean copy of the target data
    const cleanData = { ...this.dataTarget };
    delete cleanData._timestamp;

    // Call the onAccept callback if provided
    if (isFunction(this.onAccept)) {
      this.onAccept(cleanData);
    }

    // Close modal using the stored reference
    if (this._modal && this._modal.close) {
      this._modal.close();
    }
  }

  /**
   * Process data objects by recursively walking through them and parsing any JSON strings
   * @param {Object|Array} data The data object or array to process
   * @returns {Object|Array} Processed data with JSON strings parsed to objects
   */
  processJsonStrings(data) {
    // Handle null or undefined
    if (data === null || data === undefined) {
      return data;
    }

    // If it's a JSON string, parse it
    if (isJson(data)) {
      try {
        return JSON.parse(data);
      } catch (e) {
        // If parsing fails, return original
        return data;
      }
    }

    // If it's an array, process each item
    if (Array.isArray(data)) {
      return data.map((item) => this.processJsonStrings(item));
    }

    // If it's an object, process each property
    if (typeof data === "object") {
      const result = {};
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          result[key] = this.processJsonStrings(data[key]);
        }
      }
      return result;
    }

    // For other types, return as is
    return data;
  }
}
