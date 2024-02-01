import { isIconFont, isCanvas, isEmpty } from "./../is_test_mapx";
import { FlashCircle } from "./../icon_flash";
import * as actions from "./actions.js";

export function handleViewClick(event) {
  try {
    if (event.target === event.currentTarget) {
      return;
    }

    const elTarget =
      isIconFont(event.target) || isCanvas(event.target)
        ? event.target.parentElement
        : event.target;

    if (!elTarget) {
      return;
    }

    const dataset = elTarget.dataset;
    const noConfig = isEmpty(Object.keys(dataset));
    
    if (noConfig) {
      return;
    }

    const key =
      dataset.tool_id || dataset.view_action_handler || dataset.view_action_key;

    if (!key) {
      return;
    }
    const action = actions[key];

    if (!action) {
      return;
    }

    if (!["btn_toggle_view", "btn_legend_filter"].includes(key)) {
      event.preventDefault();
    }
    event.stopPropagation();
    event.stopImmediatePropagation();

    new FlashCircle({
      x: event.clientX,
      y: event.clientY,
    });

    if (dataset.view_action_key) {
      mx.events.fire({
        type: "view_panel_click",
        data: {
          idView: dataset.view_action_target,
          idAction: dataset.view_action_key,
        },
      });
    }
    const res = action(dataset, elTarget);
    if (res instanceof Promise) {
      res.catch(console.error);
    }
  } catch (e) {
    console.error("handleViewClick", e);
  }
}
