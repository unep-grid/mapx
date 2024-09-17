import { isObject, isArray, isString, isEmpty } from "./../is_test/index.js";

export class EventSimple {
  constructor() {
    const evt = this;
    evt._cbs = [];
    evt._passthroughs = [];
  }

  /*
   * Events : fire handler
   *
   * @param {String | Object} type Event type or an object containing 'type' and 'data'
   * @param {Object} data Object to pass to the callback
   * @return {Promise<array>} array of returned values
   */
  async fire(type, data) {
    const evt = this;
    const res = [];

    // Handle the case where 'type' is an object with 'type' and 'data' properties
    if (isObject(type)) {
      data = type.data;
      type = type.type;
    }

    // Ensure 'type' is a non-empty string
    if (isEmpty(type) || !isString(type)) {
      throw new Error("Event 'type' must be a non-empty string.");
    }

    /**
     * Match type
     */
    let cL = evt._cbs.length;
    while (cL--) {
      const c = evt._cbs[cL];
      if (isEmpty(c?.type)) {
        continue;
      }
      const callbackTypes = isArray(c.type) ? c.type : [c.type];

      // Check if the callback's types include the event type
      if (callbackTypes.includes(type)) {
        // Pass the data and type to the callback
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
        }),
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

    // 'type' must be a non-empty string or a non-empty array of strings
    if (
      isEmpty(type) ||
      (!isArray(type) && !isString(type)) ||
      (isArray(type) && type.some((t) => isEmpty(t) || !isString(t)))
    ) {
      throw new Error("'type' must be a non-empty string or an array of non-empty strings.");
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

      // 'type' must be a non-empty string or a non-empty array of strings
      if (
        isEmpty(type) ||
        (!isArray(type) && !isString(type)) ||
        (isArray(type) && type.some((t) => isEmpty(t) || !isString(t)))
      ) {
        throw new Error("'type' must be a non-empty string or an array of non-empty strings.");
      }

      cb = cb || function () {};
      const cbProm = function (data, eventType) {
        resolve(data);
        return cb(data, eventType);
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

    // 'type' must be a non-empty string or a non-empty array of strings
    if (
      isEmpty(type) ||
      (!isArray(type) && !isString(type)) ||
      (isArray(type) && type.some((t) => isEmpty(t) || !isString(t)))
    ) {
      throw new Error("'type' must be a non-empty string or an array of non-empty strings.");
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
      const cType = isArray(c.type) ? c.type : [c.type];
      const typeToFind = isArray(type) ? type : [type];

      // Check if the types match, ignoring the order when they are arrays
      const typesMatch = this._typesMatch(cType, typeToFind);

      const found =
        typesMatch &&
        c.cb === cb &&
        (c.once === once || c.once === false) &&
        (c.group === group || c.group === "default");

      if (found) {
        return c;
      }
    }
    return false;
  }

  // Helper method to compare types, ignoring the order if both are arrays
  _typesMatch(a, b) {
    if (a.length !== b.length) return false;
    // If both are arrays, compare them ignoring order
    if (isArray(a) && isArray(b)) {
      const sortedA = [...a].sort();
      const sortedB = [...b].sort();
      return sortedA.every((value, index) => value === sortedB[index]);
    }
    // If not both arrays, compare as strings
    return a[0] === b[0];
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
