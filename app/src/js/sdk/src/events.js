/**
* Simple event management
* @example 
*     var e = new Events(); 
*     e.on('test',()=>{console.log('ok')});
*     e.fire('test') -> 'ok'
*      
*/
class Events {
  constructor() {
    this._on_cb = [];
  }
  fire(type) {
    var cbs = this._on_cb;
    var ncb = cbs.length;
    while (ncb) {
      var c = cbs[ncb-1];
      if (c.type === type) {
        c.cb();
        if (c.once) {
          cbs.splice(ncb, 1);
        }
      }
      ncb--;
    }
  }
  on(type, cb) {
    this._on_cb.push({
      type: type,
      cb: cb,
      once: false
    });
  }
  off(type, cb) {
    var cbs = this._on_cb;
    var ncb = cbs.length;
    while (ncb) {
      var c = cbs[ncb];
      if (c.type === type && c.cb === cb) {
        cbs.splice(ncb, 1);
      }
      ncb--;
    }
  }
  once(type, cb) {
    this._on_cb.push({
      type: type,
      cb: cb,
      once: true
    });
  }
}

export {Events};
