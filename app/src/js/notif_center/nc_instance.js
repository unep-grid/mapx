import { NotifCenter } from "./../notif_center";
export { NotifCenterMapx };
import { settings } from "./../settings";
import { bindAll } from "../bind_class_methods";

/**
 * Create a configured instance of WsHandler
 * Defines :
 * - emit type handlers
 * - tests
 * - job request handlers
 */
class NotifCenterMapx extends NotifCenter {
  constructor() {
    super({
      config: {
        id: () => settings.user.id,
      },
      panel: {
        id: "notif_center",
        elContainer: document.body,
        button_lang_key: "nc_button",
        button_classes: ["fa", "fa-bell"],
        tooltip_position: "bottom-left",
        position: "bottom-left",
        container_classes : ['button-panel--pinned-always'],
        container_style: {
          width: "470px", // same as MainPanel
          height: "40%",
          minWidth: "340px",
          minHeight: "100px",
        },
      },
    });
    bindAll(this);
  }
}
