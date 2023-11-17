import { el, elButtonFa, elSpanTranslate as tt } from "../../el_mapx";
import { EventSimple } from "../../event_simple";
import { isSourceId } from "../../is_test";
import { SelectAuto, modalSelectSource } from "../../select_auto";
import { settings, ws, nc } from "../../mx";
import { modalPrompt, modalSimple } from "../../mx_helper_modal";
import { isEmpty } from "../../is_test";
import { getDictItem } from "../../language";
import "./style.less";
import { makeId } from "../../mx_helper_misc";

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
    sjm._config_default = await sjm.getConfigDefault();
    sjm._config = sjm._config_default;
    sjm._id_source = null;

    if (mode === "edit") {
      sjm._id_source = await sjm.promptSelectSourceJoin();
    } else {
      sjm._id_source = await sjm.promptCreate();
    }

    if (!isSourceId(sjm._id_source)) {
      sjm.msg("No valid source id", "error");
      return;
    }

    const config = await sjm.load(sjm._id_source);

    if (mode === "edit") {
      const valid = await sjm.validate(config);
      if (!valid) {
        sjm.msg("No valid config", "error");
        return;
      }
    }

    Object.assign(sjm._config, config);

    await sjm.build();
  }

  get config() {
    return Object.assign(this._config_default, this._config);
  }

  async getConfigDefault() {
    return this.emit("config_default");
  }

  updateSimple(
    title,
    description,
    a_id_source,
    a_columns,
    a_column,
    b_id_source,
    b_columns,
    b_column
  ) {
    const sjm = this;

    const conf = sjm.config;

    conf.title.en = title;
    conf.description.en = description;
    conf.id_source = a_id_source;
    conf.columns = a_columns;

    const join = conf.joins[0] || {};

    join.id_source = b_id_source;
    join.columns = b_columns;
    join.column_join = b_column;
    join.column_base = a_column;
  }

  async emit(method, config) {
    return ws.emitAsync(routes.join, { method, config }, 1000);
  }

  async validate(config) {
    const sjm = this;
    const errors = await sjm.emit("validate", config);
    if (isEmpty(errors)) {
      return true;
    }
    sjm.msg(JSON.stringify(errors, 0, 2), "warning");
    return false;
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
    return sjm.emit("get", { id_source: idSource });
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
    sjm.updateSimple(title, title);
    const { id_source } = await sjm.emit("create", sjm.config);
    return id_source;
  }

  async promptSelectSourceJoin() {
    const idSource = await modalSelectSource(sjmSettings.selectSourceJoin);
    return idSource;
  }

  _build_join(index) {
    // Dynamically create a join section
    return el(
      "fieldset",
      { class: ["sjm-group", "sjm-join"], "data-join-index": index },
      [
        el("label", { for: `join_${index}_type` }, "Join Type"),
        el("select", {
          id: `join_${index}_type`,
          name: `joins[${index}].type`,
        }),
        el("label", { for: `join_${index}_id_source` }, "Source B"),
        el("select", {
          id: `join_${index}_id_source`,
          name: `joins[${index}].id_source`,
        }),
        el("label", { for: `join_${index}_columns` }, "Columns B"),
        el("select", {
          id: `join_${index}_columns`,
          name: `joins[${index}].columns`,
          multiple: true,
        }),
        el("label", { for: `join_${index}_prefix` }, "Prefix B"),
        el("input", {
          id: `join_${index}_prefix`,
          type: "text",
          name: `joins[${index}].prefix`,
          readonly: true,
        }),
        el("label", { for: `join_${index}_column_join` }, "Column Join"),
        el("select", {
          id: `join_${index}_column_join`,
          name: `joins[${index}].column_join`,
        }),
        el("label", { for: `join_${index}_column_base` }, "Column Base"),
        el("select", {
          id: `join_${index}_column_base`,
          name: `joins[${index}].column_base`,
        }),
      ]
    );
  }

  async build() {
    const sjm = this;

    /**
     * Form (add labels, simplify)
     */
    sjm._elSjm = el(
      "form",
      { on: ["change", () => sjm.update()], class: "sjm" },
      [
        el("fieldset", { class: "sjm-group" }, [
          el("label", { for: "base_id_source" }, "Source A"),
          el("select", { id: "base_id_source", name: "base.id_source" }),
          el("label", { for: "base_columns" }, "Columns A"),
          el("select", {
            id: "base_columns",
            name: "base.columns",
            multiple: true,
          }),
          el("label", { for: "base_prefix" }, "Prefix A"),
          el("input", {
            id: "base_prefix",
            type: "text",
            name: "base.prefix",
            readonly: true,
          }),
        ]),
        /**
         * First join
         */
        sjm._build_join(0),
      ]
    );

    sjm._modal = modalSimple({
      title: sjm.config.title.en,
      content: sjm._elSjm,
    });

    new SelectAuto({
      target: sjm._elSjm.querySelector("#base_id_source"),
      type: "sources_list_edit",
      config: sjmSettings.selectSourceData,
    });

    new SelectAuto({
      target: sjm._elSjm.querySelector("#join_0_id_source"),
      type: "sources_list_edit",
      config: sjmSettings.selectSourceData,
    });
  }

  update() {
    debugger;
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
