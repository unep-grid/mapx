import { uiReadMore } from "./../readmore/index.js";
import { getArrayStat } from "./../array_stat/index.js";
import {
  getDictItem,
  getLabelFromObjectPath,
  getLanguageCurrent,
} from "./../language";
import { getView, getViewTitle, getViewVtSourceId } from "./index.js";
import {  uiToggleBtn, parentFinder } from "./../mx_helper_misc.js";
import { el } from "./../el/src/index.js";
import {
  isEmpty,
  isElement,
  isNumeric,
  isArray,
  isViewVt,
  isViewGj,
} from "./../is_test/index.js";
import { settings } from "./../mx.js";
import { fetchAttributesAlias } from "../metadata/utils.js";

/*
 * Convert result from getFeaturesValuesByLayers to HTML
 * @param {Object} o Options
 * @param {Object} o.popup Mapbox-gl popup object
 * @param {Object} o.layersAttributes Attributes by layer {<abc>:{<attr>:[<values>,...]}}
 */
export function featuresToPopup(o) {
  const popup = o.popup;
  const attributes = o.layersAttributes;
  const elContainer = el("div", {
    class: ["mx-popup-container", "mx-scroll-styled"],
  });
  const filters = {};

  /**
   * Reset filters
   */
  popup.on("close", resetFilter);

  /**
   * Update popup with yet empty content
   */
  popup.setDOMContent(elContainer);

  /*
   * render raster properties
   */
  render();

  /**
   * Helpers
   */
  async function elIssueMessage(idMsg) {
    const elIssue = el("div", "no values");
    idMsg = idMsg || "noValue";
    /**
     * Translate label
     */
    const txt = await getDictItem(idMsg);
    elIssue.innerText = txt;
    elIssue.dataset.lang_key = idMsg;
    return elIssue;
  }

  function updateReadMore() {
    uiReadMore(".mx-prop-container", {
      maxHeightClosed: 100,
      selectorParent: elContainer,
      boxedContent: false,
    });
  }

  function render() {
    for (const idView in attributes) {
      renderItem(idView, attributes[idView]);
    }
  }

  async function renderItem(idView, promAttributes) {
    const view = getView(idView);
    const language = getLanguageCurrent();
    const isVt = isViewVt(view);
    const isGj = isViewGj(view);
    const isVector = isVt || isGj;
    const title = getViewTitle(idView);
    let elLayer, elProps, elWait, labels;

    try {
      /**
       * Build content elements
       */
      elLayer = el(
        "div",
        {
          class: "mx-prop-group",
          dataset: {
            l: idView,
          },
        },
        el(
          "span",
          {
            class: "mx-prop-layer-title",
          },
          title,
        ),
        (elWait = el(
          "div",
          {
            class: "mx-inline-spinner-container",
          },
          el("div", {
            class: "fa fa-cog fa-spin",
          }),
        )),
        (elProps = el("div")),
      );

      elContainer.appendChild(elLayer);

      /**
       * Attributes to ui
       */
      const attributes = await promAttributes;
      elWait.remove();
      const attrNames = Object.keys(attributes);

      if (attrNames.length === 0) {
        elLayer.appendChild(await elIssueMessage("noValue"));
        return;
      }

      if (isVt) {
        const idSource = getViewVtSourceId(view);
        labels = await fetchAttributesAlias(idSource, attrNames);
      }

      /**
       * For each attributes, add
       */
      for (const attribute of attrNames) {
        let elValue;
        let label = attribute;

        const values = getArrayStat({
          stat: "sortNatural",
          arr: attributes[attribute],
        });

        const hasValues = values.length > 0;
        if (!hasValues) {
          values.push("-");
        }

        if (labels && labels[attribute]) {
          label = getLabelFromObjectPath({
            obj: labels,
            path: attribute,
            defaultValue: attribute,
          });
        }

        /**
         * Build property elements
         */
        const elPropToggles = el("div", {
          class: "mx-prop-toggles",
        });

        const elPropContainer = el(
          "div",
          {
            class: "mx-prop-container",
          },
          el(
            "div",
            el(
              "div",
              {
                class: "mx-prop-content",
              },
              el(
                "span",
                {
                  class: "mx-prop-title",
                  title: attribute,
                },
                label,
              ),
              elPropToggles,
            ),
          ),
        );

        elProps.appendChild(elPropContainer);
        /*
         * Add a toggle or span for each value
         */
        for (var i = 0, iL = values.length; i < iL; i++) {
          var value = values[i];

          if (hasValues && isVector) {
            /**
             * Case vector, add button and listener
             */
            elValue = uiToggleBtn({
              label: value,
              onChange: filterValues,
              data: {
                layer: idView,
                attribute: attribute,
                value: value,
                type: isNumeric(value) ? "numeric" : "string",
              },
              labelBoxed: true,
              checked: false,
            });
          } else {
            /**
             * In other cases, add values as span
             */
            elValue = el("div");
            if (isArray(value)) {
              elFrag = document.createDocumentFragment();
              for (const v of value) {
                elFrag.appendChild(
                  el(
                    "span",
                    {
                      class: "mx-prop-static",
                    },
                    v,
                  ),
                );
              }
              elValue.appendChild(elFrag);
            } else {
              elValue = el("span", {
                class: "mx-prop-static",
              });
              elValue.innerText = value;
            }
          }

          /**
           * Add value(s) to container
           */
          elPropToggles.appendChild(elValue);
        }
      }

      /**
       * Udate readmore
       */
      updateReadMore();
    } catch (err) {
      if (isElement(elLayer)) {
        elLayer.appendChild(await elIssueMessage("property_list_failed"));
      }
      if (isElement(elWait)) {
        elWait.remove();
      }
      console.error(err);
    }
  }

  function resetFilter() {
    for (const idV in filters) {
      const view = getView(idV);

      if (!view._setFilter) {
        return;
      }

      view._setFilter({
        filter: ["all"],
        type: "popup_filter",
      });
    }
  }

  function filterValues(e) {
    const elBtn = e.target;
    const elChecks = parentFinder({
      selector: elBtn,
      class: "mx-prop-group",
    }).querySelectorAll(".check-toggle input");
    const layer = elBtn.dataset.layer;

    filters[layer] = ["any"];

    for (const elCheck of elChecks) {
      updateFilters(elCheck);
    }

    applyFilters(layer);
  }

  function updateFilters(el) {
    const value = el.dataset.value;
    const layer = el.dataset.layer;
    const type = el.dataset.type;
    const attribute = el.dataset.attribute;
    const add = el.checked;
    const isNum = !isEmpty(type) ? type === "numeric" : isNumeric(value);
    let rule = [];
    if (add) {
      if (value === settings.valuesMap.null) {
        rule.push(...["!", ["has", attribute]]);
      } else {
        if (isNum) {
          /**
           * Use both text or numeric if value has been converted to string at one point
           */
          rule = [
            "any",
            ["==", ["get", attribute], value],
            ["==", ["get", attribute], value * 1],
          ];
        } else {
          rule = ["==", ["get", attribute], value];
        }
      }
      filters[layer].push(rule);
    }
  }

  function applyFilters(idV) {
    const filter = filters[idV];
    const view = getView(idV);
    if (!view._setFilter) {
      return;
    }
    view._setFilter({
      filter: filter,
      type: "popup_filter",
    });

    filters[idV] = [];
  }
}
