import { moduleLoad } from "./../modules_loader_async/index.js";
import { isElement } from "./../is_test";
import { EventSimple } from "../event_simple/index.js";
import { getConfig } from "./utils.js";

const def = {
  target: null,
  type: "epsg",
  config: {},
};

export class SelectAuto extends EventSimple {
  constructor(opt, config) {
    super();
    const se = this;

    se._opt = { config: {} };

    if (isElement(opt)) {
      if (opt.tagName === "SELECT") {
        se._opt.target = opt;
      } else {
        se._opt.target = opt.querySelector("select");
      }
      se._opt.type = se._opt.target.dataset.type;
    } else {
      Object.assign(se._opt, def, opt);
    }

    if (config) {
      Object.assign(se._opt.config, config);
    }


    se.destroy = se.destroy.bind(se);
  }

  async init() {
    const se = this;
    if (se._init) {
      return;
    }
    se._init = true;
    await se.build();
    se.fire("init");
  }

  get value() {
    const se = this;
    se._tom.getValue();
  }

  set value(value) {
    const se = this;
    se._tom.setValue(value);
  }

  update() {
    const se = this;
    if (se._tom._update) {
      se._tom._update();
    }
  }

  destroy() {
    const se = this;
    if (se._destroyed) {
      return;
    }
    se._destroyed = true;
    if (se?._tom?.destroy) {
      se._tom.destroy();
    }
    se.fire("destroyed");
  }

  enable() {
    const se = this;
    se?._tom.enable();
  }

  disable() {
    const se = this;
    se?._tom.disable();
  }

  async build() {
    const se = this;
    const TomSelect = await moduleLoad("tom-select");
    const config = await getConfig(se._opt.type, se._opt.config);

    se._tom = new TomSelect(se._opt.target, config);

    /**
     * initialize is not always fired
     * -> not sure why
     * -> use timeout instead
     */
    const promInit = new Promise((resolve) => {
      se._tom.on("initialize", () => {
        resolve("init");
      });
    });

    const promTimeout = new Promise((resolve) => {
      setTimeout(() => {
        resolve("timeout");
      }, 100);
    });
    await Promise.race([promInit, promTimeout]);

    se._built = true;
    se.fire("built");
  }
}
