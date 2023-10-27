import { el, elButtonFa, elSpanTranslate as tt } from "../el_mapx";
import { EventSimple } from "../event_simple";
import { isSourceId } from "../is_test";
import { modalSelectSource } from "../select_auto";
import { settings, ws } from "../mx";
import "./join.less";
import { modalPrompt } from "../mx_helper_modal";
import { isEmpty } from "../is_test";
import { getDictItem } from "../language";

const routes = {
  join: "/client/source/join",
};

const defs = {
  id: null,
  title: null,
  id_a: null,
  id_b: null,
  cols_a: [],
  cols_b: [],
  join_a: null,
  join_b: null,
};

export class SourcesJoinManager extends EventSimple {
  constructor() {
    super();
    const sjm = this;
    return sjm;
  }

  async init(mode = "edit") {
    const sjm = this;

    if (sjm._init) {
      return;
    }

    sjm._id_source = null;

    if (mode === "edit") {
      sjm._id_source = await sjm.promptSelectSourceJoin();
    } else {
      sjm._id_source = await sjm.promptCreate();
    }

    if (!isSourceId(sjm._id_source)) {
      console.warn("sjm : no valid source id");
      return;
    }

    const config = await sjm.load(sjm._id_source);
    debugger;

    if (isEmpty(config)) {
      console.log("sjm : empty config");
      return;
    }

    sjm._config = Object.assign({}, defs, config);

    await sjm.build();
  }

  get config() {
    return this._config;
  }

  async emit(method, config) {
    return ws.emitAsync(routes.join, { method, config }, 1000);
  }

  async save() {
    const sjm = this;
    return sjm.emit("set", sjm.config);
  }

  async load(idSource) {
    const sjm = this;
    if (!isSourceId(idSource)) {
      return {};
    }
    return sjm.emit("get", { idSource });
  }

  close() {
    const sjm = this;
    if (sjm._closed) {
      return;
    }
    sjm._closed = true;
    sjm._modal.close();
    sjm.fire("closed");
    sjm.destroy(); //events
    delete window._sjm;
  }

  async getAttributes(idSource) {
    const sjm = this;
    const attributes = await sjm.emit("attributes", {
      idSource,
      idAttrExclude: ["gid", "geom", "_mx_valid"],
    });
    return attributes;
  }

  async promptCreate() {
    const sjm = this;
    const title = await modalPrompt({
      title: tt("sjm_create_title"),
      label: tt("sjm_create_layer_name", {
        data: { language: settings.language },
      }),
      confirm: tt("sjm_create_btn"),
      inputOptions: {
        type: "text",
        value: `New Join ${new Date().toLocaleString()}`,
        placeholder: await getDictItem("sjm_create_layer_placeholder"),
      },
    });
    if (!title) {
      return false;
    }
    const { idSource } = await sjm.emit("create", { title });
    return idSource;
  }

  async promptSelectSourceJoin() {
    const idSource = await modalSelectSource({
      disable_large: false,
      loaderData: { type: ["join"] },
    });
    return idSource;
  }

  buildUi() {
    const sjm = this;

    /**
     * Main
     */
    sjm._elSelectSourceA = el("select");
    sjm._elSelectSourceB = el("select");
    sjm._elSelectColsA = el("select");
    sjm._elSelectColsB = el("select");
    sjm._elSelectColA = el("select");
    sjm._elSelectColB = el("select");
    sjm._elSelectJoinType = el("select");

    const elGrid = el("div", { class: "sjm_join_grid" }, [
      // top
      sjm._elSelectSourceA,
      el("div"),
      sjm._elSelectSourceB,
      // columns
      sjm._elSelectColsA,
      el("div"),
      sjm._elSelectColsB,
      // column join
      sjm._elSelectColA,
      sjm._elSelectJoinType,
      sjm._elSelectColB,
    ]);

    sjm._modal = modal;

    opt.selectAutoOptions.target = elInput;
    selectAuto = new SelectAuto(opt.selectAutoOptions);
  }
}
