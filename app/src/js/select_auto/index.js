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

  async build() {
    const se = this;
    const TomSelect = await moduleLoad("tom-select");
    const config = await se.loadConfig(se._opt.type);
    return new Promise((resolve) => {
      se._tom = new TomSelect(se._opt.target, config);
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
    const out = {};
    switch (type) {
      case "epsg":
        const epsg = await import("./resolvers/epsg.js");
        Object.assign(out, epsg.config);
        break;
      case "format_vector_download":
        const format = await import("./resolvers/format_vector_download.js");
        Object.assign(out, format.config);
        break;
      case "countries":
        const countries = await import("./resolvers/countries.js");
        Object.assign(out, countries.config);
        break;
      case "sources_list_edit":
        const sourcesEdit = await import("./resolvers/sources_list_edit.js");
        Object.assign(out, sourcesEdit.config);
        break;
    }
    return out;
  }
}
