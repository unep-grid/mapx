// @ts-check
import { ElementCreator } from "../../el/src/index.js";

/** @typedef {[number, number]} ColorDomain */

/**
 * Return whether zartigl can apply a runtime scalar color domain.
 *
 * @param {{kind?: string, backend?: string, dynamicStyle?: boolean}} options
 * @returns {boolean}
 */
export function isColorDomainEligible({ kind, backend, dynamicStyle }) {
  return kind === "scalar" && (dynamicStyle ?? backend === "zarr");
}

/**
 * Preserve an explicit automatic (`null`) override; otherwise use the catalog
 * domain when one exists.
 *
 * @param {Record<string, unknown>} settings
 * @param {Record<string, unknown>} rasterDefaults
 * @returns {unknown}
 */
export function resolveInitialColorDomain(settings, rasterDefaults) {
  return settings.colorDomain !== undefined
    ? settings.colorDomain
    : (rasterDefaults.colorDomain ?? null);
}

/**
 * Exact scalar color-domain editor for the compact ARCO settings panel.
 */
export class ArcoColorDomainControl {
  /**
   * @param {{
   *   document: Document,
   *   onChange: (domain: ColorDomain | null) => void
   * }} options
   */
  constructor({ document, onChange }) {
    this._onChange = onChange;
    this._colorDomain = null;
    this._frameDomain = null;
    this._hasInvalidDraft = false;
    this._handleInputChange = this._handleInputChange.bind(this);
    this._handleAutoClick = this._handleAutoClick.bind(this);

    const { el } = new ElementCreator({ document });
    this.elMin = el("input", {
      type: "number",
      step: "any",
      class: ["form-control", "arco--color_domain_input"],
      "aria-label": "Color range minimum",
      placeholder: "Min",
    });
    this.elMax = el("input", {
      type: "number",
      step: "any",
      class: ["form-control", "arco--color_domain_input"],
      "aria-label": "Color range maximum",
      placeholder: "Max",
    });
    this.elAuto = el(
      "button",
      {
        type: "button",
        class: ["btn", "btn-default", "btn-sm"],
        title: "Use the automatic range of each loaded frame",
      },
      "Auto",
    );
    this.elRoot = el(
      "div",
      {
        class: ["arco--settings_row", "arco--color_domain_row"],
      },
      [
        el("label", "Color range"),
        el("div", { class: "arco--color_domain_controls" }, [
          this.elMin,
          el("span", { class: "arco--color_domain_separator" }, "–"),
          this.elMax,
          this.elAuto,
        ]),
      ],
    );

    this.elMin.addEventListener("change", this._handleInputChange);
    this.elMax.addEventListener("change", this._handleInputChange);
    this.elAuto.addEventListener("click", this._handleAutoClick);
  }

  /**
   * Synchronize the editor with applied zartigl state.
   *
   * @param {{
   *   colorDomain: ColorDomain | null,
   *   frameDomain?: ColorDomain | null
   * }} state
   */
  sync({ colorDomain, frameDomain = this._frameDomain }) {
    const nextColorDomain = cloneCustomDomain(colorDomain);
    const colorDomainChanged = !domainsEqual(
      this._colorDomain,
      nextColorDomain,
    );
    this._colorDomain = nextColorDomain;
    this._frameDomain = cloneFrameDomain(frameDomain);
    this.elAuto.disabled = this._colorDomain === null;
    if (this._hasInvalidDraft && !colorDomainChanged) {
      return;
    }
    this._hasInvalidDraft = false;
    this._clearValidity();
    this._writeDomain(this._colorDomain || this._frameDomain);
  }

  _handleInputChange() {
    const min = this.elMin.valueAsNumber;
    const max = this.elMax.valueAsNumber;
    if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
      const message = "Color range requires two finite values with min < max";
      this.elMin.setCustomValidity(message);
      this.elMax.setCustomValidity(message);
      this.elMin.setAttribute("aria-invalid", "true");
      this.elMax.setAttribute("aria-invalid", "true");
      this._hasInvalidDraft = true;
      this.elMin.reportValidity();
      return;
    }

    this._hasInvalidDraft = false;
    this._clearValidity();
    this._colorDomain = [min, max];
    this.elAuto.disabled = false;
    this._onChange([min, max]);
  }

  _handleAutoClick() {
    this._colorDomain = null;
    this._hasInvalidDraft = false;
    this._clearValidity();
    this._writeDomain(this._frameDomain);
    this.elAuto.disabled = true;
    this._onChange(null);
  }

  /** @param {ColorDomain | null} domain */
  _writeDomain(domain) {
    this.elMin.value = domain ? String(domain[0]) : "";
    this.elMax.value = domain ? String(domain[1]) : "";
  }

  _clearValidity() {
    this.elMin.setCustomValidity("");
    this.elMax.setCustomValidity("");
    this.elMin.removeAttribute("aria-invalid");
    this.elMax.removeAttribute("aria-invalid");
  }

  destroy() {
    this.elMin.removeEventListener("change", this._handleInputChange);
    this.elMax.removeEventListener("change", this._handleInputChange);
    this.elAuto.removeEventListener("click", this._handleAutoClick);
    this.elRoot.remove();
  }
}

/**
 * @param {unknown} value
 * @returns {ColorDomain | null}
 */
function cloneCustomDomain(value) {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    !Number.isFinite(value[0]) ||
    !Number.isFinite(value[1]) ||
    value[0] >= value[1]
  ) {
    return null;
  }
  return [value[0], value[1]];
}

/**
 * Automatic frame extrema may be equal for a valid constant frame.
 *
 * @param {unknown} value
 * @returns {ColorDomain | null}
 */
function cloneFrameDomain(value) {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    !Number.isFinite(value[0]) ||
    !Number.isFinite(value[1]) ||
    value[0] > value[1]
  ) {
    return null;
  }
  return [value[0], value[1]];
}

/**
 * @param {ColorDomain | null} left
 * @param {ColorDomain | null} right
 * @returns {boolean}
 */
function domainsEqual(left, right) {
  return (
    left === right ||
    (left !== null &&
      right !== null &&
      left[0] === right[0] &&
      left[1] === right[1])
  );
}
