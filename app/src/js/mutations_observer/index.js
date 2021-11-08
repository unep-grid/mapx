
export class ObserveMutationAttribute {
  constructor(opt) {
    const oa = this;
    oa.init(opt);
    oa.setCb = oa.setCb.bind(oa);
  }
  init(opt) {
    const oa = this;
    if (oa._init) {
      return;
    }
    oa._init = true;
    oa._opt = opt;
    oa._el = opt.el;
    oa._observer = new MutationObserver((mts) => {
      for (const mt of mts) {
        if (mt.type === 'attributes' || mt.type === 'childList') {
          oa.onMutation();
        }
      }
    });
    oa._observer.observe(oa._el, {attributes: true, childList: true});
  }
  destroy() {
    const oa = this;
    oa._observer.disconnect();
    oa._destroyed = true;
  }
  setCb(fun) {
    const oa = this;
    console.log('setCb',fun);
    oa._opt.cb = fun;
  }
  onMutation() {
    const oa = this;
    if (oa._destroyed) {
      return;
    }
    if (oa._opt.cb instanceof Function) {
      oa._opt.cb(oa.el);
    }
  }
}
