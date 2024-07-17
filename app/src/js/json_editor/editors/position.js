import { JSONEditor } from "@json-editor/json-editor";
import { el } from "./../../el/src/index.js";
import { elButtonFa } from "./../../el_mapx";
import { isNotEmpty } from "./../../is_test/index.js";
import { getMapPos, resetMaxBounds } from "./../../map_helpers";

/**
 * Set a resolver for the map position format
 */
JSONEditor.defaults.resolvers.unshift((schema) => {
  if (schema.type === "object" && schema.format === "position") {
    return "position";
  }
});

JSONEditor.defaults.editors.position = class mxeditors extends (
  JSONEditor.defaults.editors.object
) {
  layoutEditors() {
    var self = this;
    if (!this.row_container) {
      return;
    }

    const elContainer = el("div");

    /**
     * Add button to get position from a map
     */

    if (this.options.addButtonPos) {
      const elBtnPos = elButtonFa("btn_map_pos_get", {
        icon: "magic",
        action: updatePos,
      });
      const elBtnResetBounds = elButtonFa("btn_map_pos_reset_max_bounds", {
        icon: "chain-broken",
        action: resetPos,
      });

      const elBtnsGroup = el("div", { class: "btn-group" }, [
        elBtnPos,
        elBtnResetBounds,
      ]);

      elContainer.appendChild(elBtnsGroup);

      /**
       * Helper
       */
      function resetPos() {
        updatePos(true);
      }
      function updatePos(reset) {
        const idMap = self.options.idMap;
        if (!idMap) {
          console.log("no id map provided in position editor as an option");
        }

        if (reset === true) {
          resetMaxBounds();
        }

        const def = {
          z: 0,
          lat: 0,
          lng: 0,
          p: 0,
          b: 0,
          n: 0,
          s: 0,
          e: 0,
          w: 0,
          useMaxBounds: false,
          fitToBounds: false,
        };

        /*
         * Schema use long names, getMapPos, shorts.
         */
        const mapPosKeys = {
          z: "z",
          lat: "lat",
          lng: "lng",
          pitch: "p",
          bearing: "b",
          n: "n",
          s: "s",
          e: "e",
          w: "w",
        };
        const mapPos = reset === true ? def : getMapPos({ id: idMap });
        const newValues = self.getValue();
        for (const k in newValues) {
          const mapValue = mapPos[mapPosKeys[k]];
          const newValue = isNotEmpty(mapValue) ? mapValue : mapPos[k];
          if (isNotEmpty(newValue)) {
            newValues[k] = newValue;
          }
        }
        self.setValue(newValues);
      }
    }

    /**
     * set layout
     */
    for (const key of this.property_order) {
      const editor = this.editors[key];
      if (editor.property_removed) {
        continue;
      }
      const row = this.theme.getGridRow();
      elContainer.appendChild(row);

      if (editor.options.hidden) {
        editor.container.style.display = "none";
      } else {
        this.theme.setGridColumnSize(editor.container, 12);
      }
      row.appendChild(editor.container);
    }
    this.row_container.innerHTML = "";
    this.row_container.appendChild(elContainer);
  }
};
