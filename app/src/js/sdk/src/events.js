/**
 * Simple event management
 * @example
 *     var e = new Events();
 *     e.on('test',()=>{console.log('ok')});
 *     e.fire('test') -> 'ok'
 *
 */
class Events {
  /**
   * new Event handler
   */
  constructor() {
    this._emitter = "generic";
    this._on_cb = [];
  }
  /**
   * Fire callback based on type
   * @param {String} type Type of callback to fire
   */
  fire(type, data) {
    var cbs = this._on_cb;
    var ncb = cbs.length;
    while (ncb) {
      var c = cbs[ncb - 1];
      if (c.type === type) {
        if (c.once) {
          cbs.splice(ncb - 1, 1);
        }
        c.cb(data);
      }
      ncb--;
    }
  }
  /**
   * Register new callback by type
   * @param {String} type Type of callback to be evaluated when fired
   * @param {Function} cb Callback
   */
  on(type, cb) {
    this._on_cb.push({
      type: type,
      cb: cb,
      once: false,
    });
  }

  /**
   * Unregister callback by type
   * @param {String} type Type of callback
   * @param {Function} cb Callback
   */
  off(type, cb) {
    var cbs = this._on_cb;
    var ncb = cbs.length;
    while (ncb--) {
      var c = cbs[ncb];
      if (c.type === type && c.cb === cb) {
        cbs.splice(ncb, 1);
      }
    }
  }
  /**
   * Register a callback only and remove it after the first evaluation
   * @param {String} type Type of callback to be evaluated when fired
   * @param {Function} cb Callback
   * @return {Promise<any>} alternative promise based cb
   */
  once(type, cb) {
    const evt = this;
    if (!cb) {
      // in case using as await once("<type>",<empty cb>);
      cb = () => {};
    }
    return new Promise((resolve) => {
      const cbr = (data) => {
        cb(data);
        resolve(data);
      };
      evt._on_cb.push({
        type: type,
        cb: cbr,
        once: true,
      });
    });
  }
}

export { Events };
