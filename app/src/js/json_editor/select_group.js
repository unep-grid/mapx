import { JSONEditor } from "@json-editor/json-editor";
import { isArray } from "./../is_test/index.js";
import TomSelect from "tom-select";

JSONEditor.defaults.resolvers.unshift(function (schema) {
  if (schema.type === "array" && schema.format === "selectizeOptGroup") {
    return "selectizeOptGroup";
  }
});

/**
 * Generic input with group + async translation
 */

JSONEditor.defaults.editors.selectizeOptGroup = class mxeditors extends (
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

    editor.input = document.createElement("select");
    editor.input.setAttribute("multiple", "multiple");

    editor.input.classList.add("plugin-remove_button");

    const group = editor.theme.getFormControl(
      editor.title,
      editor.input,
      editor.description,
    );

    editor.container.appendChild(group);
    editor.container.appendChild(editor.error_holder);

    const { options, optgroups } = editor.schema.options;

    editor.input.selectize = new TomSelect(editor.input, {
      plugins: ["remove_button"],
      options,
      optgroups,
      delimiter: ",",
      createOnBlur: false,
      create: false,
      showAddOptionOnCreate: false,
      searchField: ["text", "value"],
      optgroupValueField: "value",
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
    value = isArray(value) ? value : [value];
    editor.input.selectize.setValue(value);
    editor.refreshValue();
  }
  refreshValue() {
    const editor = this;
    editor.value = editor.input.selectize.getValue();
  }
};
