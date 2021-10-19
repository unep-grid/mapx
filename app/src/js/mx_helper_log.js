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
  const isStatic = mx.settings.mode.static === true;
  if (!window.logger) {
    window.logger = new Logger({
      //url: h.getApiUrl('collectLogs'),
      url: 'http://apidev.mapx.localhost:8880/collect/logs/',
      timeCollect: 15000,
      baseForm: {},
      validate: formatValidateLog
    });
  }

  /**
   * On view added
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

  if (!isStatic) {
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
  const h = mx.helpers;
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
  const isStatic = mx.settings.mode.static === true;
  const def = {
    is_static: isStatic,
    is_guest: isStatic || mx.settings.user.guest === true,
    id_user: mx.settings.user.id,
    id_project: mx.settings.project.id,
    side: 'browser',
    level: 'USER_ACTION'
  };

  /**
   * Update log input with default
   */
  h.updateIfEmpty(log, def);

  /**
   * Soft validate
   * TODO: use the schema from api's side : api/modules/schema/api_logs.json
   */
  const isValid =
    log instanceof Object &&
    log.data instanceof Object &&
    s.levels.includes(log.level) &&
    s.sides.includes(log.side) &&
    s.ids.includes(log.id_log);
  return isValid;
}
