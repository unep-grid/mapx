import { JSONEditor } from "@json-editor/json-editor";
import { el } from "./../el_mapx";
import { isEmpty, isArray, isObject } from "./../is_test/index.js";
import TomSelect from "tom-select";
import { getConfig } from "../select_auto/utils.js";
import { deltaMerge } from "../mx_helper_utils_json";

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
 * Use tom select pre configured objects
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

    const { schema } = editor;

    const config = await editor._build_config(schema.mx_options);

    if (editor.schema.description) {
      editor.description = editor.theme.getDescription(
        editor.schema.description,
      );
    }

    const { watch } = config;

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
      await editor._register_watcher(watch);
      return;
    }

    await editor.input.ts._update();
    editor._on_ready();
  }

  async _build_config(options) {
    const { loader } = options;
    const editor = this;
    const patch = editor._get_config_patch(options);
    const config = await getConfig(loader, patch);
    return config;
  }

  _get_config_patch(options) {
    const { maxItems, watch, loader } = options;
    switch (loader) {
      case "views":
        const { includeAllPublic } = options;
        return {
          watch,
          maxItems,
          loader_config: { includeAllPublic },
        };
      case "sources":
        const { types, readable, editable, add_global } = options;
        return {
          maxItems,
          watch,
          loader_config: {
            types,
            readable,
            editable,
            add_global,
          },
        };

      case "source_columns":
        return {
          maxItems,
          watch,
          loader_config: {
            id_source: null,
          },
        };
      default:
        throw new Error(`tomSelectAuto, unknown loader ${loader}`);
    }
  }

  _on_ready() {
    const editor = this;
    /*
     * Set ready
     */
    editor._is_ready = true;
    if (editor._queued_value) {
      editor.setValue(editor._queued_value);
      delete editor._queued_value;
    }
  }

  destroy() {
    const editor = this;
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

  setValue(value) {
    const editor = this;
    const { ts } = editor?.input || {};
    const isEmptyValue =
      isEmpty(value) || (isArray(value) && value.every((v) => isEmpty(v)));

    const valueArray = isEmptyValue ? [] : [value].flat();

    /*
     * Not ready if init time or watched editor value changed
     */
    if (editor._is_ready) {
      ts.setValue(valueArray);
    } else {
      editor._queued_value = valueArray;
    }
    editor._refresh_value();
  }

  /**
   * Refresh editor value with the current tom-select value
   */
  _refresh_value() {
    const editor = this;
    editor.value = editor.input?.ts?.getValue();
  }
  /**
   *
   */
  async _register_watcher(watch) {
    const editor = this;
    if (editor._watched_path) {
      return;
    }
    const { property, path } = watch;
    const relative = isEmpty(path) || path === ".";
    const watch_path = relative
      ? `${editor.parent.path}.${property}`
      : `${path}.${property}`;

    editor._watched_path = watch_path;

    await editor._update_if_change(watch_path);

    editor.jsoneditor.watch(watch_path, async () => {
      try {
        await editor._update_if_change(watch_path);
      } catch (e) {
        console.error(e);
      }
    });
  }
  /**
   * Update the loader config if the watched value has changed
   * .e.g  ts.settings.loader_config["id_source"] = "MX_123";
   */
  async _update_if_change(path) {
    const editor = this;
    const ts = editor.input.ts;
    const editorWatched = editor.jsoneditor.getEditor(path);
    if (!editorWatched) {
      return;
    }
    const value = editorWatched.getValue();
    const idField = ts.settings.loader_config.value_field;
    const previousValue = ts.settings.loader_config[idField];
    if (!value || previousValue === value) {
      return;
    }
    ts.settings.loader_config[idField] = value;
    /*
     * Not ready - if setValue, will be queued
     */
    editor._is_ready = false;
    await ts._update();
    editor._on_ready();
  }
};
