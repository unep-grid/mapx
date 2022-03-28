import { moduleLoad } from "./../modules_loader_async/index.js";
import { isElement } from "./../is_test";
import { EventSimple } from "../event_simple/index.js";

const def = {
  target: null,
  type: "epsg",
};

export class SelectAuto extends EventSimple {
  constructor(opt) {
    super();
    const se = this;
    if (isElement(opt)) {
      const target = opt.querySelector("select");
      const type = target.dataset.type;
      se._opt = { target, type };
    } else {
      se._opt = Object.assign({}, def, opt);
    }
    se.destroy = se.destroy.bind(se);
    se.init().catch(console.error);
  }

  async init() {
    const se = this;
    await se.build();
    se.fire("init");
    se._init = true;
  }

  destroy() {
    const se = this;
    if (se._destroyed) {
      return;
    }
    se._destroyed = true;
    se._tom.destroy();
    se.fire("destroyed");
  }

  async build() {
    const se = this;
    const TomSelect = await moduleLoad("tom-select");
    const config = await se.loadConfig(se._opt.type);
    return new Promise((resolve) => {
      se._tom = new TomSelect(se._opt.target, config);
      se._tom.on("initialize", resolve);
    });
  }

  async loadConfig(type) {
    const out = {};
    switch (type) {
      case "epsg":
        const epsg = await import("./epsg");
        Object.assign(out, epsg.config);
        break;
      case "format_vector_download":
        const format = await import("./file_format_vector_dl");
        Object.assign(out, format.config);
        break;
      case "countries":
        const countries = await import("./countries");
        Object.assign(out, countries.config);
        break;
    }

    return out;
  }
}
