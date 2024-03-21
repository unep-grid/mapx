import { getView, getMap } from "./../map_helpers";
import { path } from "./../mx_helper_misc.js";
import { storyMapLock, isStoryPlaying } from "../story_map";
import { getDictItem } from "../language";
import { isString, isEmpty, isView, isArray } from "./../is_test";
/**
 * DashboardManager: A high-level manager for Dashboard instances.
 *
 * This class serves as a wrapper around the Dashboard class,
 * facilitating enhanced interaction with dashboard instances by
 * integrating additional views and story behavior management. It provides
 * methods to execute commands on dashboard instances, manage their lifecycle,
 * and dynamically manipulate dashboard views and  widgets based on
 * application logic.
 */
export class DashboardManager {
  constructor() {
    const dm = this;
    dm._dashboard = null;
  }

  /**
   * Checks if a dashboard instance is currently stored and not destroyed.
   * @returns {boolean} True if an active dashboard instance exists,
   * false otherwise.
   */
  hasInstance() {
    const dm = this;
    return dm._dashboard && !dm._dashboard.isDestroyed();
  }

  /**
   * Retrieves the dashboard instance if it exists and is not destroyed.
   * @returns {Dashboard|null} The current dashboard instance or null if none
   * exists or it has been destroyed.
   */
  getInstance() {
    const dm = this;
    if (!dm.hasInstance()) {
      return;
    }
    return dm._dashboard;
  }

  /**
   * Executes a specified command on the dashboard instance, if available.
   * @param {string} cmd The command name to execute on the dashboard instance.
   * @param {*} value The value or argument to pass to the command function.
   * @returns {Promise<*>} The result of the command execution, or
   * undefined if the instance does not exist.
   */
  async exec(cmd, value) {
    try {
      const dm = this;
      if (!dm.hasInstance()) {
        return;
      }
      const d = dm.getInstance();
      return d[cmd](value);
    } catch (e) {
      console.warn(e);
    }
  }

  /**
   * Destroys the dashboard instance if it exists.
   * @returns {void}
   */
  rmInstance() {
    const dm = this;
    if (!dm.hasInstance()) {
      return;
    }
    return dm._dashboard.destroy();
  }

  /**
   * Invokes the autoDestroy method on the dashboard instance, if it
   * exists.
   * @returns {Promise<void>}
   */
  async autoDestroy() {
    const dm = this;
    if (!dm.hasInstance()) {
      return;
    }
    return dm._dashboard.autoDestroy();
  }
  /**
   * Retrieves the configuration for a view with dashoard
   * @param {string} idView The identifier for the view
   * @returns {Object|null} The view dashoard config
   */
  viewConfigGet(idView) {
    const view = getView(idView);

    if (!isView(view)) {
      return;
    }

    const config = path(view, "data.dashboard", {});

    if (isEmpty(config)) {
      return;
    }

    if (config.disabled) {
      return;
    }

    config.modules = isArray(config.modules)
      ? config.modules
      : isString(config.modules)
        ? [config.modules]
        : [];

    return config;
  }

  /**
   * Checks if a view contains any widgets.
   * @param {string} idView
   * @returns {boolean}
   */
  viewHasWidget(idView) {
    const view = getView(idView);
    if (!isView(view)) {
      return false;
    }
    return isArray(view._widgets) && view._widgets.length > 0;
  }

  /**
   * Removes all widgets from a given view.
   * @param {string} idView
   * @returns {Promise<boolean>} Done
   */
  async viewRmWidgets(idView) {
    const dm = this;
    const hasWidgets = dm.viewHasWidget(idView);
    if (!hasWidgets) {
      return;
    }
    const view = getView(idView);

    for (const widget of view._widgets) {
      await widget.destroy();
    }

    view._widgets.length = 0;
    return true;
  }

  /**
   * Adds widgets to a view based on its configuration, if applicable.
   * @param {string} idView
   * @returns {Promise<Array>} Added widgets
   */
  async viewAddWidgetsAsync(idView) {
    const dm = this;
    const config = dm.viewConfigGet(idView);
    if (!config) {
      return false;
    }
    const view = getView(idView);
    const map = getMap();
    await dm.viewRmWidgets(idView);
    await dm.viewCreateDashboardAsync(idView);
    const d = dm.getInstance();
    view._widgets = await d.addWidgetsAsync({
      widgets: config.widgets,
      modules: config.modules,
      view: view,
      map: map,
    });
    return view._widgets;
  }

  /**
   * Create the view's dashboard
   * @param {string} idView
   * @returns {Promise<boolean>}
   */
  async viewCreateDashboardAsync(idView) {
    const dm = this;
    const { Dashboard } = await import("./dashboard.js");

    const d = dm.getInstance();
    if (d instanceof Dashboard) {
      return false;
    }
    const config = dm.viewConfigGet(idView);
    if (!config) {
      return;
    }

    dm._dashboard = new Dashboard({
      dashboard: {
        layout: config.layout,
      },
      grid: {
        dragEnabled: true,
        layout: {
          horizontal: false,
          fillGaps: true,
          alignRight: false,
          alignBottom: false,
          rounding: true,
        },
      },
      panel: {
        elContainer: document.body,
        title_text: getDictItem("Dashboard"),
        title_lang_key: "dashboard",
        button_text: "dashboard",
        button_lang_key: "button_dashboard_panel",
        button_classes: ["fa", "fa-pie-chart"],
        position: "bottom-right",
        container_style: {
          minWidth: "100px",
          minHeight: "100px",
        },
      },
    });

    dm._dashboard.on("show", () => {
      const hasStory = isStoryPlaying();
      if (hasStory) {
        storyMapLock("unlock");
      }
    });

    dm._dashboard.on("hide", () => {
      const hasStory = isStoryPlaying();
      if (hasStory) {
        storyMapLock("lock");
      }
    });

    dm._dashboard.on("destroy", () => {
      const hasStory = isStoryPlaying();
      if (hasStory) {
        storyMapLock("lock");
      }
    });

    return true;
  }

  /**
   * Create the view's dashboard, and populate widgets
   * @param {string} idView
   * @returns {Promise<boolean>}
   */
  async viewAutoDashboardAsync(idView) {
    const dm = this;
    const { Dashboard } = await import("./dashboard.js");
    const created = await dm.viewCreateDashboardAsync(idView);
    const widgets = await dm.viewAddWidgetsAsync(idView);
    const d = dm.getInstance();
    const hasDashboard = d instanceof Dashboard;
    if (!hasDashboard) {
      return;
    }
    if (created) {
      const config = dm.viewConfigGet(idView);
      if (!config.panel_init_close) {
        await d.show();
        d.updatePanelLayout();
        d.updateAttributions();
      }
    }
    if (widgets && widgets.length > 0) {
      const isActive = d.isActive();
      if (!isActive) {
        d.shakeButton({
          type: "look_at_me",
        });
      } else {
        d.updateAttributions();
        d.updateGridLayout();
      }
    }
  }
}
