import { el, elButtonFa, elSpanTranslate as tt } from "../../el_mapx";
import { EventSimple } from "../../event_simple";
import { isSourceId, isArray, isEmpty, isElement } from "../../is_test";
import { modalSelectSource } from "../../select_auto";
import { settings, ws, nc } from "../../mx";
import { modalPrompt, modalSimple } from "../../mx_helper_modal";
import { getDictItem } from "../../language";
import "./style.less";
import { itemFlashSave, makeId } from "../../mx_helper_misc";
import { jedInit } from "../../json_editor";
import { bindAll } from "../../bind_class_methods";
import { FlashItem } from "../../icon_flash";

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

const testconfig = {
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
    bindAll(sjm);
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
    const { join: config, meta } = await sjm.load(sjm.id);
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
    const sjm = this;
    return sjm._config;
  }

  get schema() {
    return this._schema;
  }

  get meta() {
    return this._meta;
  }

  getConfigEditor() {
    const sjm = this;
    return sjm._jed.getValue();
  }

  async getConfigDefault() {
    return this.emit("get_config_default");
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
    if (isEmpty(errors)) {
      return true;
    }
    sjm.msg(JSON.stringify(errors, 0, 2), "warning");
    return false;
  }

  async save() {
    const sjm = this;
    const config = sjm.getConfigEditor();
    sjm._config = config;
    const res = await sjm.emit("set_config", config);
    if (res === true) {
      new FlashItem("floppy-o");
    } else {
      new FlashItem("exclamation-circle");
    }
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
    delete window._sjm;
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

  async build() {
    const sjm = this;
    const { schema, config, meta } = sjm;
    const title = meta?.text?.title?.en || sjm.id;
    const id_editor = "mx_join";
    const elSjm = el("div", { id: id_editor, class: "jed-container" });

    const elBtnSave = elButtonFa("btn_save", {
      icon: "floppy-o",
      action: sjm.save,
    });

    const elBtnClose = elButtonFa("btn_close", {
      icon: "times",
      action: sjm.close,
    });

    sjm._modal = modalSimple({
      title,
      content: elSjm,
      buttons: [elBtnClose, elBtnSave],
      removeCloseButton: true,
    });

    config.id_source = sjm.id;

    sjm._jed = await jedInit({
      schema,
      id: id_editor,
      target: elSjm,
      startVal: config,
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
