import {Logger} from './logger';

/**
 * Logger object
 */
window.logger = null;

/**
 * Init log
 */
export function initLog() {
  const h = mx.helpers;

  if (!window.logger) {
    window.logger = new Logger({
      url: h.getApiUrl('collectLogs'),
      timeCollect: 15000,
      baseForm: {},
      validate: formatValidateLog
    });
  }

  /**
   * On session start
   */
  mx.events.on({
    type: 'session_start',
    idGroup: 'mx_log',
    callback: () => {
      logger.add({
        id_log: 'session_start',
        data: {}
      });
      /*
       * Force collect
       */
      logger.collect();
    }
  });

  /**
   * On session end
   */
  mx.events.on({
    type: 'session_end',
    idGroup: 'mx_log',
    callback: () => {
      logger.add({
        id_log: 'session_end',
        data: {}
      });
      /*
       * Force collect
       */
      logger.collect();
    }
  });

  /**
   * On lang change
   */
  mx.events.on({
    type: 'language_change',
    idGroup: 'mx_log',
    callback: (d) => {
      logger.add({
        id_log: 'language_change',
        data: d
      });
    }
  });

  /**
   * On project change
   */
  mx.events.on({
    type: 'project_change',
    idGroup: 'mx_log',
    callback: (d) => {
      logger.add({
        id_log: 'project_change',
        data: d
      });
    }
  });

  /**
   * On session end
   */
  mx.events.on({
    type: 'view_added',
    idGroup: 'mx_log',
    callback: (d) => {
      if (h.isViewId(d.idView)) {
        logger.add({
          id_log: 'view_add',
          data: {
            id_view: d.idView
          }
        });
      }
    }
  });

  /**
   * On view removed
   */
  mx.events.on({
    type: 'view_removed',
    idGroup: 'mx_log',
    callback: (d) => {
      if (h.isViewId(d.idView) && d.duration > 0) {
        logger.add({
          id_log: 'view_remove',
          data: {
            id_view: d.idView,
            view_duration_seconds: d.duration / 1000
          }
        });
      }
    }
  });

  /**
   * On view panel click
   */
  mx.events.on({
    type: 'view_panel_click',
    idGroup: 'mx_log',
    callback: (d) => {
      logger.add({
        id_log: 'view_panel_click',
        data: {
          id_view: d.idView,
          id_action: d.idAction
        }
      });
    }
  });
}

/**
 * Update and validate log
 * @param {Object} log Log object.
 * @param {Object} log.data data
 * @param {String} log.level log level (in mx.settings.logs.levels)
 * @param {String} log.side log side (in mx.settings.logs.sides)
 * @param {String} log.id_log log id (in mx.settings.logs.ids)
 */
function formatValidateLog(log) {
  const s = mx.settings.logs;
  if (s.disabled) {
    /**
     * User should be able to disable logs (e.g. in a cookie);
     */
    return false;
  }
  /**
   * Set default
   */
  let def = {
    id_user: mx.settings.user.id,
    id_project: mx.settings.project,
    is_guest: mx.settings.user.guest === true,
    side: 'browser',
    level: 'USER_ACTION'
  };

  /**
   * Update log input with default
   */
  def = Object.assign({}, def, log);
  Object.assign(log, def);

  /**
   * Validate
   */
  var isValid =
    log instanceof Object &&
    log.data instanceof Object &&
    s.levels.indexOf(log.level) > -1 &&
    s.sides.indexOf(log.side) > -1 &&
    s.ids.indexOf(log.id_log) > -1;
  return isValid;
}
