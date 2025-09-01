import { el } from "../el_mapx";
import type { LegendClasses, LegendUIOptions } from "./types";
import { getLegendClasses } from "./helpers.ts";
import "./legend_style.less";

/**
 * Core Legend UI class for managing interactive color legends
 * Handles DOM creation, event delegation, and visibility state management
 */
export class LegendUI {
  private container: HTMLElement;
  private colorScale?: chroma.Scale;
  private colorNa: string;
  private joinType: "left" | "inner";
  private showLegendNA: boolean;
  private visibleClasses: Set<number | string>;
  private onUpdate?: (
    visibleClasses: Set<number | string>,
    legendClasses: LegendClasses,
  ) => void;

  constructor(container: HTMLElement, options: LegendUIOptions = {}) {
    this.container = container;
    this.colorScale = options.colorScale;
    this.colorNa = options.colorNa || "#ccc";
    this.joinType = options.joinType || "left";
    this.showLegendNA = options.showLegendNA ?? true;
    this.visibleClasses = new Set();
    this.onUpdate = options.onUpdate;

    // Bind event handler
    this.handleClick = this.handleClick.bind(this);

    this.init();
  }

  private init(): void {
    this.setupEventDelegation();
    this.render();
    this.callback();
  }

  private setupEventDelegation(): void {
    this.container.addEventListener("click", this.handleClick);
  }

  private handleClick = (event: Event): void => {
    const target = event.target as HTMLElement;
    const legendItem = target.closest(".dj-legend-item") as HTMLElement;
    if (legendItem) {
      const index = legendItem.dataset.legend_class_index;
      this.toggleClass(index!, legendItem);
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

    this.callback();
  }

  get legendClasses(): LegendClasses {
    if (!this.colorScale) {
      return [];
    }
    return getLegendClasses(this.colorScale, this.colorNa);
  }

  private callback(): void {
    if (this.onUpdate) {
      this.onUpdate(this.visibleClasses, this.legendClasses);
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

    // Create legend items for each class
    for (const classInfo of this.legendClasses) {
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

    // Add NA item when showLegendNA is enabled (features without matching data will show N/A color)
    if (this.showLegendNA && this.colorNa) {
      const elNaItem = el(
        "div",
        {
          class: "dj-legend-item",
          dataset: {
            legend_class_index: "na",
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
    if (options.colorNa) {
      this.colorNa = options.colorNa;
    }

    this.render();
    this.callback();
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
