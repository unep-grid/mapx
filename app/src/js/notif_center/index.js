import {el} from '@fxi/el';
import {ButtonPanel} from '../button_panel';
import {bindAll} from '../bind_class_methods';
import localforage from 'localforage';
import {isFunction, isObject} from '../is_test/index.js';
import 'font-awesome/css/font-awesome.min.css';
import './style.css';

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
    logo:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HgAGgwJ/lK3Q6wAAAABJRU5ErkJggg=='
  },
  panel: {
    panelFull: true,
    elContainer: document.body,
    button_text: '',
    button_lang_key: 'button_notif_center',
    button_classes: ['fa', 'fa-bell'],
    position: 'bottom-right',
    container_style: {minWidth: '500px'},
    title_text: 'Notifications',
    title_lang_key: 'nc_title'
  },
  items: {
    maxMerge: 20
  }
};

export class NotifCenter {
  constructor(opt) {
    const nc = this;
    nc.opt = Object.assign({}, opt);

    Object.keys(def).forEach((k) => {
      nc.opt[k] = Object.assign({}, def[k], opt[k]);
    });
    bindAll(nc);
    nc.init();
  }
  async init() {
    const nc = this;
    if (nc._init) {
      return;
    }
    nc._init = true;
    nc.store = await localforage.createInstance({
      name: 'notif_center_' + nc.opt.config.id
    });
    nc.panel = new ButtonPanel(nc.opt.panel);
    nc.build();
    nc.setMode(nc.opt.ui.mode);

    nc.panel.on('open', () => {
      nc.setSeenAll();
      nc.restore();
      nc.enableRender();
    });
    nc.panel.on('close', () => {
      nc.clear();
      nc.disableRender();
    });
    if (isFunction(nc.opt.config.on.add)) {
      nc.opt.config.on.add(nc);
    }
    let nUnseen = await nc.getUnseenCount();
    if (nUnseen > 0) {
      nc.panel.showFlag();
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
    nc.elContainer.innerHTML = '';
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
      if (!notif.id) {
        notif.id = nc.idRandom();
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
    let c = 0;
    const nc = this;
    return nc.store.iterate((notif, key) => {
      if (!notif.seen) {
        c++;
      }
      notif.seen = true;
      nc.store.setItem(key, notif);
    });
  }

  validateNotif(notif) {
    const mendatory = ['id', 'idGroup', 'type', 'msg'];
    const isObj = isObject(notif);
    const isNotEmpty =
      isObj &&
      mendatory.reduce((a, k) => {
        return !a ? false : !!notif[k];
      }, false);
    return isObj && isNotEmpty;
  }

  /**
   * Handlers
   */
  async _handler_browser(notif) {
    const nc = this;
    if (await nc.hasNotifPermission()) {
      const notification = new Notification(notif.title, {
        body: notif.msg,
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
      let save = true;
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
      elMsg.innerHTML = notif.msg || elMsg.innerHTML;
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
      notif.msg
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
        notif.msg
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
