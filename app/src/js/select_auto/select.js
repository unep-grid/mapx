import { moduleLoad } from "./../modules_loader_async/index.js";
import { isElement } from "./../is_test";
import { EventSimple } from "../event_simple/index.js";
import { clone } from "../mx_helper_misc.js";

const def = {
  target: null,
  type: "epsg",
  config: {},
};

export class SelectAuto extends EventSimple {
  constructor(opt, config) {
    super();
    const se = this;
    se._opt = Object.assign({}, def, opt);

    if (isElement(opt)) {
      se._opt.target = opt.querySelector("select");
      se._opt.type = se._opt.target.dataset.type;
    }

    if (config) {
      Object.assign(se._opt.config, config);
    }

    se.destroy = se.destroy.bind(se);
    se.init().catch(console.error);
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
    const config = await se.loadConfig(se._opt.type);
    Object.assign(config, se._opt.config);
    se._tom = new TomSelect(se._opt.target, config);

    return new Promise((resolve) => {
      /*
       *
       * -> bug, doesn't work ...
       *
       * se._tom.on("initialize", () => {
       *  resolve(true);
       * });
       */
      setTimeout(() => {
        se._built = true;
        se.fire("built");
        resolve(true);
      }, 1000);
    });
  }

  async loadConfig(type) {
    switch (type) {
      case "epsg":
        const epsg = await import("./resolvers/epsg.js");
        return clone(epsg.config);
      case "format_vector_download":
        const format = await import("./resolvers/format_vector_download.js");
        return clone(format.config);
      case "countries":
        const countries = await import("./resolvers/countries.js");
        return clone(countries.config);
      case "sources_list":
        const sourcesList = await import("./resolvers/sources_list.js");
        return clone(sourcesList.config);
      default:
        null;
    }
    return {};
  }
}
