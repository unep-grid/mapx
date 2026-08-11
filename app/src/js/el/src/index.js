import {
  isString,
  isArray,
  isObject,
  isEmpty,
  isNotEmpty,
  isFunction,
  isNumeric,
  isHTML,
  isElement,
  isPromise,
} from "../../is_test";
import DOMPurify from "dompurify";

/**
 * Class representing an element creator which facilitates the creation
 * and management of DOM elements, including SVG elements.
 */
export class ElementCreator {
  /**
   * Creates an instance of ElementCreator.
   * @param {{document?: Document}} [options]
   */
  constructor({ document: documentRef = globalThis.document } = {}) {
    if (
      !documentRef ||
      typeof documentRef.createElement !== "function" ||
      typeof documentRef.createElementNS !== "function"
    ) {
      throw new TypeError("ElementCreator requires a DOM document");
    }
    this.document = documentRef;
    this.purifier = documentRef.defaultView
      ? DOMPurify(documentRef.defaultView)
      : DOMPurify;
    this.NSSvg = "http://www.w3.org/2000/svg";
    this.el = this.el.bind(this);
    this.svg = this.svg.bind(this);
    this.el.parent = this;
    this.svg.parent = this;
  }

  /**
   * Creates an SVG element with given tag name and options.
   * @param {string} tagName - The name of the SVG element to create.
   * @param {...any} opt - Options for creating the SVG element.
   * @returns {SVGElement} The created SVG element.
   */
  svg(tagName, ...opt) {
    return this.el(tagName, true, ...opt);
  }

  /**
   * Creates a DOM element with given tag name and options.
   * @param {string} tagName - The name of the element to create.
   * @param {...any} opt - Options for creating the element.
   * @returns {HTMLElement} The created HTML element.
   */
  el(tagName, ...opt) {
    let elOut;
    let svgMode = opt[0] === true;

    if (svgMode) {
      elOut = this.document.createElementNS(this.NSSvg, tagName);
    } else {
      elOut = this.document.createElement(tagName);
    }

    this.processOptions(tagName, elOut, svgMode, opt);

    return elOut;
  }

  /**
   * Processes the options for element creation.
   * @param {string} tagName - The tag name of the element.
   * @param {HTMLElement|SVGElement} elOut - The element being created.
   * @param {boolean} svgMode - Whether the element is an SVG.
   * @param {...any} opt - Options for creating the element.
   */
  processOptions(tagName, elOut, svgMode, opt) {
    for (const o of opt) {
      if (isArray(o)) {
        this.processOptions(tagName, elOut, svgMode, o);
      } else if (isPromise(o)) {
        this.processAsync(tagName, elOut, svgMode, o);
      } else if (isObject(o)) {
        this.processObjectOptions(tagName, elOut, svgMode, o);
      } else if (isElement(o)) {
        elOut.appendChild(o);
      } else {
        this.setContent(o, elOut, svgMode, tagName);
      }
    }
  }

  /**
   * Asynchronously process option.
   * @param {string} tagName - The tag name of the element.
   * @param {HTMLElement|SVGElement} elOut - The element to set content on.
   * @param {boolean} svgMode - Whether the element is an SVG.
   * @param {Promise} promise - The promise resolving to the content.
   * @returns {Promise<HTMLElement|SVGElement>} The element with content set.
   */
  async processAsync(tagName, elOut, svgMode, promise) {
    const typeValue = tagName === "input" || tagName === "textarea";
    const placeholder = typeValue
      ? null
      : this.document.createComment("async-content");

    if (placeholder) {
      elOut.appendChild(placeholder);
    }

    try {
      const value = await promise;
      if (typeValue) {
        this.processOptions(tagName, elOut, svgMode, [value]);
        return elOut;
      }

      if (isObject(value)) {
        this.processObjectOptions(tagName, elOut, svgMode, value);
        placeholder.remove();
        return elOut;
      }

      const nodes = await this.createAsyncContentNodes(value, svgMode);
      placeholder.replaceWith(...nodes);
      return elOut;
    } catch (e) {
      placeholder?.remove();
      console.warn("ElementCreator", e);
      return elOut;
    }
  }

  /**
   * Convert asynchronously resolved content to nodes without replacing sibling
   * content already owned by the target element.
   * @param {any} value Resolved child content
   * @param {boolean} svgMode Whether the target is an SVG element
   * @returns {Promise<Node[]>} Ordered nodes for the resolved content
   */
  async createAsyncContentNodes(value, svgMode) {
    if (isPromise(value)) {
      return this.createAsyncContentNodes(await value, svgMode);
    }

    if (isArray(value)) {
      const groups = await Promise.all(
        value.map((item) => this.createAsyncContentNodes(item, svgMode)),
      );
      return groups.flat();
    }

    if (value && typeof value === "object" && value.nodeType) {
      return [value];
    }

    if (isObject(value)) {
      return [];
    }

    if (isHTML(value) && !svgMode) {
      const template = this.document.createElement("template");
      template.innerHTML = this.sanitize(value);
      return Array.from(template.content.childNodes);
    }

    if (isString(value) || isNumeric(value)) {
      return [this.document.createTextNode(value.toString())];
    }

    return [];
  }

  /**
   * Processes object options for element creation.
   * @param {string} tagName - The tag name of the element.
   * @param {HTMLElement|SVGElement} elOut - The element being created.
   * @param {boolean} svgMode - Whether the element is an SVG.
   * @param {Object} options - The options object for the element.
   */
  processObjectOptions(tagName, elOut, svgMode, options) {
    for (const [key, value] of Object.entries(options)) {
      this.handleOption(elOut, key, value, svgMode, tagName);
    }
  }

  /**
   * Handles individual options for element creation.
   * @param {HTMLElement|SVGElement} elOut - The element being created.
   * @param {string} key - The option key.
   * @param {any} value - The option value.
   * @param {boolean} svgMode - Whether the element is an SVG.
   * @param {string} tagName - The tag name of the element.
   */
  handleOption(elOut, key, value, svgMode, tagName) {
    if (key === "value" && value === "") {
      if (svgMode) {
        elOut.setAttributeNS(null, key, value);
      } else {
        elOut.setAttribute(key, value);
      }
      return;
    }
    if (isEmpty(value)) {
      return;
    }
    switch (key) {
      case "on":
        this.handleEventListeners(elOut, value);
        break;

      case "innerText":
        if (isString(value)) {
          elOut.innerText = value;
        }
        break;

      case "dataset":
      case "style":
        if (isObject(value)) {
          Object.assign(elOut[key], value);
        } else {
          elOut[key] = value;
        }
        break;

      case "class":
        if (isArray(value)) {
          for (const className of value) {
            if (isNotEmpty(className)) {
              elOut.classList.add(className);
            }
          }
        } else {
          elOut.className = value;
        }
        break;
      case "disabled":
        //Use == to support truthy values
        if (value === true || value === "true") {
          elOut.disabled = true;
        }
        break;
      case "checked":
        // Set checked property directly to avoid HTML attribute issues
        elOut.checked = !!value;
        break;
      default:
        if (svgMode) {
          elOut.setAttributeNS(null, key, value);
        } else {
          elOut.setAttribute(key, value);
        }
        break;
    }
  }

  /**
   * Handles the attachment of event listeners to the created element.
   * Supports array, object, array of arrays, and array of objects formats.
   * @param {HTMLElement|SVGElement} elOut - The element to attach listeners to.
   * @param {Array|Object} listeners - Event listeners specifications.
   */
  handleEventListeners(elOut, listeners) {
    if (Array.isArray(listeners)) {
      // Check if it's an array of arrays or array of objects
      if (listeners.every((item) => Array.isArray(item) || isObject(item))) {
        for (const item of listeners) {
          this.handleEventListeners(elOut, item); // Recursive call
        }
      } else {
        // Single array format: ['eventName', eventHandler, options]
        const [eventName, eventHandler, options] = listeners;
        this.trackListener(elOut, eventName, eventHandler, options);
      }
    } else if (isObject(listeners)) {
      // Object format: { eventName: eventHandler, ... }
      for (const [eventName, eventHandler] of Object.entries(listeners)) {
        this.trackListener(elOut, eventName, eventHandler);
      }
    } else {
      console.warn("ElementCreator : unsupported event listener", listeners);
    }
  }

  /**
   * Sets the content of an element.
   * @param {any} content - The content to set on the element.
   * @param {HTMLElement|SVGElement} elOut - The element to set content on.
   * @param {boolean} svgMode - Whether the element is an SVG.
   * @param {string} tagName - The tag name of the element.
   * @returns {HTMLElement|SVGElement} The element with content set.
   */
  setContent(content, elOut, svgMode, tagName) {
    const typeValue = tagName === "input" || tagName === "textarea";
    const typeHTML = isHTML(content);
    const typeString = (!typeHTML && isString(content)) || isNumeric(content);

    if (typeValue) {
      /**
       * Sets the value for input or textarea elements.
       */
      elOut.value = content.toString();
    } else if (typeHTML) {
      /**
       * HTML - Sanitized with DOMPurify
       */
      const template = this.document.createElement("template");
      template.innerHTML = this.sanitize(content);
      elOut.appendChild(template.content);
    } else if (typeString) {
      /**
       * String
       */
      const str = content.toString();
      elOut.appendChild(this.document.createTextNode(str));
      const ElementConstructor = this.document.defaultView?.HTMLElement;
      const supportsInnerText =
        ElementConstructor && "innerText" in ElementConstructor.prototype;
      if (!svgMode && !supportsInnerText) {
        elOut.innerText = elOut.textContent;
      }
    }
    return elOut;
  }

  /**
   * Sanitize for innerHTML
   * - keep target, e.g target=_blank
   */
  sanitize(string) {
    return this.purifier.sanitize(string, {
      ADD_TAGS: ["iframe"],
      ADD_ATTR: [
        "target",
        "src",
        "width",
        "height",
        "frameborder",
        "allowfullscreen",
      ],
    });
  }

  /**
   * Attaches a validated event listener.
   * @param {HTMLElement|SVGElement} elOut - The element with the listener.
   * @param {string} eventName - The name of the event.
   * @param {Function} eventHandler - The event handler function.
   * @param {Object} [options={}] - Options for the event listener.
   */
  trackListener(elOut, eventName, eventHandler, options = {}) {
    const valid = isString(eventName) && isFunction(eventHandler);

    if (!valid) {
      console.warn(
        "ElementCreator : unsupported event",
        eventName,
        eventHandler,
      );
      return;
    }
    elOut.addEventListener(eventName, eventHandler, options);
  }
}

export const { el, svg, sanitize } = new ElementCreator();
