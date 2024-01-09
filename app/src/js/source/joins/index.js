import { el, elButtonFa, elSpanTranslate as tt } from "../../el_mapx";
import { EventSimple } from "../../event_simple";
import { isSourceId, isEmpty } from "../../is_test";
import { modalSelectSource } from "../../select_auto";
import { settings, ws, nc } from "../../mx";
import { modalPrompt, modalSimple } from "../../mx_helper_modal";
import { getDictItem, getLabelFromObjectPath } from "../../language";
import "./style.less";
import { makeId } from "../../mx_helper_misc";
import { jedInit } from "../../json_editor";
import { bindAll } from "../../bind_class_methods";
import { FlashItem } from "../../icon_flash";
import {
  getViewTitle,
  viewLink,
  triggerUpdateSourcesList,
} from "../../map_helpers";

const routes = {
  join: "/client/source/join",
};

const sjmSettings = {
  wsTimeOut: 5000,
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
    bindAll(sjm);
    window._sjm = sjm;
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
      return;
    }

    const schema = await sjm.emit("get_schema", {
      language: settings.language,
    });

    const { join: config, meta } = await sjm.load(sjm.id);
    const def = await sjm.getConfigDefault();

    sjm._schema = schema;
    sjm._config = Object.assign({}, def, config);
    sjm._meta = Object.assign({}, meta);
    sjm._lock_save = false;
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
    return ws.emitAsync(routes.join, { method, config }, sjmSettings.wsTimeOut);
  }

  async validateRemote() {
    const sjm = this;
    const config = sjm._jed.getValue();
    const errors = await sjm.emit("validate", config);
    if (isEmpty(errors)) {
      return true;
    }
    sjm.msg(JSON.stringify(errors, 0, 2), "warning");
    return false;
  }

  async validate() {
    const sjm = this;
    sjm.lockSave();
    const okEditor = sjm.validateEditor();
    const okColumns = okEditor && (await sjm.validateColumns());
    if (okColumns) {
      sjm.unlockSave();
    }
    return okColumns;
  }

  validateEditor() {
    const sjm = this;
    return isEmpty(sjm._jed.validation_results);
  }

  async validateColumns() {
    const sjm = this;
    const missing = await sjm.getMissingColumns();
    sjm.buildValidateMissing(missing);
    return isEmpty(missing);
  }

  async getMissingColumns() {
    const sjm = this;
    if (!sjm.validateEditor()) {
      return [];
    }
    const config = sjm._jed.getValue();
    const missing = await sjm.emit("get_columns_missing", config);

    return missing;
  }

  clearValidation() {
    const sjm = this;
    while (sjm._elValidationOutput.firstElementChild) {
      sjm._elValidationOutput.firstElementChild.remove();
    }
  }
  buildValidateMissing(missing) {
    const sjm = this;
    sjm.clearValidation();

    if (isEmpty(missing)) {
      return;
    }

    const elMissing = el("ul", {
      class: ["list-group", "mx-error-list-container"],
    });

    const perAttribute = new Map();

    for (const item of missing) {
      const attributeId = item.id;
      let previous = perAttribute.get(attributeId);
      if (!previous) {
        previous = {
          attributeName: attributeId,
          views: [],
        };
      }
      previous.views.push({
        title: getViewTitle(item.view),
        link: viewLink(item.view),
      });
      perAttribute.set(attributeId, previous);
    }

    for (const { attributeName, views } of perAttribute.values()) {
      const viewElements = views.map((v) => {
        return el("li", [
          tt("view"),
          el("span", ":"),
          el("a", { href: v.link, target: "_blank" }, el("span", v.title)),
        ]);
      });
      const elItem = el("li", { class: ["list-group-item", "mx-error-item"] }, [
        tt("join_warning_colums_used_in_views", {
          data: { column: attributeName },
        }),
        el("ul", viewElements),
      ]);
      elMissing.appendChild(elItem);
    }

    sjm._elValidationOutput.appendChild(elMissing);
  }
  buildValidateMissing_old(missing) {
    const sjm = this;
    sjm.clearValidation();

    if (isEmpty(missing)) {
      return;
    }

    const elMissing = el("ul", {
      class: ["list-group", "mx-error-list-container"],
    });

    const perView = new Map();

    for (const item of missing) {
      const idView = item?.view?.id;
      let previous = perView.get(idView);
      if (previous) {
        previous.attributes.push(item.id);
      } else {
        previous = {
          title: getViewTitle(item.view),
          link: viewLink(item.view),
          attributes: [item.id],
        };
      }
      perView.set(idView, previous);
    }

    for (const item of perView.values()) {
      const elItem = el(
        "li",
        {
          class: ["list-group-item", "mx-error-item"],
        },
        [
          el("span", tt("join_warning_colums_issue")),
          el(
            "a",
            { target: "_blank", href: item.link },
            el("span", item.title),
          ),
          el(
            "ul",
            item.attributes.map((a) => {
              return el("li", el("span", a));
            }),
          ),
        ],
      );
      elMissing.appendChild(elItem);
    }

    sjm._elValidationOutput.appendChild(elMissing);
  }

  async save() {
    const sjm = this;
    if (sjm.locked) {
      return;
    }
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
    triggerUpdateSourcesList();
    sjm._closed = true;
    sjm._modal.close();
    sjm.fire("closed");
    delete window._sjm;
  }

  async promptNew() {
    const sjm = this;
    const title = await modalPrompt({
      title: tt("join_new_layer_name"),
      label: tt("join_new_layer_name", {
        data: { language: settings.language },
      }),
      confirm: tt("join_new_btn"),
      inputOptions: {
        type: "text",
        value: `New Join ${new Date().toLocaleString()}`,
        placeholder: await getDictItem("join_new_layer_placeholder"),
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

  get locked() {
    return !!this._lock_save;
  }

  lockSave() {
    const sjm = this;
    if (sjm.locked) {
      return;
    }
    sjm._lock_save = true;
    sjm._elBtnSave.setAttribute("disabled", "disabled");
  }

  unlockSave() {
    const sjm = this;
    sjm._lock_save = false;
    sjm._elBtnSave.removeAttribute("disabled");
  }

  async build() {
    const sjm = this;
    const { schema, config, meta } = sjm;
    const { language } = settings;
    const id_editor = "mx_join";
    const title = getLabelFromObjectPath({
      obj: meta,
      path: "text.title",
      lang: language,
      defaultValue: sjm.id,
    });

    sjm._elValidationOutput = el("div", {
      class: "mx-error-container",
    });

    sjm._elSjm = el("div", { id: id_editor, class: "jed-container" });
    const elContent = el("div", [sjm._elValidationOutput, sjm._elSjm]);

    sjm._elBtnSave = elButtonFa("btn_save", {
      icon: "floppy-o",
      action: sjm.save,
    });

    sjm._elBtnClose = elButtonFa("btn_close", {
      icon: "times",
      action: sjm.close,
    });

    sjm._modal = modalSimple({
      title,
      content: elContent,
      buttons: [sjm._elBtnClose, sjm._elBtnSave],
      removeCloseButton: true,
    });

    config.id_source = sjm.id;
    sjm.lockSave();
    sjm._jed = await jedInit({
      schema,
      id: id_editor,
      target: sjm._elSjm,
      startVal: config,
      options: {
        disable_collapse: true,
        disable_properties: true,
        disableSelectize: false,
        disable_edit_json: true,
        required_by_default: true,
        show_errors: "interaction",
        no_additional_properties: true,
        prompt_before_delete: false,
      },
    });
    sjm.unlockSave();
    sjm._jed.on("change", sjm.validate.bind(sjm));
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
