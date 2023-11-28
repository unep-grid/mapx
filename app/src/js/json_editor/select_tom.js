import { JSONEditor } from "@json-editor/json-editor";
import { el } from "./../el_mapx";
import { isEmpty, isNotEmpty, isArray, isObject } from "./../is_test/index.js";
import TomSelect from "tom-select";

import { config as config_source_edit } from "../select_auto/resolvers/sources_list_edit";
import { config as config_source_edit_columns } from "../select_auto/resolvers/sources_list_columns";

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
  build() {
    const editor = this;
    editor.title = editor.theme.getFormInputLabel(editor.getTitle());
    editor.title_controls = editor.theme.getHeaderButtonHolder();
    editor.title.appendChild(editor.title_controls);
    editor.error_holder = document.createElement("div");

    const { schema } = editor;

    const { maxItems, types, loader } = schema.mx_options;

    const config = {};

    switch (loader) {
      case "source_edit":
        Object.assign(config, config_source_edit);
        Object.assign(config.loaderData, { types });
        break;
      case "source_edit_columns":
        Object.assign(config, config_source_edit_columns);
        const id_source = null; // updated after the watch event
        Object.assign(config.loaderData, { id_source });
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
    editor._refresh_value();

    window.requestAnimationFrame(() => {
      editor._post_build();
    });
  }
  _post_build() {
    const editor = this;
    const { schema } = editor;
    const { watch } = schema.mx_options;
    editor.input.ts.on("change", function () {
      editor._refresh_value();
      editor.onChange(true);
    });
    if (watch) {
      editor._watch = watch;
      editor._register_watcher();
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
  async setValue(value) {
    try {
      const editor = this;
      const ts = editor.input.ts;
      ts.clear(true);
      value = isArray(value) ? value : [value];
      ts.setValue(value);
      editor._refresh_value();
    } catch (e) {
      console.warn(e);
    }
  }
  _refresh_value() {
    const editor = this;
    editor.value = editor.input?.ts?.getValue();
    console.log(editor.value);
  }
  _register_watcher() {
    const editor = this;
    const { property, path } = editor._watch;
    const relative = isEmpty(path) || path === ".";

    const watch_path = relative
      ? `${editor.parent.path}.${property}`
      : `${path}.${property}`;

    editor._update_if_set(watch_path);

    editor.jsoneditor.watch(watch_path, () => {
      editor._update_if_set(watch_path);
    });
  }
  _update_if_set(watch_path) {
    const editor = this;
    const ts = editor.input.ts;
    ts.clear();
    const watchedValue = editor.jsoneditor.getEditor(watch_path)?.getValue();
    editor._update_select_options(watchedValue);
    ts.reset();
  }

  _update_select_options(value) {
    const ts = this.input.ts;
    const idField = ts.settings.loaderData.value_field;
    ts.settings.loaderData[idField] = value;
  }
};
