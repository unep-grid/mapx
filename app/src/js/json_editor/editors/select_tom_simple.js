import { JSONEditor } from "@json-editor/json-editor";
import TomSelect from "tom-select";
import { el } from "./../../el_mapx/index.js";

JSONEditor.defaults.resolvers.unshift(function (schema) {
  if (schema.type === "string" && schema.format === "selectizeSingle") {
    return "selectizeSingle";
  }
});

/**
 * Generic input with group + async translation
 */

JSONEditor.defaults.editors.selectizeSingle = class mxeditors extends (
  JSONEditor.AbstractEditor
) {
  build() {
    const editor = this;

    editor.title = editor.theme.getFormInputLabel(editor.getTitle());
    editor.title_controls = editor.theme.getHeaderButtonHolder();
    editor.title.appendChild(editor.title_controls);
    editor.error_holder = document.createElement("div");

    if (editor.schema.description) {
      editor.description = editor.theme.getDescription(
        editor.schema.description,
      );
    }

    editor.input = el("input", { type: "text" });

    const group = editor.theme.getFormControl(
      editor.title,
      editor.input,
      editor.description,
    );

    editor.container.appendChild(group);
    editor.container.appendChild(editor.error_holder);

    const values = editor.schema.enum;
    const titles = editor.schema.options.enum_titles;

    const options = values.map((v, i) => {
      return { value: v, text: titles[i] };
    });

    editor.input.selectize = new TomSelect(editor.input, {
      options,
      delimiter: ",",
      createOnBlur: false,
      create: false,
      showAddOptionOnCreate: false,
      searchField: ["text", "value"],
      maxItems: 1,
    });
    editor.refreshValue();
  }
  postBuild() {
    const editor = this;
    editor.input.selectize.on("change", function () {
      editor.refreshValue();
      editor.onChange(true);
    });
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
    super.destroy();
  }
  empty() {}
  setValue(value) {
    const editor = this;
    const selectize = editor.input.selectize;
    selectize.clear(true);
    editor.input.selectize.setValue(value);
    editor.refreshValue();
  }
  refreshValue() {
    const editor = this;
    editor.value = editor.input.selectize.getValue();
  }
};
