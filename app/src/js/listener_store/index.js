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
    if(opt.debounce){
      opt.listener = li.debounce(opt.listener, opt.bind || li);
    }else{
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
  removeListener(opt) {
    let li = this;
    let pos = li.listeners.indexOf(opt);
    if (pos > -1) {
      li.listeners.splice(pos, 1);
      opt.type = opt.type instanceof Array ? opt.type : [opt.type];
      opt.type.forEach((t) => {
        opt.target.removeEventListener(t, opt.listener);
      });
    }
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
    li.listeners.forEach((opt) => {
      li.removeListener(opt);
    });
  }
}

export {ListenerStore};
