import { el, elSpanTranslate as tt } from "../../el_mapx";
import { EventSimple } from "../../event_simple";
import { isSourceId, isArray, isEmpty, isElement } from "../../is_test";
import { modalSelectSource } from "../../select_auto";
import { settings, ws, nc } from "../../mx";
import { modalPrompt, modalSimple } from "../../mx_helper_modal";
import { getDictItem } from "../../language";
import "./style.less";
import { makeId } from "../../mx_helper_misc";
import { jedInit } from "../../json_editor";

const routes = {
  join: "/client/source/join",
};

const sjmSettings = {
  selectSourceJoin: {
    disable_large: false,
    disable_missing: false,
    loaderData: { types: ["join"] },
  },
  selectSourceData: {
    disable_large: true,
    disable_missing: true,
    loaderData: { types: ["tabular", "vector"] },
  },
};

const testdata = {
  version: "1",
  id_source: "mx_i1ai9_zgj2n_vllo1_xr5ib_4wgiy",
  base: {
    id_source: "mx_xkbpr_vfd4q_vyvy9_t19nl_xo2l3",
    columns: ["id"],
    prefix: "a_",
  },
  joins: [
    {
      id_source: "mx_spfsm_4c3r7_4ff2g_b1q53_pekhq",
      //columns: ["altitude", "caco3", "name", "id", "presence", "region"],
      columns: ["caco3", "name", "id"],
      prefix: "b_",
      type: "INNER",
      column_join: "id",
      column_base: "id",
    },
  ],
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
    sjm._id = makeId(10);

    if (mode === "edit") {
      sjm._id_source = await sjm.promptSelectSourceJoin();
    } else {
      sjm._id_source = await sjm.promptNew();
    }

    if (!isSourceId(sjm._id_source)) {
      sjm.msg("No valid source id", "error");
      return;
    }

    const schema = await sjm.emit("get_schema");
    const { config, meta } = await sjm.load(sjm._id_source);
    const def = await sjm.getConfigDefault();

    sjm._schema = schema;
    sjm._config = Object.assign({}, def, config);
    sjm._meta = Object.assign({}, meta);

    await sjm.build();
  }

  get id() {
    return this._id_source;
  }

  get config() {
    return this._config;
  }
  get schema() {
    return this._schema;
  }

  get meta() {
    return this._meta;
  }

  async getConfigDefault() {
    return this.emit("get_config_default");
  }
  async getJoinDefault() {
    return this.emit("get_join_default");
  }
  async getSchema() {
    return this.emit("get_schema");
  }

  async emit(method, config) {
    return ws.emitAsync(routes.join, { method, config }, 1000);
  }

  async validate() {
    const sjm = this;
    const config = sjm._jed.getValue();
    const errors = await sjm.emit("validate", config);
    debugger;
    if (isEmpty(errors)) {
      return true;
    }
    sjm.msg(JSON.stringify(errors, 0, 2), "warning");
    return false;
  }

  async save() {
    const sjm = this;
    return sjm.emit("set_config", sjm.config);
  }

  async load(idSource) {
    const sjm = this;
    if (!isSourceId(idSource)) {
      return {};
    }
    return sjm.emit("get_data", { id_source: idSource });
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

  async getColumnsType(idSource) {
    if (!isSourceId(idSource)) {
      return [];
    }
    const sjm = this;
    const columnsType = await sjm.emit("get_columns_type", {
      idSource,
      idAttrExclude: ["gid", "geom", "_mx_valid"],
    });
    return columnsType;
  }
  async getColumns(idSource) {
    const sjm = this;
    const columnsType = await sjm.getColumnsType(idSource);
    return columnsType.map((c) => c.column_name);
  }

  async promptNew() {
    const sjm = this;
    const title = await modalPrompt({
      title: tt("sjm_new_title"),
      label: tt("sjm_new_layer_name", {
        data: { language: settings.language },
      }),
      confirm: tt("sjm_new_btn"),
      inputOptions: {
        type: "text",
        value: `New Join ${new Date().toLocaleString()}`,
        placeholder: await getDictItem("sjm_create_layer_placeholder"),
      },
    });
    if (!title) {
      return false;
    }

    const register = {
      title: title,
      language: settings.language,
    };

    const { id_source } = await sjm.emit("register", register);

    return id_source;
  }

  async promptSelectSourceJoin() {
    const idSource = await modalSelectSource(sjmSettings.selectSourceJoin);
    return idSource;
  }

  _select_options(value, options = []) {
    const res = [];

    if (isEmpty(value)) {
      value = options[0];
    }

    if (isEmpty(value)) {
      return;
    }

    /**
     * Unselected
     */
    for (const option of options) {
      if (option === value) {
        continue;
      }
      res.push(el("option", { value: option }, option));
    }

    /**
     * Selected
     */
    if (isArray(value)) {
      res.push(
        ...value.map((v) => {
          el("option", { selected: true, value: v }, v);
        }),
      );
    } else {
      res.push(el("option", { selected: true, value }, value));
    }
    return res;
  }

  async build() {
    const sjm = this;
    const { schema, config, meta } = sjm;
    const title = meta?.text?.title?.en || config.id_source;
    const id_editor = "mx_join";
    const elSjm = el("div", { id: id_editor, class: "jed-container" });

    const btnValidate = el("button", { on: ["click", sjm.save.bind(sjm)] });

    sjm._modal = modalSimple({
      title,
      content: elSjm,
      buttons: [btnValidate],
    });

    config.id_source = sjm.id;

    sjm._jed = await jedInit({
      schema,
      id: id_editor,
      target: elSjm,
      startVal: testdata,
      options: {
        disable_collapse: true,
        disable_properties: true,
        disableSelectize: false,
        disable_edit_json: true,
        required_by_default: true,
        show_errors: "always",
        no_additional_properties: true,
        prompt_before_delete: false,
      },
    });
  }

  msg(txt, level) {
    nc.notify({
      idGroup: "join_tool",
      level: level || "message",
      type: "info",
      message: `Join (client): ${txt}`,
      open: true,
    });
  }
}
