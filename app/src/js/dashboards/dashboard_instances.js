import { getView, getMap } from "./../map_helpers";
import { path } from "./../mx_helper_misc.js";
import { storyMapLock, isStoryPlaying } from "../story_map";
import { getDictItem } from "../language";
import { isString, isEmpty, isView, isArray } from "./../is_test";

const store = {
  dashboard: null,
};

const dashboardHelper = {
  getInstance,
  hasInstance,
  rmInstance,
  autoDestroy,
  viewConfigGet,
  viewHasWidget,
  viewRmWidgets,
  viewAddWidgetsAsync,
  viewCreateDashboardAsync,
  viewAutoDashboardAsync,
};
export { dashboardHelper };

/**
 * Check if has instance
 * @return {Boolean}
 */
function hasInstance() {
  const d = store.dashboard;
  return d && !d.isDestroyed();
}

/**
 * Get dashboard instance
 * @return {Object} dashboard
 */
function getInstance() {
  if (!hasInstance()) {
    return;
  }
  return store.dashboard;
}

/**
 * Get dashboard instance
 * @return {Object} dashboard
 */
function rmInstance() {
  if (!hasInstance()) {
    return;
  }
  return store.dashboard.destroy();
}

/**
 * Auto remove instance
 * @return {Object} dashboard
 */
function autoDestroy() {
  if (!hasInstance()) {
    return;
  }
  return store.dashboard.autoDestroy();
}

/**
 * Simplified view add with dashboard
 * @param {String} idView View id
 * @return
 */
async function viewAutoDashboardAsync(idView) {
  const created = await viewCreateDashboardAsync(idView);
  const widgets = await viewAddWidgetsAsync(idView);
  if (created) {
    const config = viewConfigGet(idView);
    if (!config.panel_init_close) {
      const d = getInstance();
      d.show();
      const panelControl = d.panel.getOtherPanel("controls_panel");
      if (panelControl) {
        panelControl.close();
      }
    }
  }
  if (widgets && widgets.length > 0) {
    const d = getInstance();
    const isActive = d.isActive();
    if (!isActive) {
      d.shakeButton({
        type: "look_at_me",
      });
    }
  }
}

/**
 * Get view dashboard config
 * @param {String} idView View id
 * @return {Object} config object
 */
function viewConfigGet(idView) {
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

  /*
   * Modules should array of string. In older version, single string was an option
   */
  config.modules = isArray(config.modules)
    ? config.modules
    : isString(config.modules)
    ? [config.modules]
    : [];

  return config;
}

/**
 * Check if view has widget
 * @param {String} idView View id
 * @return {Boolean} has widgets
 */
function viewHasWidget(idView) {
  const view = getView(idView);
  if (!isView(view)) {
    return false;
  }
  return isArray(view._widgets) && view._widgets.length > 0;
}

/**
 * Remove widget from view
 * @param {String} idView View id
 * @return null
 */
async function viewRmWidgets(idView) {
  const hasWidgets = viewHasWidget(idView);
  if (!hasWidgets) {
    return;
  }
  const view = getView(idView);
  for (const widget of view._widgets) {
    await widget.destroy();
  }
}

/**
 * Create widgets and add to view
 * @param {String} idView View id
 * @return {Promise<Array||Boolean>} array of widget or false
 */
async function viewAddWidgetsAsync(idView) {
  const config = viewConfigGet(idView);
  if (!config) {
    return false;
  }
  const view = getView(idView);
  const map = getMap();
  await viewRmWidgets(idView);
  await viewCreateDashboardAsync(idView);
  const d = getInstance();
  view._widgets = await d.addWidgetsAsync({
    widgets: config.widgets,
    modules: config.modules,
    view: view,
    map: map,
  });
  return view._widgets;
}

/**
 * Create new dashboard instance if needed
 * @param {String} idView View id
 * @return {Promise<Boolean>} created
 */
async function viewCreateDashboardAsync(idView) {
  const d = getInstance();
  if (d) {
    return false;
  }
  const config = viewConfigGet(idView);
  if (!config) {
    return;
  }
  const { Dashboard } = await import("./dashboard.js");
  /**
   * Create a new dashboard, save it in mx object
   */
  store.dashboard = new Dashboard({
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

  /**
   * If a story is playing and the dashboard
   * is shown, unlock the story
   */
  store.dashboard.on("show", () => {
    const hasStory = isStoryPlaying();
    if (hasStory) {
      storyMapLock("unlock");
    }
  });

  /**
   * If a story is playing and the dashboard
   * is closed or destroy, lock the story
   */
  store.dashboard.on("hide", () => {
    const hasStory = isStoryPlaying();
    if (hasStory) {
      storyMapLock("lock");
    }
  });

  store.dashboard.on("destroy", () => {
    const hasStory = isStoryPlaying();
    if (hasStory) {
      storyMapLock("lock");
    }
  });

  return true;
}
