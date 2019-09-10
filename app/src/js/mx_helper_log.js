/**
 * MapX log
 * @param {String} level Log level : ERROR, WARNING, MESSAGE, LOG, USER_ACTION
 * @param {Object} opt Options
 * @param {String} opt.kind Log kind : log, error, warning, info, etc.
 * @param {String} opt.from From which part of the app the log comes ? "browser", "app", "api"
 * @param {String} opt.what What happenning ? Code of the action : "views_panel_click", ..
 * @param {Integer} opt.time What time ? Time in posix
 * @param {Integer} opt.user Which user id ? 1
 * @param {String} opt.guest Is guest user ?
 * @param {Object} opt.data Additional data related.
 */
export function dbLog(level, opt) {
  var logLevelsAll = mx.settings.dbLogLevelsAll;
  var logLevel = mx.settings.dbLogLevels;
  var hasShiny = !!window.Shiny;
  var logValid = logLevelsAll.indexOf(level) > -1;
  var logActivated = logLevel.indexOf(level) > -1;
  var logDetailsAreValid = mx.helpers.isObject(opt) && opt.id_log;

  if (!logValid) {
    throw new Error('Missing log level');
  }
  if (!logActivated) {
    console.warn('Log ignored');
  }
  if (!logDetailsAreValid) {
    throw new Error('missing log details');
  }

  var dataDef = {};
  var log = {};
  var def = {
    level: level,
    side: 'browser',
    id_log: null,
    id_user: mx.settings.user.id,
    is_guest: mx.settings.user.guest,
    id_project: mx.settings.project,
    data: dataDef
  };

  Object.keys(def).forEach((k) => {
    log[k] = opt[k] || def[k];
  });

  if (!hasShiny) {
    Shiny.onInputChange('dbLogger', log);
  }
}

export function initLog() {
  /**
   * Register listener
   */
  mx.events.on({
    type: 'view_add',
    idGroup: 'mx_log',
    callback: logViewAdd
  });
  mx.events.on({
    type: 'view_remove',
    idGroup: 'mx_log',
    callback: logViewRemove
  });
  mx.events.on({
    type: 'view_panel_click',
    idGroup: 'mx_log',
    callback: logPanelClick
  });

  function logViewAdd(d) {
    mx.helpers.dbLog('USER_ACTION', {
      id_log: 'view_add',
      data: {
        id_view: d.idView
      }
    });
  }

  function logViewRemove(d) {
    mx.helpers.dbLog('USER_ACTION', {
      id_log: 'view_remove',
      data: {
        id_view: d.idView,
        view_duration_seconds: d.viewDuration / 1000 || 0
      }
    });
  }

  function logPanelClick(d) {
    mx.helpers.dbLog('USER_ACTION', {
      id_log: 'view_panel_click',
      data: {
        id_view: d.idView,
        id_action: d.idAction
      }
    });
  }
}
