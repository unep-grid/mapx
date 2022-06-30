import { randomString } from "#mapx/helpers";
/**
 * Unify notification for web socket and http write
 */
export { ioMwNotify, mwNotify };

/**
 * Io wraper
 */
function ioMwNotify(socket, next) {
  return mwNotify({}, socket, next);
}

/**
 * Notify mw
 */
function mwNotify(_, res, next) {
  let id = 0;
  const hasEmit = !!res.mx_emit;

  /**
   * Notify: progress, message, warning...
   * TODO: validate for each type
   * @param {Object} opt Options
   * @param {Numeric} opt.id Message id
   * @param {String} opt.idGroup Message group, e.g current request
   * @param {String} opt.idMerge Message merge similar message
   * @param {String} opt.type Type : data, info, progress, browser
   * @param {String} opt.level Type : success, error, warning, message, verbose
   * @param {String} opt.msg Message text
   * @param {Object} opt.data Additional data
   * @return {Promise<Boolean>} success
   */
  res.notify = (opt) => {
    const def = {
      id: id++,
      idGroup: randomString("mx_req", 2, 6, true),
      idMerge: null,
      type: "info", // data, info, progress, browser
      level: "message", // success, error, warning, message, verbose
      title: null,
      message: null,
      data: null,
      value: null,
      timestamp: new Date() * 1,
    };
    const out = {
      ...def,
      ...opt,
    };
    if (hasEmit) {
      return res.mx_emit("notify", out);
    }
    console.log(`[ notify ${out.type} ${out.level} ]`, out.message);
  };

  /**
   * Notification with data key set
   */
  res.notifyData = (opt) => {
    opt.type = "data";
    opt.level = "message";
    return res.notify(opt);
  };
  /**
   * Notification for progress, with value key set
   */
  res.notifyProgress = (opt) => {
    opt.type = "progress";
    opt.level = "message";
    return res.notify(opt);
  };
  /**
   * Notification for browser e.g. notification API
   */
  res.notifyBrowser = (opt) => {
    opt.type = "browser";
    opt.level = "message";
    return res.notify(opt);
  };
  /**
   * Notification info with level 'verbose'
   */
  res.notifyInfoVerbose = (opt) => {
    opt.type = "info";
    opt.level = "verbose";
    return res.notify(opt);
  };
  /**
   * Notification info with level 'message'
   */
  res.notifyInfoMessage = (opt) => {
    opt.type = "info";
    opt.level = "message";
    return res.notify(opt);
  };
  /**
   * Notification info with level 'warning'
   */
  res.notifyInfoWarning = (opt) => {
    opt.type = "info";
    opt.level = "warning";
    return res.notify(opt);
  };
  /**
   * Notification info with level 'message'
   */
  res.notifyInfoSuccess = (opt) => {
    opt.type = "info";
    opt.level = "success";
    return res.notify(opt);
  };
  /**
   * Notification info with level 'error'
   */
  res.notifyInfoError = (opt) => {
    opt.type = "info";
    opt.level = "error";
    return res.notify(opt);
  };

  next();
}
