
export class EventSimple {
  constructor() {
    this._cbs = {};
  }

  on(id, cb) {
    if (!this._cbs[id]) {
      this._cbs[id] = [];
    }
    this._cbs[id].push(cb);
  }

  fire(id, data) {
    for (const cb of this._cbs[id]) {
      cb(data);
    }
  }

  off(id, cb) {
    let p = this._cbs[id].length;
    while (p--) {
      if (cb === this._cbs[id][p]) {
        this._cbs[id].splice(p, 1);
      }
    }
  }
}
