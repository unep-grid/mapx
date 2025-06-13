import { el } from "../el_mapx";
import "./legend_style.less";

/**
 * Core Legend UI class for managing interactive color legends
 * Handles DOM creation, event delegation, and visibility state management
 */
export class LegendUI {
  constructor(container, options = {}) {
    this.container = container;
    this.colorScale = options.colorScale;
    this.data = options.data || [];
    this.colorNa = options.color_na || "#ccc";
    this.visibleClasses = new Set();
    this.onToggle = options.onToggle;

    // Bind event handler
    this.handleClick = this.handleClick.bind(this);

    this.init();
  }

  init() {
    this.setupEventDelegation();
    this.render();
  }

  setupEventDelegation() {
    this.container.addEventListener("click", this.handleClick);
  }

  handleClick(event) {
    const legendItem = event.target.closest(".dj-legend-item");
    if (legendItem) {
      const classIndex = legendItem.dataset.legend_class_index;
      this.toggleClass(classIndex * 1, legendItem);
    }
  }

  toggleClass(classIdentifier, element) {
    const wasVisible = this.visibleClasses.has(classIdentifier);

    if (wasVisible) {
      this.visibleClasses.delete(classIdentifier);
      element.classList.remove("active");
    } else {
      this.visibleClasses.add(classIdentifier);
      element.classList.add("active");
    }

    // Notify parent of the change
    if (this.onToggle) {
      const allVisibleClasses = this.getVisibleClasses();
      this.onToggle(classIdentifier, !wasVisible, allVisibleClasses);
    }
  }

  render() {
    // Clear previous content
    this.container.innerHTML = "";
    this.visibleClasses.clear();

    // Check prerequisites
    if (!this.colorScale) {
      console.warn("Cannot build legend: Missing color scale.");
      return;
    }

    const classes = this.colorScale.classes();
    const colors = this.colorScale.colors(classes.length);

    // Helper to format numbers nicely
    const formatNumber = (num) => {
      if (num === undefined || num === null) return "N/A";
      return num.toLocaleString(undefined, {
        maximumFractionDigits: 2,
        minimumFractionDigits: 0,
      });
    };

    // Check if we need an NA class
    const hasNaClass =
      this.colorNa && this.data.some((row) => !this.colorScale(row.value));

    // Add items for each class break
    classes.forEach((limit, i) => {
      // Determine bounds
      const lowerBound = i === 0 ? -Infinity : classes[i - 1];
      const upperBound = limit;
      const color = colors[i];

      const labelText = `${formatNumber(lowerBound)} - ${formatNumber(
        upperBound,
      )}`;

      const elItem = el(
        "div",
        {
          class: ["dj-legend-item", `legend-class-${i}`],
          dataset: {
            legend_class_index: i,
          },
        },
        [
          el("span", {
            class: "dj-legend-color",
            style: {
              backgroundColor: color,
            },
          }),
          el("span", {}, labelText),
        ],
      );

      this.container.appendChild(elItem);
    });

    // Add NA item if applicable
    if (hasNaClass) {
      const naIdentifier = "na";
      const elNaItem = el(
        "div",
        {
          class: "dj-legend-item",
          dataset: {
            legend_class_index: naIdentifier,
          },
        },
        [
          el("span", {
            class: "dj-legend-color",
            style: {
              backgroundColor: this.colorNa,
            },
          }),
          el("span", {}, "N/A"),
        ],
      );
      this.container.appendChild(elNaItem);
    }
  }

  /**
   * Update the legend with new data/color scale
   */
  update(options = {}) {
    if (options.colorScale) {
      this.colorScale = options.colorScale;
    }
    if (options.data) {
      this.data = options.data;
    }
    if (options.color_na) {
      this.colorNa = options.color_na;
    }

    this.render();
  }

  /**
   * Get the current set of visible classes
   */
  getVisibleClasses() {
    return new Set(this.visibleClasses);
  }

  /**
   * Clean up event listeners and DOM
   */
  destroy() {
    this.container.removeEventListener("click", this.handleClick);
    this.container.innerHTML = "";
    this.visibleClasses.clear();
  }
}
