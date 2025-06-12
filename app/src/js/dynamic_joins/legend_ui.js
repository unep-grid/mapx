import { el } from "../el_mapx";

/**
 * Core Legend UI class for managing interactive color legends
 * Handles DOM creation, event delegation, and visibility state management
 */
export class LegendUI {
  constructor(container, options = {}) {
    this.container = container;
    this.colorScale = options.colorScale;
    this.data = options.data || [];
    this.colorNa = options.color_na || '#ccc';
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
    this.container.addEventListener('click', this.handleClick);
  }

  handleClick(event) {
    const legendItem = event.target.closest('.legend-item');
    if (legendItem) {
      const classIndex = legendItem.dataset.legendClassIndex;
      this.toggleClass(classIndex, legendItem);
    }
  }

  toggleClass(classIdentifier, element) {
    const wasVisible = this.visibleClasses.has(classIdentifier);

    if (wasVisible) {
      this.visibleClasses.delete(classIdentifier);
      element.classList.remove("legend-item-active");
      element.style.opacity = "0.7"; // Inactive style
    } else {
      this.visibleClasses.add(classIdentifier);
      element.classList.add("legend-item-active");
      element.style.opacity = "1"; // Active style
    }

    console.log(
      `Toggled selection for class ${classIdentifier}. Selected classes:`,
      this.visibleClasses,
    );

    // Notify parent of the change
    if (this.onToggle) {
      this.onToggle(classIdentifier, !wasVisible, new Set(this.visibleClasses));
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
      this.colorNa &&
      this.data.some((row) => !this.colorScale(row.value));

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
          class: `legend-item legend-class-${i}`, // No active class initially
          style: {
            cursor: "pointer",
            marginBottom: "5px",
            display: "flex",
            alignItems: "center",
            opacity: "0.7", // Start slightly dimmed / inactive style
          },
          "data-legend-class-index": i, // Store index for toggling
        },
        [
          el("span", {
            style: {
              display: "inline-block",
              width: "15px",
              height: "15px",
              backgroundColor: color,
              marginRight: "5px",
              border: "1px solid #555",
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
          class: `legend-item legend-na`, // No active class initially
          style: {
            cursor: "pointer", // Make NA clickable
            marginBottom: "5px",
            display: "flex",
            alignItems: "center",
            opacity: "0.7", // Start slightly dimmed / inactive style
          },
          "data-legend-class-index": naIdentifier, // Store 'na' identifier
        },
        [
          el("span", {
            style: {
              display: "inline-block",
              width: "15px",
              height: "15px",
              backgroundColor: this.colorNa,
              marginRight: "5px",
              border: "1px solid #555",
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
   * Set which classes should be visible
   */
  setVisibleClasses(classSet) {
    this.visibleClasses = new Set(classSet);

    // Update visual state of legend items
    const legendItems = this.container.querySelectorAll('.legend-item');
    legendItems.forEach(item => {
      const classIndex = item.dataset.legendClassIndex;
      const isVisible = this.visibleClasses.has(classIndex);

      if (isVisible) {
        item.classList.add("legend-item-active");
        item.style.opacity = "1";
      } else {
        item.classList.remove("legend-item-active");
        item.style.opacity = "0.7";
      }
    });
  }

  /**
   * Clean up event listeners and DOM
   */
  destroy() {
    this.container.removeEventListener('click', this.handleClick);
    this.container.innerHTML = '';
    this.visibleClasses.clear();
  }
}
