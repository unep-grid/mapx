const {toRes, randomString, asyncDelay} = require('@mapx/helpers');

/**
 * Unify notification for web socket and http write
 */
module.exports.mwNotify = function(io) {
  let id = 0;
  return (req, res, next) => {
    const idRequest = randomString('mx_req', 2, 6, true);
    let idSocket = req.body ? req.body.idSocket : req.query.idSocket;

    /**
     * Generic to emit
     */
    res.wsEmitTo = async (type, msg) => {
      try {
        if (!idSocket) {
          return;
        }
        await asyncDelay(1);
        io.to(idSocket).emit(type, msg);
        await asyncDelay(1);
      } catch (e) {
        console.warn('catched in wsEmitTo:', e);
      }
    };
    /*
     * Async write
     */
    res.writeAsync = async (msg) => {
      try {
        await asyncDelay(1);
        res.write(toRes(msg));
        await asyncDelay(1);
      } catch (e) {
        console.warn('catched in writeAsync:', e);
      }
    };

    /**
     * Notify: progress, message, warning...
     * TODO: validate for each type
     * @param {String} ioType Event type
     * @param {Object} opt Options
     * @param {Numeric} opt.id Message id
     * @param {String} opt.idGroup Message group, e.g current request
     * @param {String} opt.idMerge Message merge similar message
     * @param {String} opt.type Type : start, info, progress, data, success..
     * @param {String} opt.level Type : message, warning, verbose, error ...
     * @param {String} opt.msg Message text
     * @param {Object} opt.data Additional data
     */
    res.notify = async (ioType, opt) => {
      const def = {
        id: id++,
        idGroup: idRequest,
        idMerge: null,
        type: 'info',
        level: 'verbose',
        title: null,
        message: null,
        data: null,
        value: null,
        timestamp: new Date() * 1
      };
      const out = Object.assign({}, def, opt);
      if (idSocket) {
        await res.wsEmitTo(ioType, out);
      }
      return res.writeAsync(out);
    };

    /**
     * Notification with data key set
     */
    res.notifyData = (ioType, opt) => {
      opt.type = 'data';
      return res.notify(ioType, opt);
    };
    /**
     * Notification for progress, with value key set
     */
    res.notifyProgress = (ioType, opt) => {
      opt.type = 'progress';
      return res.notify(ioType, opt);
    };
    /**
     * Notification for browser
     */
    res.notifyBrowser = (ioType, opt) => {
      opt.type = 'browser';
      return res.notify(ioType, opt);
    };
    /**
     * Notification info with level 'verbose'
     */
    res.notifyInfoVerbose = (ioType, opt) => {
      opt.type = 'info';
      opt.level = 'verbose';
      return res.notify(ioType, opt);
    };
    /**
     * Notification info with level 'message'
     */
    res.notifyInfoMessage = (ioType, opt) => {
      opt.type = 'info';
      opt.level = 'message';
      return res.notify(ioType, opt);
    };
    /**
     * Notification info with level 'message'
     */
    res.notifyInfoSuccess = (ioType, opt) => {
      opt.type = 'info';
      opt.level = 'success';
      return res.notify(ioType, opt);
    };
    /**
     * Notification info with level 'error'
     */
    res.notifyInfoError = (ioType, opt) => {
      opt.type = 'info';
      opt.level = 'error';
      return res.notify(ioType, opt);
    };
    /**
     * Notification info with level 'warning'
     */
    res.notifyInfoWarning = (ioType, opt) => {
      opt.type = 'info';
      opt.level = 'warning';
      return res.notify(ioType, opt);
    };

    next();
  };
};
