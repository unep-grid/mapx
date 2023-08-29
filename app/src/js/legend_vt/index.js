import chroma from "chroma-js";
import {
  isArray,
  isEmpty,
  isNotEmpty,
  isViewVt,
  isElement,
} from "./../is_test/index.js";
import { checkLanguage, getLabelFromObjectPath } from "./../language/index.js";
import { path, updateIfEmpty, makeId, firstOf } from "./../mx_helper_misc.js";
import { getSpriteImage } from "./../map_helpers/index.js";
import { el } from "./../el/src/index.js";

export function buildLegendVt(view, rules) {
  if (!isArray(rules)) {
    rules = view?._style_rules || view?.data?.style?.rules || [];
  }

  const titleLegend = getLabelFromObjectPath({
    obj: view,
    path: "data.style.titleLegend",
  });

  const nRules = rules.length;
  const isPoint = path(view, "data.geometry.type") == "point";
  const isLine = path(view, "data.geometry.type") == "line";
  const isPolygon = path(view, "data.geometry.type") == "polygon";
  const isNumeric = path(view, "data.attribute.type") !== "string";
  const aElRules = [];

  let id = 0;
  for (const rule of rules) {
    // TODO:this last minute default update should be handled in previous steps..
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
      ? getSpriteImage(rule.sprite, { color: isPoint ? color : null })
      : null;

    //colStyle.opacity = rule.opacity;

    if (isLine) {
      colStyle.backgroundColor = color;
      colStyle.height = `${rule.size}px`;
    }
    if (isPolygon) {
      colStyle.backgroundColor = color;
      if (hasBorder) {
        colStyle.border = `0.5px solid ${rule.color_border || "transparent"}`;
      }
    }
    if (isPoint) {
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
          isNumeric ? "mx-legend-vt-rule-numeric" : null,
        ],
        style: {
          zIndex: nRules - id,
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
              isPolygon && hasSprite
                ? el("div", {
                    class: "mx-legend-vt-rule-background",
                    style: {
                      backgroundImage: `url(${spriteImage.url()})`,
                    },
                  })
                : null,
              el("div", { class: "mx-legend-vt-rule-color", style: colStyle }),
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
              view_action_rule_id: id,
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
    id++;
  }

  return el(
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
}

export function updateLegendVt(view) {
  if (!isViewVt(view)) {
    return;
  }
  const elView = view._el;
  const rules = view?._style_rules || view?.data?.style?.rules || [];

  if (isEmpty(rules) || !isElement(elView)) {
    return;
  }

  /**
   * Title
   */
  const titleLegend = getLabelFromObjectPath({
    obj: view,
    path: "data.style.titleLegend",
  });
  const elLegendTitle = elView.querySelector(".mx-legend-vt-title");
  if (isElement(elLegendTitle)) {
    elLegendTitle.innerText = titleLegend;
  }
  /**
   * Filter label
   */
  let id = 0;
  for (const rule of rules) {
    const lang = checkLanguage({
      debug: true,
      obj: rule,
      path: "",
      prefix: "label_",
    });
    const label = firstOf([rule[`label_${lang}`], rule.value, "No data"]);
    const elLabel = elView.querySelector(
      `input[data-view_action_rule_id="${id}"] + label > span`
    );
    if (isElement(elLabel)) {
      elLabel.innerText = label;
      elLabel.title = label;
    }
    id++;
  }
}
