import { path } from "./mx_helper_misc.js";
import { AutoStyle } from "./auto_style/index.js";
import { elButtonFa } from "./el_mapx/index.js";
import { settings } from "./settings";
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
        const languages = settings.languages;

        /**
         * Add Auto style
         */

        const elBtnAuto = elButtonFa("auto_style_start", {
          icon: "magic",
          mode: "icon_text",
          action: (e) => {
            e.preventDefault();
            e.stopPropagation();
            instanceAutoStyle(e);
          },
        });

        self.controls.appendChild(elBtnAuto);

        async function instanceAutoStyle() {
          try {
            const editor = self;
            const schema = editor.getItemSchema();
            const style = editor.parent.getValue();
            const idView = path(schema, "options.idView");
            const geomType = path(schema, "options.geomType", "point");
            const nullValue = style?.nulls[0]?.value || null;
            const editorUpperBound =
              editor.parent.getChildEditors().includeUpperBoundInInterval;

            const as = new AutoStyle();

            await as.init(
              {
                idView: idView,
                nullValue: nullValue,
                allowModeSizes: ["point", "line"].includes(geomType),
              },
              update
            );

            /**
             * CB called when clostin autostyle
             */
            function update(data, state) {
              if (editorUpperBound) {
                editorUpperBound.setValue(true);
              }
              const table = data.table;
              const { mergeLabelByRow, type, mode } = state;
              const origRules = editor.getValue();
              const modeNumeric = type === "continuous";
              const rules = table.map((r, i) => {
                let newRule = {
                  value: modeNumeric ? r.from : r.value,
                  color: r.color,
                };
                if (modeNumeric) {
                  newRule.value_to = r.to;
                }
                if (mode === "sizes") {
                  newRule.size = r.size;
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
                  for (const language of languages) {
                    if (modeNumeric) {
                      newRule[`label_${language}`] = `${r.from} - ${r.to}`;
                    } else {
                      newRule[`label_${language}`] = `${r.value}`;
                    }
                  }
                }

                return newRule;
              });

              editor.setValue(rules);

              editor.onChange(true);
            }
          } catch (e) {
            console.error(e);
          }
        }
      },
    });
})();
