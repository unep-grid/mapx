import { path } from "./mx_helper_misc.js";
import { getLanguageCurrent } from "./language";
import { AutoStyle } from "./auto_style/index.js";
import { el } from "./el_mapx/index.js";

(function () {
  "use strict";

  JSONEditor.defaults.resolvers.unshift(function (schema) {
    if (schema.type === "array" && schema.format === "tableSourceAutoStyle") {
      return "tableSourceAutoStyle";
    }
  });

  JSONEditor.defaults.editors.tableSourceAutoStyle =
    JSONEditor.defaults.editors.table.extend({
      addControls: function () {
        var self = this;
        self.addControlsBase =
          JSONEditor.defaults.editors.table.prototype.addControls;
        self.addControlsBase();

        /**
         * Add Auto style
         */

        const elAuto = el(
          "button",
          {
            class: "btn btn-default",
            type: "button",
            title: "Auto style",
          },
          [
            el("i", {
              class: ["glyphicon", "glyphicon-cog"],
            }),
            el("span", "Auto style"),
          ]
        );

        elAuto.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          instanceAutoStyle(e);
        });

        this.auto_style_button = elAuto;

        self.controls.appendChild(this.auto_style_button);

        async function instanceAutoStyle() {
          try {
            const editor = self;
            const schema = editor.getItemSchema();
            const style = editor.parent.getValue();
            const idView = path(schema, "options.idView");
            const lang = getLanguageCurrent();
            const nullValue = style?.nulls[0]?.value || null;
            const editorUpperBound =
              editor.parent.getChildEditors().includeUpperBoundInInterval;

            const as = new AutoStyle();

            await as.init({
              idView: idView,
              nullValue: nullValue,
              onDone: (data, opt) => {
                if (editorUpperBound) {
                  editorUpperBound.setValue(true);
                }
                const { mergeLabelByRow } = opt;
                const origRules = editor.getValue();
                const modeNumeric = data.type === "continuous";
                const rules = data.table.map((r, i) => {
                  let newRule = {
                    value: modeNumeric ? r.from : r.value,
                    color: r.color,
                  };
                  if (modeNumeric) {
                    newRule.value_to = r.to;
                  }

                  /**
                   * Preserve label by merge
                   */
                  if (mergeLabelByRow === true) {
                    const ruleToMerge = origRules[i];
                    if (ruleToMerge) {
                      /**
                       * Copy previous settings
                       */
                      newRule = Object.assign({}, ruleToMerge, newRule);
                    }
                  } else {
                    /**
                     * Create label (other parameters will be defaults)
                     */
                    if (modeNumeric) {
                      newRule[`label_${lang}`] = `${r.from} - ${r.to}`;
                    } else {
                      newRule[`label_${lang}`] = `${r.value}`;
                    }
                  }

                  return newRule;
                });

                editor.setValue(rules);

                editor.onChange(true);
              },
            });
          } catch (e) {
            console.error(e);
          }
        }
      },
    });
})();
