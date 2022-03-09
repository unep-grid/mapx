import {el} from './../el/src/index.js';
import {ButtonPanel} from '../button_panel';
import {bindAll} from '../bind_class_methods';
import localforage from 'localforage';
import {isFunction, isObject} from '../is_test/index.js';
import 'font-awesome/css/font-awesome.min.css';
import './style.less';

const def = {
  config: {
    id: null,
    on: {
      add: () => {},
      remove: () => {}
    }
  },
  ui: {
    mode: 'light',
    logo: require('./../../png/map-x-logo.png')
  },
  panel: {
    id: 'notif_center',
    elContainer: null,
    button_lang_key: 'nc_button',
    button_classes: ['fa', 'fa-bell'],
    tooltip_position: 'top-right',
    position: 'bottom-left',
    container_style: {
      minWidth: '470px',
      minHeight: '250px'
    }
  },
  items: {
    maxMerge: 20
  }
};

export class NotifCenter {
  constructor(opt) {
    const nc = this;
    bindAll(nc);
    nc.init(opt);
  }

  async init(opt) {
    try {
      const nc = this;
      nc.updateOptions(opt);
      nc.clear();
      nc.store = await nc.createStorage();

      /**
       * Panel button
       */

      if (!nc.panel) {
        nc.panel = new ButtonPanel(nc.opt.panel);
      }

      nc.restore();

      nc.panel.on('open', () => {
        nc.setSeenAll();
        nc.restore();
        nc.enableRender();
      });

      nc.panel.on('close', () => {
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
       * Set theme mode ( dark light )
       */

      nc.setMode(nc.opt.ui.mode);

      /**
       * Add callback
       */

      if (isFunction(nc.opt.config.on.add)) {
        nc.opt.config.on.add(nc);
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

  async createStorage() {
    const nc = this;
    return localforage.createInstance({
      name: `notif_center_${nc.opt.config.id}`
    });
  }
  updateOptions(opt) {
    const nc = this;
    const orig = nc.opt || def;
    nc.opt = Object.assign({}, orig, opt);
    Object.keys(orig).forEach((k) => {
      nc.opt[k] = Object.assign({}, orig[k], opt[k]);
    });
    if (!nc.opt.panel.elContainer) {
      throw new Error('No container found');
    }
  }

  async hasNotifPermission() {
    const nc = this;
    if (!nc._browser_notif_granted) {
      const perm = await Notification.requestPermission();
      nc._browser_notif_granted = perm === 'granted';
    }
    return nc._browser_notif_granted === true;
  }

  async restore() {
    const nc = this;
    nc.clear();
    const notifs = [];
    await nc.store.iterate((notif) => {
      notifs.push(notif);
    });

    notifs.sort((a, b) => a.timestamp - b.timestamp);
    notifs.forEach((notif) => {
      nc.notify(notif, {save: false, scroll: false});
    });
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
    nc.setSeenAll();
    if (nc.elContainer) {
      nc.elContainer.innerHTML = '';
    }
  }

  clearHistory() {
    const nc = this;
    nc.store.clear();
    nc.clear();
  }

  remove() {
    const nc = this;
    nc._removed = true;
    nc.clear();
    if (isFunction(nc.opt.config.on.remove)) {
      nc.opt.config.on.remove(nc);
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
    nc.elContainer.scrollTop = nc.elContainer.scrollHeight;
  }

  setMode(mode) {
    const nc = this;
    nc._mode_dark = mode === 'dark';
    if (nc._mode_dark) {
      nc.elMain.classList.add(`nc-dark`);
    } else {
      nc.elMain.classList.remove(`nc-dark`);
    }
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
      `nc_progress_${o.idGroup}_${o.idMerge}`
    );
    if (!elProgress) {
      const elGroup = nc.getElGroup(o);
      elProgress = nc._el_progress(o);
      elGroup.appendChild(elProgress);
    }
    return elProgress;
  }
  idRandom() {
    return Math.random()
      .toString(32)
      .split('.')[1];
  }
  async notify(notif, opt) {
    try {
      const nc = this;
      if (nc._removed) {
        return;
      }
      const valid = nc.validateNotif(notif);
      if (!valid) {
        return console.warn('Invalid notification');
      }
      if (!notif.id) {
        notif.id = nc.idRandom();
      }
      if (!notif.timestamp) {
        notif.timestamp = Date.now();
      }
      if (!notif.idGroup) {
        notif.idGroup = notif.id;
      }
      const options = Object.assign({}, {save: true, scroll: true}, opt);
      const resolver = {
        info: nc._handler_info,
        progress: nc._handler_progress,
        browser: nc._handler_browser,
        data: nc._handler_data
      }[notif.type];
      if (resolver) {
        const conf = resolver(notif);

        if (conf.save && options.save) {
          if (nc.panel.isActive()) {
            notif.seen = true;
          }
          await nc.store.setItem(`${notif.idGroup}_${notif.id}`, notif);
        }
        if (options.scroll) {
          nc.scroll();
        }
        if (!notif.seen) {
          nc.panel.showFlag();
        }
      } else {
        console.warn('resolver not found for', notif);
      }
    } catch (e) {
      console.warn(e);
    }
  }

  async getUnseenCount() {
    const nc = this;
    let c = 0;
    await nc.store.iterate((notif) => {
      if (!notif.seen) {
        c++;
      }
    });
    return c;
  }

  async setSeenAll() {
    const nc = this;
    return nc.store.iterate((notif, key) => {
      notif.seen = true;
      nc.store.setItem(key, notif);
    });
  }

  validateNotif(notif) {
    const mendatory = ['type', 'message'];
    const isObj = isObject(notif);
    return isObj && mendatory.reduce((a, k) => a && notif[k], true);
  }

  /**
   * Handlers
   */
  async _handler_browser(notif) {
    const nc = this;
    nc._handler_info(notif);
    if (await nc.hasNotifPermission()) {
      new Notification(notif.title, {
        body: notif.message,
        icon: nc.opt.ui.logo
      });
    }
    return {
      save: false
    };
  }

  _handler_info(notif) {
    const nc = this;
    if (nc._enable_render) {
      const elMsg = nc._el_info(notif);
      if (notif.idMerge) {
        const elMerge = nc.getElMerge(notif);
        if (elMerge.childElementCount <= nc.opt.items.maxMerge) {
          elMerge.appendChild(elMsg);
        }
      } else {
        const elGroup = nc.getElGroup(notif);
        elGroup.appendChild(elMsg);
      }
    }
    return {
      save: true
    };
  }

  _handler_progress(notif) {
    const nc = this;
    if (nc._enable_render) {
      const elProgress = nc.getElProgress(notif);
      const elBar = elProgress.querySelector('.nc-progress-bar');
      if (notif.value) {
        elBar.style.width = `${notif.value}%`;
      }
      const elMsg = elProgress.querySelector('.nc-progress-message');
      elMsg.innerHTML = notif.message || elMsg.innerHTML;
    }
    return {
      save: true
    };
  }

  _handler_data() {
    return {
      save: false
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
      'div',
      {
        class: ['nc-main']
      },
      el(
        'div',
        {
          class: ['nc-controls']
        },
        el(
          'button',
          {
            type: 'button',
            class: ['nc-button', 'hint--bottom-left'],
            'aria-label': 'Delete all',
            on: {click: nc.clearHistory}
          },
          el('i', {
            class: ['fa', 'fa-trash']
          })
        )
      )
    );
  }

  _el_container() {
    return el('div', {
      class: ['nc-container']
    });
  }

  _el_group_container(notif) {
    return el(
      'div',
      {
        class: ['nc-group-container']
      },
      el(
        'div',
        {
          class: ['nc-group-header']
        },
        el(
          'span',
          {
            class: ['nc-group-date']
          },
          new Date(notif.timestamp).toLocaleString()
        )
      ),
      el('div', {
        id: `nc_group_${notif.idGroup}`,
        class: ['nc-group']
      })
    );
  }

  _el_merge(notif) {
    return el('div', {
      id: `nc_merge_${notif.idGroup}_${notif.idMerge}`,
      class: ['nc-merge']
    });
  }

  _el_info(notif) {
    return el(
      'div',
      {
        id: notif.id,
        class: ['nc-notif', `nc-notif-info-${notif.level || 'default'}`]
      },
      notif.message
    );
  }

  _el_progress(notif) {
    return el(
      'div',
      {
        id: `nc_progress_${notif.idGroup}_${notif.idMerge}`,
        class: ['nc-notif', 'nc-notif-progress']
      },
      el(
        'div',
        {
          class: ['nc-progress-message']
        },
        notif.message
      ),
      el(
        'div',
        {
          class: ['nc-progress-bar-container']
        },
        el('div', {
          class: ['nc-progress-bar'],
          style: {
            width: `${notif.value}%`
          }
        })
      )
    );
  }
}
