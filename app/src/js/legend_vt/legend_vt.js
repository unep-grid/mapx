import chroma from "chroma-js";
import {
  isArray,
  isEmpty,
  isNotEmpty,
  isViewVt,
  isElement,
  isFunction,
} from "./../is_test/index.js";
import { checkLanguage, getLabelFromObjectPath } from "./../language/index.js";
import { updateIfEmpty, makeId, firstOf } from "./../mx_helper_misc.js";
import { getSpriteImage } from "./../map_helpers/index.js";
import { el } from "./../el/src/index.js";

const opDict = {
  ">": (a, b) => a > b,
  ">=": (a, b) => a >= b,
  "<": (a, b) => a < b,
  "<=": (a, b) => a <= b,
  "==": (a, b) => a === b,
};

export class LegendVt {
  /**
   * Creates an instance of the LegendVt class.
   *
   * @param {Object} view - The view object.
   * @param {HTMLElement} [container=null] - The HTML container for the legend.
   */
  constructor(view, container = null) {
    const lvt = this;
    if (!isViewVt(view) || !isElement(container)) {
      return;
    }

    lvt._view = view;
    lvt._el_container = container;
    lvt.init();
  }

  /**
   * Initializes instance properties based on the associated view.
   * Sets geometry and attribute type flags for the instance.
   *
   * @memberof LegendVt
   * @returns {void}
   */
  init() {
    const lvt = this;
    const view = lvt._view;
    lvt.updateRules();
    lvt._is_point = view?.data?.geometry?.type === "point";
    lvt._is_polygon = view?.data?.geometry?.type === "polygon";
    lvt._is_line = view?.data?.geometry?.type === "line";
    lvt._is_numeric = view?.data?.attribute?.type !== "string";
    lvt._el_legend = lvt.build();
  }

  /**
   * Remove the legend
   * @returns {void}
   */
  destroy() {
    const lvt = this;
    while (lvt._el_container.firstElementChild) {
      lvt._el_container.firstElementChild.remove();
    }
  }

  /**
   * Updates or fetches the styling rules associated with the view.
   *
   * @param {Array} [rules] - Optional array of new styling rules.
   * @returns {Array} The current set of styling rules for the view.
   */
  updateRules(rules) {
    const lvt = this;
    lvt._rules =
      rules || lvt._view?._style_rules || lvt._view?.data?.style?.rules || [];
    return lvt._rules;
  }

  /**
   * Apply legend rules filter to view
   * @returns {void}
   */
  updateFilter() {
    const lvt = this;
    const view = lvt._view;
    const rules = lvt._rules;

    if (!isFunction(view._setFilter)) {
      return;
    }

    const elsChecked = lvt._el_container.querySelectorAll(
      'input[type="checkbox"]:checked'
    );

    const filter = ["any"];

    for (const elLi of elsChecked) {
      const idRule = elLi.dataset.view_action_rule_id * 1;
      const rule = rules[idRule];
      if (rule && rule.filter) {
        filter.push(rule.filter);
      }
    }
    view._setFilter({
      type: "legend",
      filter: filter,
    });
  }

  /**
   * Sets the checked state of a specific rule's input by its ID.
   *
   * @param {number} ruleIndex - The index of the rule.
   * @param {boolean} [state=false] - The desired checked state.
   */
  setInputStateById(ruleIndex, state = false) {
    const lvt = this;
    const elInput = lvt.getInputById(ruleIndex);
    if (elInput) {
      elInput.checked = state;
    }
  }

  /**
   * Retrieves the legend container.
   *
   * @returns {HTMLElement} The container.
   */
  getContainer() {
    return this._el_container;
  }

  /**
   * Retrieves the input element associated with a specific rule ID.
   *
   * @param {number} ruleIndex - The index of the rule.
   * @returns {HTMLElement} The input element, or null if not found.
   */
  getInputById(ruleIndex) {
    const lvt = this;
    const elInput = lvt._el_container.querySelector(
      `input[data-view_action_rule_id="${ruleIndex}"]`
    );
    return elInput;
  }

  /**
   * Gets the checked state of a specific rule's input by its ID.
   *
   * @param {number} ruleIndex - The index of the rule.
   * @returns {boolean} Whether the input is checked.
   */
  getInputStateById(ruleIndex) {
    const lvt = this;
    const elInput = lvt.getInputById(ruleIndex);
    return elInput ? elInput.checked : null;
  }

  /**
   * Returns an array of values corresponding to checked rules.
   *
   * @returns {Array} An array of checked rule values.
   */
  getCheckedValues() {
    const lvt = this;
    const checkedValues = [];
    for (let i = 0; i < lvt._rules.length; i++) {
      const rule = lvt._rules[i];
      const checked = lvt.getInputStateById(i);
      if (checked) {
        if (lvt._is_numeric) {
          checkedValues.push([rule.value, rule.value_to]);
        } else {
          checkedValues.push(rule.value);
        }
      }
    }
    return checkedValues;
  }

  /**
   * Retrieves the values from the rules.
   *
   * For numeric rules, the method returns an array of range arrays ([from, to]),
   * otherwise, it just returns an array of values.
   *
   * @returns {Array} An array of checked values. For numeric rules, each entry is an array of format [from, to].
   *
   * @example
   * // Non-numeric rules
   * getValues(); // e.g. ["value1", "value2", ...]
   *
   * // Numeric rules
   * getValues(); // e.g. [[0, 10], [10, 20], ...]
   */
  getValues() {
    const lvt = this;
    const values = [];
    for (let i = 0; i < lvt._rules.length; i++) {
      const rule = lvt._rules[i];
      if (lvt._is_numeric) {
        values.push([rule.value, rule.value_to]);
      } else {
        values.push(rule.value);
      }
    }
    return values;
  }

  /**
   * Set the state of input elements in the legend by values.
   *
   * If the legend is numeric-based, the provided values are used to determine the
   * range within which an input element should be checked.
   *
   * If the legend is text-based, input elements whose filter value matches
   * any of the provided values will be checked.
   *
   * @param {Array} values - An array of values to determine the checked state of input elements.
   * For numeric legends, expect a 2-item array representing [from, to].
   * For text legends, an array of strings to match against.
   */
  setCheckedByValue(values) {
    const lvt = this;

    values = isArray(values) ? values : [values];

    for (let i = 0; i < lvt._rules.length; i++) {
      try {
        const rule = lvt._rules[i];
        const elInput = lvt.getInputById(i);
        const filter = rule.filter;

        if (!isElement(elInput)) {
          continue;
        }
        if (values.includes("all")) {
          elInput.checked = true;
          return;
        }
        if (isEmpty(filter)) {
          continue;
        }

        if (lvt._is_numeric) {
          /**
           * Sample
           * [
           * "all",
           * ["all",["has","<attr>" ]],
           * [ ">=",["get","<attr>"],"<value"],
           * [ "<", ["get","<attr>"],"<value"]
           * ]
           */
          const from = values[0];
          const to = values[1];
          const single = isEmpty(from) || isEmpty(to);
          const fromFilter = rule.filter[2][2];
          const fromOp = rule.filter[2][1];
          const toFilter = rule.filter[3][2];
          const toOp = rule.filter[3][1];
          const resFrom = opDict[fromOp](from, fromFilter);
          const resTo = opDict[toOp](single ? from : to, toFilter);
          elInput.checked = resFrom && resTo;
        } else {
          /**
           * Sample
           * [
           * "all",
           * ["all",["has","<attr>" ]],
           * [ "==",["get","<attr>"],"<value"]
           * ]
           * Missing value
           * [
           * "all",
           * ["!",["has","<attr>"]],
           * ]
           *
           */
          const naValue = filter[1][0] === "!";
          const res = values.some((v) => {
            return naValue ? isEmpty(v) : v === filter[2][2] || v === "all";
          });
          elInput.checked = res;
        }

        /**
         * Update filter
         */
        lvt.updateFilter();
      } catch (e) {
        console.warn("setCheckedByValue issue", e);
      }
    }
  }

  /**
   * Constructs and returns the visual representation of the legend.
   * This method will generate a structured `div` element containing
   * the legend representation based on the provided rules.
   *
   * @memberof LegendVt
   * @returns {HTMLElement} The constructed legend container element.
   */
  build() {
    const lvt = this;

    if (lvt._el_container) {
      lvt._el_container.innerHTML = "";
    }
    const view = lvt._view;
    const aElRules = [];
    const nRules = lvt._rules.length;

    const titleLegend = getLabelFromObjectPath({
      obj: view,
      path: "data.style.titleLegend",
    });

    for (let i = 0; i < nRules; i++) {
      const rule = lvt._rules[i];

      /**
       * Make sure at least opactiy and color are set
       */
      updateIfEmpty(rule, { opacity: 1, color: "#F0F" });

      /*
       * Configure legend item
       */
      const lang = checkLanguage({ obj: rule, path: "", prefix: "label_" });
      const label = firstOf([rule[`label_${lang}`], rule.value, "No data"]);
      const inputId = makeId();
      const colStyle = {};
      const hasSprite = isNotEmpty(rule.sprite) && rule.sprite !== "none";
      const hasBorder = rule.add_border && isNotEmpty(rule.color_border);
      const color = chroma(rule.color).alpha(rule.opacity).css();
      const spriteImage = hasSprite
        ? getSpriteImage(rule.sprite, { color: lvt._is_point ? color : null })
        : null;

      //colStyle.opacity = rule.opacity;

      if (lvt._is_line) {
        colStyle.backgroundColor = color;
        colStyle.height = `${rule.size}px`;
      }
      if (lvt._is_polygon) {
        colStyle.backgroundColor = color;
        if (hasBorder) {
          colStyle.border = `0.5px solid ${rule.color_border || "transparent"}`;
        }
      }
      if (lvt._is_point) {
        if (!hasSprite) {
          colStyle.borderRadius = `50%`;
          colStyle.height = `${rule.size}px`;
          colStyle.width = `${rule.size}px`;
          colStyle.backgroundColor = color;
        } else {
          colStyle.backgroundImage = `url(${spriteImage.url(color)})`;
          colStyle.backgroundSize = `${rule.size}px ${rule.size}px`;
          colStyle.backgroundRepeat = "no-repeat";
          colStyle.height = `${rule.size}px`;
          colStyle.width = `${rule.size}px`;
        }
      }

      const elRule = el(
        "tr",
        {
          class: [
            "mx-legend-vt-rule",
            lvt._is_numeric ? "mx-legend-vt-rule-numeric" : null,
          ],
          style: {
            zIndex: nRules - i,
          },
        },
        [
          el(
            "td",
            {
              class: "mx-legend-vt-td",
            },
            el(
              "div",
              {
                class: [
                  "mx-legend-vt-rule-color-wrapper",
                  hasBorder ? "mx-legend-vt-rule-color-border" : null,
                ],
              },
              [
                lvt._is_polygon && hasSprite
                  ? el("div", {
                      class: "mx-legend-vt-rule-background",
                      style: {
                        backgroundImage: `url(${spriteImage.url()})`,
                      },
                    })
                  : null,
                el("div", {
                  class: "mx-legend-vt-rule-color",
                  style: colStyle,
                }),
              ]
            )
          ),
          el(
            "td",
            el("input", {
              class: "mx-legend-vt-rule-input",
              type: "checkbox",
              name: inputId,
              id: inputId,
              dataset: {
                view_action_key: "btn_legend_filter",
                view_action_target: view.id,
                view_action_rule_id: i,
              },
            }),
            el(
              "label",
              {
                class: "mx-legend-vt-rule-label",
                for: inputId,
              },
              el(
                "span",
                {
                  title: `${label}`,
                  class: "mx-legend-vt-rule-label-text",
                },
                label
              )
            )
          ),
        ]
      );
      aElRules.push(elRule);
    }

    const elLegendBuilt = el(
      "div",
      {
        class: "mx-legend-container",
      },
      el(
        "div",
        el(
          "span",
          {
            class: ["mx-legend-vt-title"],
          },
          titleLegend
        )
      ),
      el(
        "div",
        {
          class: "mx-legend-box",
        },
        el(
          "table",
          {
            class: "mx-legend-vt-rules",
          },
          el("tbody", aElRules)
        )
      )
    );
    lvt._el_container.appendChild(elLegendBuilt);
    return elLegendBuilt;
  }

  /**
   * Updates the displayed language for the legend.
   * Adjusts both the legend title and the labels for each rule.
   */
  updateLanguage() {
    const lvt = this;
    const view = lvt._view;
    const rules = lvt.updateRules();

    if (isEmpty(rules)) {
      return;
    }

    /**
     * Title
     */
    const titleLegend = getLabelFromObjectPath({
      obj: view,
      path: "data.style.titleLegend",
    });
    const elLegendTitle = lvt._el_container.querySelector(
      ".mx-legend-vt-title"
    );
    if (isElement(elLegendTitle)) {
      elLegendTitle.innerText = titleLegend;
    }
    /**
     * Filter label
     */
    for (let i = 0; i < rules.length; i++) {
      const rule = lvt._rules[i];
      /*
       * Rules have {"label_en":"<label>","label_fr":"<label>",...} items
       * -> get available language code: current > default
       * -> if empty :  rule.value > "no data"
       */
      const lang = checkLanguage({
        obj: rule,
        path: "",
        prefix: "label_",
      });
      const label = firstOf([rule[`label_${lang}`], rule.value, "No data"]);
      const elLabel = lvt._el_container.querySelector(
        `input[data-view_action_rule_id="${i}"] + label > span`
      );
      if (isElement(elLabel)) {
        elLabel.innerText = label;
        elLabel.title = label;
      }
    }
  }
}
