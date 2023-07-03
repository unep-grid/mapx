import { isObject, isArray } from "./../is_test/index.js";
export class EventSimple {
  constructor() {
    const evt = this;
    evt._cbs = [];
    evt._passthroughs = [];
  }

  /*
   * Events : fire handler
   *
   * @param {String | Object} type Even type
   * @param {Object} data Object to pass to the callback
   * @return {Promise<array>} array of returned values
   */
  async fire(type, data) {
    const evt = this;
    const res = [];
    if (isObject(type)) {
      data = type.data;
      type = type.type;
    }

    /**
     * Match type
     * NOTE: using while, as classes based on EventSimple can
     * request 'destroy' cb, which can be registered before
     * other "on destroy" cb.
     */
    let cL = evt._cbs.length;
    while (cL--) {
      const c = evt._cbs[cL];
      if (!c?.type) {
        continue;
      }
      const t = isArray(c.type) ? c.type : [c.type];
      if (t.includes(type)) {
        res.push(await c.cb(data, type));
        if (c.once) {
          evt._rm(c);
        }
      }
    }

    /**
     * Pass all events
     */
    for (const p of evt._passthroughs) {
      res.push(
        await p.cb({
          type: type,
          data: data,
        })
      );
    }
    return res;
  }

  on(type, cb, group, once) {
    const evt = this;
    if (isObject(type)) {
      once = type.once || once;
      cb = type.cb || type.callback || cb;
      group = type.idGroup || type.group || group;
      type = type.type;
    }
    const exists = !!evt._find(type, cb, group, once);
    if (!exists) {
      evt._cbs.push({
        type: type,
        cb: cb,
        once: once || false,
        group: group || "default",
      });
    }
  }
  addPassthrough(opt) {
    const evt = this;
    opt = Object.assign({}, opt);
    if (opt.cb) {
      evt._passthroughs.push(opt);
    }
  }
  once(type, cb, group) {
    const evt = this;
    return new Promise((resolve) => {
      if (isObject(type)) {
        cb = type.cb || type.callback || cb;
        group = type.idGroup || type.group || group;
        type = type.type;
      }
      cb = cb || function () {};
      const cbProm = function (d) {
        resolve(d);
        return cb(d);
      };

      evt.on(type, cbProm, group, true);
    });
  }
  off(type, cb, group, once) {
    const evt = this;
    if (isObject(type)) {
      once = type.once || once;
      cb = type.cb || type.callback || cb;
      group = type.idGroup || type.group || group;
      type = type.type;
    }
    const item = evt._find(type, cb, group, once);
    if (item) {
      evt._rm(item);
    }
  }
  offGroup(group) {
    const evt = this;
    const items = evt._find_group(group);
    for (const c of items) {
      evt._rm(c);
    }
  }
  destroy() {
    const evt = this;
    evt.clearCallbacks();
  }
  clearCallbacks() {
    const evt = this;
    evt._passthroughs.length = 0;
    evt._cbs.length = 0;
  }
  _rm(item) {
    const evt = this;
    const id = evt._cbs.indexOf(item);
    if (id > -1) {
      evt._cbs.splice(id, 1);
    }
  }
  _find(type, cb, group, once) {
    const evt = this;
    for (const c of evt._cbs) {
      const found =
        c.type === type &&
        c.cb === cb &&
        (c.once === once || c.once === false) &&
        (c.group === group || c.group === "default");

      if (found) {
        return c;
      }
    }
    return false;
  }
  _find_group(group) {
    const found = [];
    const evt = this;
    for (const c of evt._cbs) {
      const f = c.group === group;
      if (f) {
        found.push(c);
      }
    }
    return found;
  }
}
