import { getView, getMap } from "./../map_helpers";
import { path } from "./../mx_helper_misc.js";
import { storyMapShakeLock, isStoryPlaying } from "../story_map";
import { getDictItem } from "../language";
import { isString, isEmpty, isView, isArray } from "./../is_test";
import { Dashboard } from "./dashboard.js";
import { isNotEmpty } from "../is_test";

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
    const dashboard = dm._dashboard;
    return dashboard instanceof Dashboard && !dashboard.isDestroyed();
  }

  /**
   * Retrieves the dashboard instance if it exists and is not destroyed.
   * @returns {Dashboard|Boolean} The current dashboard instance or null if none
   * exists or it has been destroyed.
   */
  get() {
    const dm = this;
    if (!dm.hasInstance()) {
      return false;
    }
    return dm._dashboard;
  }

  /**
   * Get or create a dashboard instance;
   * @param {Object} opt Options for creating a dashboard
   * @returns {}
   */
  async getOrCreate(opt) {
    const dm = this;
    if (dm.hasInstance()) {
      return dm.get();
    }
    return dm.create(opt);
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
      const dashboard = dm.get();
      return dashboard[cmd](value);
    } catch (e) {
      console.warn(e);
    }
  }

  /**
   * Destroys the dashboard instance if it exists.
   * @returns {void}
   */
  remove() {
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
   * Retrieves the configuration for a view with dashboard
   * @param {string} idView The identifier for the view
   * @returns {Object|null} The view dashboard config
   */
  getConfigFromView(idView) {
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
  hasViewWidgets(idView) {
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
  async removeWidgetsFromView(idView) {
    const dm = this;
    const hasWidgets = dm.hasViewWidgets(idView);
    if (!hasWidgets) {
      return;
    }
    const view = getView(idView);

    for (const widget of view._widgets) {
      await widget.destroy();
    }

    view._widgets.length = 0;

    await dm.autoDestroy();
    return true;
  }

  /**
   * Adds widgets to a view based on its configuration, if applicable.
   * @param {string} idView
   * @returns {Promise<Array>} Added widgets
   */
  async addWidgetsToView(idView) {
    const dm = this;
    const config = dm.getConfigFromView(idView);
    if (!config) {
      return false;
    }
    const view = getView(idView);
    const map = getMap();
    await dm.removeWidgetsFromView(idView);
    const dashboard = await dm.getOrCreate(config);
    view._widgets = await dashboard.addWidgets({
      widgets: config.widgets,
      modules: config.modules,
      view: view,
      map: map,
    });
    return view._widgets;
  }

  /**
   * Create a dashboard if it doesn't exist'
   * @param {Object} Config
   * @param {String} config.layout layout of the dashboard :
   * @returns {Promise<Dashboard>}
   */
  async create(config = { layout: "fit" }) {
    const dm = this;

    if (isEmpty(config)) {
      config = { layout: "fit" };
    }

    if (dm.hasInstance()) {
      console.warn(
        "Dashboard already created. Use getOrCreate method if needed",
      );
      return dm.get();
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
        storyMapShakeLock();
      }
    });

    dm._dashboard.on("hide", () => {});

    dm._dashboard.on("destroy", () => {});

    return dm._dashboard;
  }

  /**
   * Create the view's dashboard, and populate widgets
   * NOTE: story map uses directly dashboard.addWidgetsToView(v);
   * @param {string} idView
   * @returns {Promise<boolean>}
   */
  async createFromView(idView) {
    const dm = this;
    const config = dm.getConfigFromView(idView);
    if (isEmpty(config)) {
      return false;
    }
    const dashboard = await dm.getOrCreate(config);
    const isActive = dashboard.isActive();
    const widgets = await dm.addWidgetsToView(idView);
    const widgetsAdded = isNotEmpty(widgets);
    if (!widgetsAdded) {
      return;
    }
    if (!config.panel_init_close) {
      await dashboard.show();
    }

    if (!isActive) {
      dashboard.shakeButton({
        type: "look_at_me",
      });
    }
  }
}
