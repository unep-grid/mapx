import { getView, getMap } from "./../map_helpers";
import { path } from "./../mx_helper_misc.js";
import { storyMapLock, isStoryPlaying } from "../story_map";
import { getDictItem } from "../language";
import { isString, isEmpty, isView, isArray } from "./../is_test";

export class DashboardManager {
  constructor() {
    const dm = this;
    dm.store = {
      dashboard: null,
    };
  }

  hasInstance() {
    const dm = this;
    return dm.store.dashboard && !dm.store.dashboard.isDestroyed();
  }

  getInstance() {
    const dm = this;
    if (!dm.hasInstance()) {
      return;
    }
    return dm.store.dashboard;
  }

  rmInstance() {
    const dm = this;
    if (!dm.hasInstance()) {
      return;
    }
    return dm.store.dashboard.destroy();
  }

  autoDestroy() {
    const dm = this;
    if (!dm.hasInstance()) {
      return;
    }
    return dm.store.dashboard.autoDestroy();
  }

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

  viewHasWidget(idView) {
    const view = getView(idView);
    if (!isView(view)) {
      return false;
    }
    return isArray(view._widgets) && view._widgets.length > 0;
  }

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
  }

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

    dm.store.dashboard = new Dashboard({
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

    dm.store.dashboard.on("show", () => {
      const hasStory = isStoryPlaying();
      if (hasStory) {
        storyMapLock("unlock");
      }
    });

    dm.store.dashboard.on("hide", () => {
      const hasStory = isStoryPlaying();
      if (hasStory) {
        storyMapLock("lock");
      }
    });

    dm.store.dashboard.on("destroy", () => {
      const hasStory = isStoryPlaying();
      if (hasStory) {
        storyMapLock("lock");
      }
    });

    return true;
  }

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
