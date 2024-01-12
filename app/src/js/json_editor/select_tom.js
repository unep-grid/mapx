import { JSONEditor } from "@json-editor/json-editor";
import { el } from "./../el_mapx";
import { isEmpty, isArray, isObject } from "./../is_test/index.js";
import TomSelect from "tom-select";

import { config as config_source } from "../select_auto/resolvers/sources_list.js";
import { config as config_source_columns } from "../select_auto/resolvers/sources_list_columns";
import { clone } from "../mx_helper_misc";

JSONEditor.defaults.resolvers.unshift(function (schema) {
  const options = schema.mx_options;
  const isMxOptions = isObject(options);
  if (!isMxOptions) {
    return;
  }
  if (options.renderer === "tom-select") {
    return "tomSelectAuto";
  }
});

/**
 * Gemet specific input : remote fetch
 */
JSONEditor.defaults.editors.tomSelectAuto = class mxeditors extends (
  JSONEditor.AbstractEditor
) {
  async build() {
    const editor = this;
    editor.title = editor.theme.getFormInputLabel(editor.getTitle());
    editor.title_controls = editor.theme.getHeaderButtonHolder();
    editor.title.appendChild(editor.title_controls);
    editor.error_holder = document.createElement("div");

    const config = {};
    const { schema } = editor;
    const { maxItems, watch, loader } = schema.mx_options;

    switch (loader) {
      case "source_edit":
        const { types, readable, editable, add_global } =
          schema.mx_options;
        Object.assign(config, clone(config_source));
        Object.assign(config.loader_config, {
          types,
          readable,
          editable,
          add_global,
        });
        break;
      case "source_edit_columns":
        Object.assign(config, clone(config_source_columns));
        Object.assign(config.loader_config, { id_source: null });
        break;
      default:
        throw new Error(`tomSelectAuto, unknown loader ${loader}`);
    }

    if (editor.schema.description) {
      editor.description = editor.theme.getDescription(
        editor.schema.description,
      );
    }

    if (maxItems) {
      config.maxItems = maxItems;
    }

    if (schema.type === "array") {
      editor.input = el("select", {
        autocomplete: "off",
        type: "text",
        multiple: "multiple",
      });
    } else {
      editor.input = el("input", {
        autocomplete: "off",
        type: "text",
      });
    }

    const group = editor.theme.getFormControl(
      editor.title,
      editor.input,
      editor.description,
    );

    editor.container.appendChild(group);
    editor.container.appendChild(editor.error_holder);
    editor.input.ts = new TomSelect(editor.input, config);

    editor.input.ts.on("change", () => {
      editor._refresh_value();
      editor.onChange(true);
    });

    if (watch) {
      editor._watch = watch;
      await editor._register_watcher();
      return;
    }

    await editor.input.ts._update();
    editor._on_ready();
  }

  _on_ready() {
    const editor = this;
    editor._is_ready = true;
    if (editor._queued_value) {
      editor.setValue(editor._queued_value);
      delete editor._queued_value;
    }
  }

  destroy() {
    const editor = this;
    editor.empty(true);
    if (editor.title && editor.title.parentNode) {
      editor.title.parentNode.removeChild(editor.title);
    }
    if (editor.description && editor.description.parentNode) {
      editor.description.parentNode.removeChild(editor.description);
    }
    if (editor.input && editor.input.parentNode) {
      editor.input.parentNode.removeChild(editor.input);
    }

    if (editor.input?.ts.destroy) {
      editor.input.ts.destroy();
    }

    super.destroy();
  }
  empty() {}

  setValue(value) {
    const editor = this;
    const ts = editor.input.ts;

    const isEmptyValue =
      isEmpty(value) || (isArray(value) && value.every((v) => isEmpty(v)));

    const valueArray = isEmptyValue ? [] : [value].flat();

    if (editor._is_ready) {
      ts.setValue(valueArray);
    } else {
      editor._queued_value = valueArray;
    }
    editor._refresh_value();
  }
  _refresh_value() {
    const editor = this;
    editor.value = editor.input?.ts?.getValue();
  }
  async _register_watcher() {
    const editor = this;
    const { property, path } = editor._watch;
    const relative = isEmpty(path) || path === ".";

    const watch_path = relative
      ? `${editor.parent.path}.${property}`
      : `${path}.${property}`;

    await editor._update_if_set(watch_path);

    editor.jsoneditor.watch(watch_path, async () => {
      await editor._update_if_set(watch_path);
    });
  }
  async _update_if_set(watch_path) {
    const editor = this;
    const ts = editor.input.ts;
    const value = editor.jsoneditor.getEditor(watch_path)?.getValue();
    const idField = ts.settings.loader_config.value_field; //e.g. id_source
    if (!value) {
      return;
    }
    // e.g. ts.settings.loader_config["id_source"] = "MX_123";
    ts.settings.loader_config[idField] = value;
    await ts._update();
    editor._on_ready();
  }
};
