import { ButtonPanel } from "./../button_panel";
import { el } from "./../el/src/index.js";
import { bindAll } from "./../bind_class_methods/index.js";
import "./less/mx_panel.less";
import { EventSimple } from "./../event_simple";
import { modalChangelog } from "./../changelog";

/**
 * This is a partial implementation of the main MapX panel
 * the idea is to be able to control every aspect of the panel via
 * this module
 * For now, it's just a wrapper around ButtonPanel.
 * TODO : implement all dynamic changes E.g. translation, role changes, etc, filters, etc.
 * here instead of having disconnected function all over the place, mainly in mx_helpers_map
 */
const settings = {
  mapx: {
    version: "",
  },
  panel: {
    elContainer: document.body,
    position: "top-left",
    title_text: "Hello",
    button_text: "click me",
    button_classes: ["fa", "fa-list-ul"],
    container_style: {
      width: "480px",
      maxHeight: "90%",
      maxWidth: "90%",
      minWidth: "200px",
      minHeight: "80%",
    },
  },
};

class MainPanel extends EventSimple {
  constructor(opt) {
    super();
    const mp = this;
    mp.opt = Object.assign({}, opt);
    Object.keys(settings).forEach((k) => {
      mp.opt[k] = Object.assign({}, settings[k], opt[k]);
    });
    bindAll(mp);
    mp.init();
  }

  init() {
    const mp = this;
    if (mp._init) {
      return;
    }
    mp._init = true;

    const hasShiny = !!window.Shiny;
    const htmlImport = [
      require("./html/headers.html"),
      require("./html/tabs.html"),
      require("./html/tools.html"),
      require("./html/views.html"),
      require("./html/search.html"),
    ].join("");

    mp.elContent = el(
      "div",
      {
        class: ["mx-panel"],
      },
      htmlImport
    );
    mp.panel = new ButtonPanel(mp.opt.panel);
    mp.panel.elPanelContent.appendChild(mp.elContent);

    if (hasShiny) {
      Shiny.bindAll(mp.elContent);
    }
    if (mp.opt.mapx.version) {
      const elVersion = mp.elContent.querySelector(".mx-version");
      if (elVersion) {
        elVersion.innerText = mp.opt.mapx.version;
        elVersion.addEventListener("click", modalChangelog);
      }
    }
    mp.elTabs = mp.elContent.querySelector(".mx-tab--tabs");
    mp.elTabs.addEventListener("click", mp.handleTabClick);
  }
  handleTabClick(e) {
    const mp = this;
    const elTab = e.target;
    const idTab = elTab.dataset.tab;
    if (idTab) {
      mp.tabActivate(idTab);
    }
  }
  tabActivate(id) {
    const mp = this;
    const elPanels = mp.elContent.querySelectorAll(".mx-tab--panel");
    const elTabs = mp.elContent.querySelectorAll(".mx-tab--tab");
    const elPanel = mp.elContent.querySelector(`[data-panel=${id}]`);
    const elTab = mp.elContent.querySelector(`[data-tab=${id}]`);

    if (elTab) {
      const isActive = elTab.classList.contains("active");
      if (isActive) {
        return;
      }
      elPanels.forEach((el) => el.classList.remove("active"));
      elTabs.forEach((el) => el.classList.remove("active"));
      elTab.classList.add("active");
      elPanel.classList.add("active");
      mp.fire("tab_change", id);
    }
  }
}
export { MainPanel };
