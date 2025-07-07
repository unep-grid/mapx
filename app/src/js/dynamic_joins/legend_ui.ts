import { el } from "../el_mapx";
import type { LegendUIOptions } from "./types";
import { getLegendClasses } from "./helpers.ts";
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
  private joinType: 'left' | 'inner';
  private visibleClasses: Set<number | string>;
  private onToggle?: (
    classIdentifier: number | string,
    isVisible: boolean,
    allVisibleClasses: Set<number | string>,
  ) => void;

  constructor(container: HTMLElement, options: LegendUIOptions = {}) {
    this.container = container;
    this.colorScale = options.colorScale;
    this.data = options.data || [];
    this.colorNa = options.colorNa || "#ccc";
    this.joinType = options.joinType || 'left';
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
        const classIdentifier = isNaN(Number(classIndex))
          ? classIndex
          : Number(classIndex);
        this.toggleClass(classIdentifier, legendItem);
      }
    }
  };

  private toggleClass(
    classIdentifier: number | string,
    element: HTMLElement,
  ): void {
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

    // Use the helper to get all legend class information
    const legendClasses = getLegendClasses(this.colorScale, this.colorNa);

    // Create legend items for each class
    for (const classInfo of legendClasses) {
      const elItem = el(
        "div",
        {
          class: ["dj-legend-item", `legend-class-${classInfo.index}`],
          dataset: {
            legend_class_index: classInfo.index.toString(),
          },
        },
        [
          el("span", {
            class: "dj-legend-color",
            style: {
              backgroundColor: classInfo.color,
            },
          }),
          el("span", {}, classInfo.label),
        ],
      );

      this.container.appendChild(elItem);
    }

    // Add NA item for left joins (features without matching data will show N/A color)
    if (this.joinType === 'left' && this.colorNa) {
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
    if (options.colorNa) {
      this.colorNa = options.colorNa;
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
