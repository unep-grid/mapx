import { el } from "../el_mapx";
import type { LegendUIOptions } from "./types";
import "./legend_style.less";

/**
 * Core Legend UI class for managing interactive color legends
 * Handles DOM creation, event delegation, and visibility state management
 */
export class LegendUI {
  private container: HTMLElement;
  private colorScale?: chroma.Scale;
  private data: Array<{ key: string; value: any }>;
  private colorNa: string;
  private visibleClasses: Set<number | string>;
  private onToggle?: (classIdentifier: number | string, isVisible: boolean, allVisibleClasses: Set<number | string>) => void;

  constructor(container: HTMLElement, options: LegendUIOptions = {}) {
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

  private init(): void {
    this.setupEventDelegation();
    this.render();
  }

  private setupEventDelegation(): void {
    this.container.addEventListener("click", this.handleClick);
  }

  private handleClick = (event: Event): void => {
    const target = event.target as HTMLElement;
    const legendItem = target.closest(".dj-legend-item") as HTMLElement;
    if (legendItem) {
      const classIndex = legendItem.dataset.legend_class_index;
      if (classIndex !== undefined) {
        const classIdentifier = isNaN(Number(classIndex)) ? classIndex : Number(classIndex);
        this.toggleClass(classIdentifier, legendItem);
      }
    }
  };

  private toggleClass(classIdentifier: number | string, element: HTMLElement): void {
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

  private render(): void {
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
    const formatNumber = (num: number): string => {
      if (num === undefined || num === null) return "N/A";
      return num.toLocaleString(undefined, {
        maximumFractionDigits: 2,
        minimumFractionDigits: 0,
      });
    };

    // Check if we need an NA class
    const hasNaClass =
      this.colorNa && this.data.some((row) => !this.colorScale!(row.value));

    // Add items for each class break
    classes.forEach((limit: number, i: number) => {
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
            legend_class_index: i.toString(),
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
  update(options: LegendUIOptions = {}): void {
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
  getVisibleClasses(): Set<number | string> {
    return new Set(this.visibleClasses);
  }

  /**
   * Clean up event listeners and DOM
   */
  destroy(): void {
    this.container.removeEventListener("click", this.handleClick);
    this.container.innerHTML = "";
    this.visibleClasses.clear();
  }
}
