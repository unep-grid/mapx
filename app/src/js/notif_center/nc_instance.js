import { NotifCenter } from "./../notif_center";
export { NotifCenterMapx };
import { settings } from "./../settings";
import { theme } from "./../init_theme";
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
        on: {
          add: (nc) => {
            theme.on("mode_changed", (opt) => {
              nc.setMode(opt);
            });
          },
          remove: (nc) => {
            theme.off("mode_changed", (opt) => {
              nc.setMode(opt);
            });
          },
        },
      },
      ui: {
        mode: theme.mode,
      },
      panel: {
        id: "notif_center",
        elContainer: document.body,
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
