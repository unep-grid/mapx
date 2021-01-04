import {NotifCenter} from './notif_center/';

export function initListenerNotificationCenter() {
  const h = mx.helpers;
  /**
   * Init notifiation control
   */
  h.initNotification();
  mx.events.on({
    type: ['settings_user_change'],
    idGroup: 'notif',
    callback: () => {
      h.initNotification();
    }
  });
}

export async function initNotification() {
  if (mx.nc instanceof NotifCenter) {
    mx.nc.remove();
  }

  const logo = require('../png/map-x-logo.png');

  mx.nc = new NotifCenter({
    config: {
      id: mx.settings.user.id,
      on: {
        add: (nc) => {
          mx.theme.on('mode_changed', nc.setMode);
        },
        remove: (nc) => {
          mx.theme.off('mode_changed', nc.setMode);
        }
      }
    },
    panel: {
      title_text: 'Notifications',
      title_lang_key: 'nc_title',
      position: 'bottom-left',
      elContainer: document.body,
      container_style: {
        width: '480px'
      }
    },
    ui: {
      logo: logo,
      mode: mx.theme.mode
    }
  });
}

/**
 * Binding to notify from shiny
 * @param {Object} opt Options
 * @param {Object} opt.notif Notification object
 */
export async function shinyNotify(opt) {
  if (mx.nc instanceof NotifCenter) {
    mx.nc.notify(opt.notif);
  }
}
