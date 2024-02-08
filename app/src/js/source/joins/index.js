import { el, elButtonFa, elSpanTranslate as tt } from "../../el_mapx";
import { EventSimple } from "../../event_simple";
import { isSourceId, isNotEmpty, isEmpty } from "../../is_test";
import { modalSelectSource } from "../../select_auto";
import { settings, ws, nc } from "../../mx";
import { modalPrompt, modalSimple, modalConfirm } from "../../mx_helper_modal";
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
import { moduleLoad } from "../../modules_loader_async";
import { TableResizer } from "../../handsontable/utils";
import { jsonDiff } from "../../mx_helper_utils_json";

const routes = {
  join: "/client/source/join",
};

const sjmSettings = {
  wsTimeOut: 5000,
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
    sjm._mode = mode;

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

    const { join: config, meta } = await sjm.loadData(sjm.id);
    const def = await sjm.getConfigDefault();

    sjm._allow_preview = false;
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

  async getCount() {
    return this.emit("get_count", this.getConfigEditor());
  }

  async getDiff() {
    const sjm = this;
    const { join: configOrig } = await sjm.loadData(sjm.id);
    const configCurrent = sjm.getConfigEditor();
    const delta = await jsonDiff(configOrig, configCurrent, {
      propertyFilter: (p) => !p.startsWith("_"),
    });
    return delta;
  }

  async hasUnsavedChange() {
    const sjm = this;
    const diff = await sjm.getDiff();
    return isNotEmpty(diff);
  }

  async setCount(count) {
    if (isEmpty(count)) {
      return;
    }
    this._elCount.innerText = count;
  }

  async emit(method, config) {
    return ws.emitAsync(routes.join, { method, config }, sjmSettings.wsTimeOut);
  }

  async updateCount() {
    const sjm = this;
    const count = await sjm.getCount();
    sjm.enablePreview(count > 0);
    sjm.setCount(count);
    return count;
  }

  enablePreview(enable) {
    const sjm = this;
    if (isEmpty(enable)) {
      enable = true;
    }
    sjm._allow_preview = enable;
    if (enable) {
      sjm._elBtnPreview.removeAttribute("disabled");
    } else {
      sjm._elBtnPreview.setAttribute("disabled", true);
    }
  }

  async validate() {
    const sjm = this;
    sjm.lockSave();
    sjm.enablePreview(false);
    sjm.clearValidation();
    const okEditor = sjm.validateEditor();
    const okRemote = okEditor && (await sjm.validateRemote());
    const okColumns = okEditor && (await sjm.validateColumns());
    const okAll = okEditor && okColumns && okRemote;
    const rowsCount = okAll ? await sjm.updateCount() : 0;
    if (okAll && rowsCount > 0) {
      sjm.enablePreview(true);
      sjm.unlockSave();
    }
    return okAll;
  }

  validateEditor() {
    const sjm = this;
    const errors = sjm._jed?.validation_results;
    sjm.buildValidateEditor(errors);
    return isNotEmpty(sjm._jed) && isEmpty(errors);
  }

  async validateColumns() {
    const sjm = this;
    const missing = await sjm.getMissingColumns();
    sjm.buildValidateMissing(missing);
    return isEmpty(missing);
  }

  async validateRemote() {
    const sjm = this;
    const config = sjm._jed.getValue();
    const errors = await sjm.emit("validate", config);
    sjm.buildValidateRemote(errors);
    return isEmpty(errors);
  }

  async getMissingColumns() {
    const sjm = this;
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

  buildValidateEditor(errors) {
    const sjm = this;

    if (isEmpty(errors)) {
      return;
    }
    for (const error of errors) {
      const elMessage = el("span", `${error.message} (${error.path})`);
      const elItem = sjm.buildError(elMessage);
      sjm._elValidationOutput.appendChild(elItem);
    }
  }

  buildValidateRemote(errors) {
    const sjm = this;

    if (isEmpty(errors)) {
      return;
    }

    for (const error of errors) {
      const elMessage = tt(`join_warning_remote_${error.keyword}`);
      const elItem = sjm.buildError(elMessage);
      sjm._elValidationOutput.appendChild(elItem);
    }
  }

  buildValidateMissing(missing) {
    const sjm = this;

    if (isEmpty(missing)) {
      return;
    }

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
      const elItem = sjm.buildError([
        tt("join_warning_colums_used_in_views", {
          data: { column: attributeName },
        }),
        el("ul", viewElements),
      ]);
      sjm._elValidationOutput.appendChild(elItem);
    }
  }

  buildError(content) {
    return el("li", { class: ["list-group-item", "mx-error-item"] }, content);
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

  async loadData(idSource) {
    const sjm = this;
    if (!isSourceId(idSource)) {
      return {};
    }
    return sjm.emit("get_data", { id_source: idSource });
  }

  async close() {
    const sjm = this;
    if (sjm._closed) {
      return;
    }

    const newInvalid = sjm._mode === "create" && !sjm.validateEditor();
    const unsavedChange = await sjm.hasUnsavedChange();

    if (unsavedChange) {
      const continueUnsaved = await sjm.promptContinueUnsavedChanges();
      if (!continueUnsaved) {
        return;
      }
    }

    if (newInvalid) {
      const deleteJoin = await sjm.promptDeleteCreateInvalid();
      if (!deleteJoin) {
        return;
      }
      await sjm.emit("unregister", { id_source: sjm.id });
    }

    triggerUpdateSourcesList();
    sjm._closed = true;
    sjm._modal.close();
    sjm.fire("closed");
    delete window._sjm;
  }

  async promptContinueUnsavedChanges() {
    const continueUnsaved = await modalConfirm({
      title: tt("join_quit_unsaved"),
      content: tt("join_quit_unsaved_desc"),
      confirm: tt("btn_confirm"),
      cancel: tt("btn_cancel"),
    });
    return continueUnsaved;
  }

  async promptDeleteCreateInvalid() {
    const sjm = this;
    const isEditorValid = sjm.validateEditor();
    if (sjm._mode !== "create" || isEditorValid) {
      return;
    }
    const deletedJoin = await modalConfirm({
      title: tt("join_delete_created_invalid"),
      content: tt("join_delete_created_invalid_desc"),
      confirm: tt("btn_confirm"),
      cancel: tt("btn_cancel"),
    });
    return deletedJoin;
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
    const idSource = await modalSelectSource({
      disable_large: false,
      disable_missing: false,
      types: ["join"],
      editable: true,
      readable: false,
    });
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

  async preview() {
    const sjm = this;

    if (!sjm._allow_preview) {
      return;
    }

    const elTable = el(
      "div",
      {
        class: "mx_handsontable",
        style: {
          minHeight: "350px",
          minWidth: "100px",
          overflow: "hidden",
          backgroundColor: "var(--mx_ui_shadow)",
        },
      },
      "Loading...",
    );
    const elModal = modalSimple({
      title: "preview",
      content: elTable,
      onClose: destroy,
    });

    const config = sjm.getConfigEditor();
    const data = await sjm.emit("get_preview", config);
    elTable.innerHTML = "";
    const columns = Object.keys(data[0] || {});
    const handsontable = await moduleLoad("handsontable");
    const ht = new handsontable(elTable, {
      data: data,
      colHeaders: columns,
      rowHeaders: true,
      licenseKey: "non-commercial-and-evaluation",
    });
    const tableObserver = new TableResizer(ht, elTable, elModal);

    function destroy() {
      if (ht instanceof handsontable) {
        ht.destroy();
        tableObserver.disconnect();
      }
    }
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

    sjm._elValidationOutput = el("ul", {
      class: ["list-group", "mx-error-list-container"],
    });
    sjm._elValidationContainer = el(
      "div",
      {
        class: "mx-error-container",
      },
      sjm._elValidationOutput,
    );

    sjm._elSjm = el("div", { id: id_editor, class: "jed-container" });
    sjm._elCount = el(
      "span",
      {
        class: ["hint--left"],
        lang_type: "tooltip",
        lang_key: "join_rows_count",
        "aria-label": await getDictItem("join_rows_count"),
      },
      0,
    );

    const elContent = el("div", [
      sjm._elValidationContainer,
      sjm._elSjm,
      sjm._elCountContainer,
    ]);

    sjm._elBtnPreview = elButtonFa("join_preview", {
      tag: "div",
      icon: "table",
      content: sjm._elCount,
      action: sjm.preview,
    });

    sjm._elBtnSave = elButtonFa("btn_save", {
      icon: "floppy-o",
      action: sjm.save,
    });

    sjm._elBtnClose = elButtonFa("btn_close", {
      icon: "times",
      action: sjm.close,
    });

    sjm._modal = modalSimple({
      title: title,
      content: elContent,
      buttons: [sjm._elBtnClose, sjm._elBtnSave, sjm._elBtnPreview],
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
