import {onNextFrame, cancelFrame} from '../animation_frame/index.js';
let idFrame = 0;
/**
 * Event management
 */
class ListenerStore {
  constructor() {
    this.listeners = [];
  }
  destroy() {
    this.removeAllListeners();
  }
  debounce(fun, bind) {
    return function(e) {
      cancelFrame(idFrame);
      idFrame = onNextFrame(() => {
        fun.bind(bind)(e);
      });
    };
  }
  addListener(opt) {
    let li = this;
    opt.target = opt.target || document.window;
    opt.debounce = opt.debounce === true;
    if (opt.debounce) {
      opt.listener = li.debounce(opt.listener, opt.bind || li);
    } else {
      opt.listener = opt.listener.bind(opt.bind || li);
    }
    opt.group = opt.group || 'default';
    li.listeners.push(opt);
    opt.type = opt.type instanceof Array ? opt.type : [opt.type];
    opt.type.forEach((t) => {
      opt.target.addEventListener(t, opt.listener);
    });
    return opt;
  }
  addListenerOnce(opt) {
    let li = this;
    let listener = opt.listener.bind(li);
    opt.listener = cb;
    li.addListener(opt);
    function cb(d) {
      li.removeListener(opt);
      listener(d);
    }
  }
  /**
   * @param {Object|Integer} index Listener index/indexition or listener object
   */
  removeListener(index) {
    let li = this;
    let isPos = isFinite(index);
    index = isPos ? index : li.listeners.indexOf(index);
    let opt = li.listeners[index];
    if(!opt){
     throw new Error('Listener not found');
    }
    li.listeners.splice(index, 1);
    opt.type = opt.type instanceof Array ? opt.type : [opt.type];
    opt.type.forEach((t) => {
      opt.target.removeEventListener(t, opt.listener);
    });
  }
  removeListenerByGroup(grp) {
    let li = this;
    li.getListenerByGroup(grp).forEach((l) => {
      li.removeListener(l);
    });
  }
  getListenerByGroup(grp) {
    let li = this;
    return li.listeners.filter((l) => l.group === grp);
  }
  removeAllListeners() {
    let li = this;
    let i = li.listeners.length - 1;
    while (i >= 0) {
      li.removeListener(i);
      i -= 1;
    }
  }
}

export {ListenerStore};
