import { PixOp } from "./pixop.js";
import { onNextFrame, cancelFrame } from "./../animation_frame/index.js";

const opt_default = {
  enabled: () => {
    return false;
  },
  nLayersOverlap: () => {
    return 0;
  },
  calcArea: () => {
    return false;
  },
  map: null,
  onRendered: function (d) {
    console.log(d);
  },
  onRender: function (d) {
    console.log(d);
  },
  onCalcArea: function (d) {
    console.log(d);
  },
  onProgress: function () {
    console.log(d);
  },
  idFrame: 0,
};

class Spotlight {
  constructor(opt) {
    const sl = this;
    sl.init(opt);
    sl.render = sl.render.bind(sl);
    sl._destroyed = false;
  }

  init(opt) {
    const sl = this;
    sl.setState(opt);
    sl.pixop = new PixOp({
      map: sl.state.map,
      onCalcArea: sl.state.onCalcArea,
      onRendered: sl.state.onRendered,
      onRender: sl.state.onRender,
      onProgress: sl.state.onProgress,
    });
  }

  destroy() {
    const sl = this;
    if (sl.isDestroyed()) {
      return;
    }
    sl.pixop.destroy();
    sl._destroyed = true;
  }
  isDestroyed() {
    return this._destroyed === true;
  }

  setState(opt) {
    this.state = Object.assign({}, opt_default, opt);
  }

  getResolution() {
    return this.pixop.getResolution();
  }

  render() {
    const sl = this;
    cancelFrame(sl.state.idFrame);

    if (!sl.state.enabled()) {
      return;
    }

    sl.state.idFrame = onNextFrame(() => {
      sl.pixop.render({
        mode: "spotlight",
        debug: false,
        overlap: {
          nLayersOverlap: sl.state.nLayersOverlap() || 0,
          calcArea: sl.state.calcArea(),
          threshold: 127,
        },
        canvas: {
          scale: window.devicePixelRatio === 2 ? 1 : 2,
          add: true,
          spotlightRadius: 30, // Size of the rendered spotlight
          lineWidth: 35,
        },
      });
    });
    this.state.rendered = true;
  }

  clear() {
    this.pixop.clear();
    this.state.rendered = false;
  }

  toggle() {
    let sl = this;
    if (sl.state.rendered) {
      sl.clear();
    } else {
      sl.render();
    }
  }
}
export { Spotlight };
