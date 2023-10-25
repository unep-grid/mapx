import { el } from "../el_mapx";
import { EventSimple } from "../event_simple";
import { isSourceId } from "../is_test";
import { modalSelectSource } from "../select_auto";
import { ws } from "../mx";
import "./join.less";

const routes = {
  join: "/client/source/join",
};

export class SourcesJoinManager extends EventSimple {
  constructor() {
    const sjm = this;
    return sjm;
  }

  async init() {
    const sjm = this;

    if (sjm._init) {
      return;
    }

    const idSource = await sjm.promptSelectSourceJoin();
    const saved = await sjv.load(idSource);

    const defs = {
      id: idSource,
      id_a: null,
      id_b: null,
      cols_a: [],
      cols_b: [],
      join_a: null,
      join_b: null,
    };

    sjm._config = Object.assign({}, defs, saved);

    await sjm.build();
  }

  get config() {
    return this._config;
  }

  async emit(method, config) {
    return ws.emitAsync(routes.join, { method, config }, 100);
  }

  async save() {
    const sjm = this;
    return sjm.emit("set", sjm.config);
  }

  async load(idSource) {
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

  async promptSelectSourceJoin() {
    const idSource = await modalSelectSource({
      disable_large: false,
      loaderData: { type: ["join"] },
    });
    return idSource;
  }

  async selectSourceJoin() {
    const idSource = await modalSelectSource({
      disable_large: false,
      loaderData: { type: "join" },
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
