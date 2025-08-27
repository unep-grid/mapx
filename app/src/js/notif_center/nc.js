import { el } from "./../el/src/index.js";
import { ButtonPanel } from "../button_panel";
import { isFunction, isObject, isEmpty } from "../is_test/index.js";
import { tt } from "../el_mapx";
import { patchObject } from "../mx_helper_misc.js";
import "font-awesome/css/font-awesome.min.css";
import "./style.less";

const def = {
  timestart: new Date("2015/01/01").getTime(),
  storage: {
    label: "nc_notifs",
    max: 300,
  },
  config: {
    id: null,
    on: {
      add: () => {},
      remove: () => {},
    },
  },
  ui: {
    logo: require("./../../png/map-x-logo.png"),
  },
  panel: {
    id: "notif_panel",
    useCompact: true,
    elContainer: null,
    button_lang_key: "nc_button",
    button_classes: ["fa", "fa-bell"],
    tooltip_position: "top-right",
    position: "bottom-left",
    container_style: {
      minWidth: "470px",
      minHeight: "250px",
      maxWidth: "50%",
      maxHeight: "50%",
    },
  },
  items: {
    maxMerge: 20,
  },
};

export class NotifCenter {
  constructor(opt) {
    const nc = this;
    nc._opt = patchObject(def, opt);

    /* bind methods used in cb */
    nc._handler_info = nc._handler_info.bind(nc);
    nc._handler_progress = nc._handler_progress.bind(nc);
    nc._handler_browser = nc._handler_browser.bind(nc);
    nc._handler_data = nc._handler_data.bind(nc);
    nc.clearHistory = nc.clearHistory.bind(nc);
  }

  async init() {
    try {
      const nc = this;
      nc.clear();

      /**
       * Set id
       */
      if (isFunction(nc._opt.config.id)) {
        nc._id = await nc._opt.config.id();
      } else {
        nc._id = nc._opt.config.id;
      }

      /**
       * Storage
       */

      /**
       * Panel button
       */
      if (!nc.panel) {
        nc.panel = new ButtonPanel(nc._opt.panel);
      }

      if (nc.panel.isActive()) {
        await nc.restore();
        await nc.setSeenAll();
      }

      nc.panel.on("open", async () => {
        nc.enableRender();
        await nc.setSeenAll();
        await nc.restore();
      });

      nc.panel.on("close", async () => {
        nc.clear();
        nc.disableRender();
      });

      /**
       * Build panel content items
       */

      if (!nc.elMain) {
        nc.build();
      }

      /**
       * Add callback
       */
      if (isFunction(nc._opt.config.on.add)) {
        nc._opt.config.on.add(nc);
      }

      /**
       * Set initial unseen count
       */
      const nUnseen = await nc.getUnseenCount();

      if (nUnseen > 0) {
        nc.panel.showFlag();
      }
    } catch (e) {
      console.error(e);
    }
  }

  async hasNotifPermission() {
    const nc = this;
    if (!nc._browser_notif_granted) {
      const perm = await Notification.requestPermission();
      nc._browser_notif_granted = perm === "granted";
    }
    return nc._browser_notif_granted === true;
  }

  setCount(v) {
    const nc = this;
    nc._count = v || 0;
    return nc._count;
  }

  incCount() {
    const nc = this;
    return nc._count++;
  }

  async restore() {
    const nc = this;
    nc.clear();
    const notifs = await nc.getItems();
    nc.setCount(0);
    for (const notif of notifs) {
      nc.notify(notif, { save: false, scroll: false });
    }
  }

  async saveItem(notif) {
    const nc = this;
    const notifs = await nc.getItems();
    notifs.push(notif);
    if (notifs.length > 300) {
      // TODO: remove based on groups, individual items are not significant
      notifs.splice(notifs.length - nc._opt.storage.max, notifs.length);
    }
    return nc.replaceItems(notifs);
  }

  async replaceItems(notifs) {
    const nc = this;
    return new Promise((resolve) => {
      try {
        if (isEmpty(notifs)) {
          notifs = [];
        }
        const sid = nc.getStoreId();
        localStorage.setItem(sid, JSON.stringify(notifs));
        nc.setCount(notifs.length);
        resolve(true);
      } catch (e) {
        console.error(e);
      }
    });
  }

  getItems() {
    const nc = this;
    return new Promise((resolve) => {
      const sid = nc.getStoreId();
      const notifs = JSON.parse(localStorage.getItem(sid) || "[]");
      notifs.sort((a, b) => a.timestamp - b.timestamp);
      resolve(notifs);
    });
  }

  getStoreId() {
    const nc = this;
    const lab = nc._opt.storage.label;
    const id = nc._id || 0;
    return `${lab}_${id}`;
  }

  enableRender() {
    const nc = this;
    nc._enable_render = true;
  }

  disableRender() {
    const nc = this;
    nc._enable_render = false;
  }
  clear() {
    const nc = this;
    if (nc.elContainer) {
      nc.elContainer.replaceChildren();
    }
  }
  isOpen() {
    const nc = this;
    return nc.panel.isActive();
  }
  open() {
    const nc = this;
    if (!nc.isOpen()) {
      nc.panel.open();
    }
  }
  close() {
    const nc = this;
    if (nc.isOpen()) {
      nc.panel.close();
    }
  }
  clearHistory() {
    const nc = this;
    nc.replaceItems([]);
    nc.clear();
  }

  remove() {
    const nc = this;
    nc._removed = true;
    nc.clear();
    if (isFunction(nc._opt.config.on.remove)) {
      nc._opt.config.on.remove(nc);
    }
    nc.panel.destroy();
  }

  destroy() {
    const nc = this;
    nc.remove();
    nc.removeHistory();
  }

  scroll() {
    const nc = this;
    clearTimeout(nc._scroll_timeout);
    nc._scroll_timeout = setTimeout(() => {
      nc.elContainer.scrollTop = nc.elContainer.scrollHeight;
    }, 100);
  }

  getElGroup(o) {
    const nc = this;
    let elGroup = document.getElementById(`nc_group_${o.idGroup}`);
    let elGroupContainer;
    if (!elGroup) {
      elGroupContainer = nc._el_group_container(o);
      nc.elContainer.appendChild(elGroupContainer);
      elGroup = document.getElementById(`nc_group_${o.idGroup}`);
    }
    return elGroup;
  }

  getElMerge(o) {
    const nc = this;
    let elMerge = document.getElementById(`nc_merge_${o.idGroup}_${o.idMerge}`);
    if (!elMerge) {
      const elGroup = nc.getElGroup(o);
      elMerge = nc._el_merge(o);
      elGroup.appendChild(elMerge);
    }
    return elMerge;
  }
  getElProgress(o) {
    const nc = this;
    let elProgress = document.getElementById(
      `nc_progress_${o.idGroup}_${o.idMerge}`,
    );
    if (!elProgress) {
      const elGroup = nc.getElGroup(o);
      elProgress = nc._el_progress(o);
      elGroup.appendChild(elProgress);
    }
    return elProgress;
  }
  idRandom() {
    return Math.random().toString(32).split(".")[1];
  }
  async notify(notif, opt) {
    try {
      const nc = this;
      if (nc._removed) {
        return;
      }
      const valid = nc.validateNotif(notif);
      if (!valid) {
        return console.warn("Invalid notification", notif);
      }

      notif.order = nc.incCount();

      if (!notif.id) {
        notif.id = nc.idRandom();
      }
      if (!notif.timestamp) {
        notif.timestamp = Date.now();
      }
      if (!notif.idGroup) {
        notif.idGroup = notif.id;
      }
      const options = Object.assign({}, { save: true, scroll: true }, opt);

      const resolver = {
        info: nc._handler_info,
        progress: nc._handler_progress,
        browser: nc._handler_browser,
        data: nc._handler_data.bind,
      }[notif.type];

      if (!resolver) {
        console.warn("resolver not found for", notif);
        return;
      }
      const conf = resolver(notif);

      if (conf.save && options.save) {
        const notifVisible = nc.panel.isActive();
        if (notifVisible) {
          notif.seen = true;
        }
        await nc.saveItem(notif);
      }
      if (conf.scroll) {
        nc.scroll();
      }
      if (!notif.seen) {
        nc.panel.showFlag();
      }
      if (conf.open) {
        nc.open();
      }
    } catch (e) {
      console.warn(e);
    }
  }

  async getUnseenCount() {
    const nc = this;
    let c = 0;
    const notifs = await nc.getItems();
    for (const notif of notifs) {
      if (!notif.seen) {
        c++;
      }
    }
    return c;
  }

  async setSeenAll() {
    const nc = this;
    const notifs = await nc.getItems();
    for (const notif of notifs) {
      notif.seen = true;
    }
    return nc.replaceItems(notifs);
  }

  validateNotif(notif) {
    const mendatory = ["type", "message"];
    const isObj = isObject(notif);
    return isObj && mendatory.reduce((a, k) => a && notif[k], true);
  }

  /**
   * Handlers
   */
  async _handler_browser(notif) {
    const nc = this;
    nc._handler_info(notif);
    const granted = await nc.hasNotifPermission();
    if (granted) {
      new Notification(notif.title, {
        body: notif.message,
        badge: nc._opt.ui.logo,
      });
    } else {
      console.warn("User refused notifications. Notif:", notif);
    }

    return {
      save: false,
      scroll: false,
      open: false,
    };
  }

  _handler_info(notif) {
    const nc = this;
    if (nc._enable_render) {
      const elMsg = nc._el_info(notif);
      const elGroup = nc.getElGroup(notif);
      elGroup.appendChild(elMsg);
      if (notif.idMerge) {
        const elMerge = nc.getElMerge(notif);
        if (elMerge.childElementCount <= nc._opt.items.maxMerge) {
          elMerge.appendChild(elMsg);
        }
      }
    }
    return {
      save: true,
      scroll: true,
      open: notif.open,
    };
  }

  _handler_progress(notif) {
    const nc = this;
    if (nc._enable_render) {
      const elProgress = nc.getElProgress(notif);
      const elBar = elProgress.querySelector(".nc-progress-bar");
      if (isEmpty(notif.value)) {
        notif.value = nc._progress_previous || 0;
      }
      nc._progress_previous = notif.value;
      elBar.style.width = `${notif.value}%`;
      const elMsg = elProgress.querySelector(".nc-progress-message");
      elMsg.innerHTML = notif.message || elMsg.innerHTML;
    }
    return {
      save: false,
      scroll: false,
      open: notif.open,
    };
  }

  _handler_data() {
    return {
      save: false,
      scroll: false,
      open: false,
    };
  }

  build() {
    const nc = this;
    nc.elMain = nc._el_main();
    nc.elContainer = nc._el_container();
    nc.elMain.appendChild(nc.elContainer);
    nc.panel.elPanelContent.appendChild(nc.elMain);
  }

  /**
   * Elements builder
   */
  _el_main() {
    const nc = this;
    return el(
      "div",
      {
        class: ["nc-main"],
      },
      el(
        "div",
        {
          class: ["nc-controls"],
        },
        el(
          "button",
          {
            type: "button",
            class: ["nc-button", "hint--bottom-left"],
            "aria-label": "Delete all",
            on: { click: nc.clearHistory },
          },
          el("i", {
            class: ["fa", "fa-trash"],
          }),
        ),
      ),
    );
  }

  _el_container() {
    return el("div", {
      class: ["nc-container"],
    });
  }

  _el_group_container(notif) {
    return el(
      "div",
      {
        class: ["nc-group-container"],
        style: {
          order: notif.order,
        },
      },
      el(
        "div",
        {
          class: ["nc-group-header"],
        },
        el(
          "span",
          {
            class: ["nc-group-date"],
          },
          new Date(notif.timestamp).toLocaleString(),
        ),
      ),
      el("div", {
        id: `nc_group_${notif.idGroup}`,
        class: ["nc-group"],
      }),
    );
  }

  _el_merge(notif) {
    return el(
      "details",
      {
        id: `nc_merge_${notif.idGroup}_${notif.idMerge}`,
        class: ["nc-merge"],
      },
      el("summary", tt("nc_label_merge")),
    );
  }

  _el_info(notif) {
    return el(
      "div",
      {
        id: notif.id,
        class: ["nc-notif", `nc-notif-info-${notif.level || "default"}`],
      },
      notif.message,
    );
  }

  _el_progress(notif) {
    return el(
      "div",
      {
        id: `nc_progress_${notif.idGroup}_${notif.idMerge}`,
        class: ["nc-notif", "nc-notif-progress"],
      },
      el(
        "div",
        {
          class: ["nc-progress-message"],
        },
        notif.message,
      ),
      el(
        "div",
        {
          class: ["nc-progress-bar-container"],
        },
        el("div", {
          class: ["nc-progress-bar"],
          style: {
            width: `${notif.value}%`,
          },
        }),
      ),
    );
  }
}
