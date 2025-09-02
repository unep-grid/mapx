/**
 * Color Swatches Custom Elements Module
 * Refactored to use a `colors` property (array).
 */

class ColorSwatch extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  static get observedAttributes() {
    return ["color", "target"];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  get color() {
    return this.getAttribute("color") || "#ccc";
  }

  set color(value) {
    this.setAttribute("color", value);
  }

  render() {
    const slant = this.parentElement?.getAttribute("slant") || "12px";

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          flex: 1 1 0;
          position: relative;
          cursor: pointer;
          transition: flex-grow 100ms ease;
          background: ${this.color};
          clip-path: polygon(
            ${slant} 0,
            100% 0,
            calc(100% - ${slant}) 100%,
            0 100%
          );
          margin-left: calc(${slant} * -1);
          height: 100%;
          display: block;
        }

        :host(:first-child) {
          clip-path: polygon(0 0, 100% 0, calc(100% - ${slant}) 100%, 0 100%);
          margin-left: 0;
        }

        :host(:last-child) {
          clip-path: polygon(
            ${slant} 0,
            100% 0,
            100% 100%,
            0 100%
          );
        }

        :host(:hover) {
          flex-grow: 2;
        }
      </style>
    `;
  }
}

class ColorSwatches extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._colors = [];
  }

  static get observedAttributes() {
    return ["slant", "colors"];
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
  }

  attributeChangedCallback(name, _old, newValue) {
    if (name === "colors" && newValue) {
      try {
        this.colors = Array.isArray(newValue) ? newValue : JSON.parse(newValue);
      } catch (err) {
        console.warn("Invalid JSON for <color-swatches colors>", err);
      }
    }
    if (name === "slant") {
      this.render();
      this.querySelectorAll("color-swatch").forEach((swatch) =>
        swatch.render(),
      );
    }
  }

  // property-based API
  get colors() {
    return this._colors;
  }

  set colors(value) {
    if (!Array.isArray(value)) {
      return;
    }
    this._colors = value;
    this.renderChildren();
  }

  get slant() {
    return this.getAttribute("slant") || "12px";
  }

  set slant(value) {
    this.setAttribute("slant", value);
  }

  disconnectedCallback() {
    if (this.clickHandler) {
      this.removeEventListener("click", this.clickHandler);
    }
  }

  setupEventListeners() {
    this.clickHandler = (event) => {
      const swatch = event.target.closest("color-swatch");
      if (swatch) {
        const swatchId = swatch.getAttribute("target") || "unknown";
        const swatchColor = swatch.color;

        this.dispatchEvent(
          new CustomEvent("swatch-click", {
            detail: { id: swatchId, color: swatchColor, element: swatch },
            bubbles: true,
          }),
        );
      }
    };
    this.addEventListener("click", this.clickHandler);
  }

  render() {
    const height = this.style.height || this.getAttribute("height") || "42px";
    const slant = this.slant;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          height: ${height};
          overflow: hidden;
          border-radius: 8px;
          background: #111;
          outline: 1px solid #3a2d22;
          width: 100%;
        }

        ::slotted(color-swatch) {
          flex: 1 1 0;
          position: relative;
          cursor: pointer;
          transition: flex-grow 50ms ease;
          clip-path: polygon(
            ${slant} 0,
            100% 0,
            calc(100% - ${slant}) 100%,
            0 100%
          );
          margin-left: calc(${slant} * -1);
        }

        ::slotted(color-swatch:first-child) {
          clip-path: polygon(0 0, 100% 0, calc(100% - ${slant}) 100%, 0 100%);
          margin-left: 0;
        }

        ::slotted(color-swatch:last-child) {
          clip-path: polygon(
            ${slant} 0,
            100% 0,
            100% 100%,
            0 100%
          );
        }

        ::slotted(color-swatch:hover) {
          flex-grow: 2;
        }
      </style>
      <slot></slot>
    `;

    // make sure children reflect the current ._colors
    this.renderChildren();
  }

  renderChildren() {
    // clear light DOM content and repopulate swatches
    this.innerHTML = "";
    this._colors.forEach(({ id, color }) => {
      const sw = document.createElement("color-swatch");
      sw.setAttribute("target", id);
      sw.setAttribute("color", color);
      this.appendChild(sw);
    });
  }
}

// Register
customElements.define("color-swatch", ColorSwatch);
customElements.define("color-swatches", ColorSwatches);

export { ColorSwatch, ColorSwatches };
