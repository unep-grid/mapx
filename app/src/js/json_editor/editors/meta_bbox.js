import { JSONEditor } from "@json-editor/json-editor";
import { el } from "./../../el/src/index.js";
import { elButtonFa } from "./../../el_mapx";
import { isSourceId, isTrue, isViewId } from "./../../is_test/index.js";
import { getView } from "./../../map_helpers";
import {
  bboxToBboxMeta,
  getSourceRtSummary,
  getSourceVtSummary,
} from "../../mx_helper_source_summary.js";

/**
 * Set a resolver for the map position format
 */
JSONEditor.defaults.resolvers.unshift((schema) => {
  if (schema.type === "object" && schema.format === "meta_bbox") {
    return "meta_bbox";
  }
});

JSONEditor.defaults.editors.meta_bbox = class mxeditors extends (
  JSONEditor.defaults.editors.object
) {
  layoutEditors() {
    var self = this;
    if (!self.row_container) {
      return;
    }

    const elContainer = el("div");

    /**
     * Add button to get position from a map
     */
    const hasSourceVt = isSourceId(self.options.idSource);
    const hasViewRt =
      !hasSourceVt &&
      isViewId(self.options.idView) &&
      getView(self.options.idView).type === "rt";

    if (hasSourceVt || hasViewRt) {
      const elBtnBbox = elButtonFa("btn_update_bbox", {
        icon: "magic",
        action: updateBbox,
      });

      const elBtnsGroup = el("div", { class: "btn-group" }, [elBtnBbox]);

      elContainer.appendChild(elBtnsGroup);

      /**
       * Helper
       */
      async function updateBbox(reset = false) {
        let bbox = {
          lat_min: -90,
          lat_max: 90,
          lng_min: -180,
          lng_max: 180,
        };

        if (isTrue(reset)) {
          return self.setValue(bbox);
        }

        if (hasSourceVt) {
          /**
           *
           * TODO : finish the process of updating bbox
           *
           *
           */
          const { extent_sp } = await getSourceVtSummary({
            idSource: self.options.idSource,
            stats: ["spatial"],
          });
          Object.assign(bbox, bboxToBboxMeta(extent_sp));
        }
        if (hasViewRt) {
          const view = getView(self.options.idView);
          const { extent_sp } = await getSourceRtSummary(view);
          Object.assign(bbox, bboxToBboxMeta(extent_sp));
        }

        self.setValue(bbox);
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
