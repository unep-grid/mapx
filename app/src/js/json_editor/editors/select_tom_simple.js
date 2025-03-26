import { JSONEditor } from "@json-editor/json-editor";
import TomSelect from "tom-select";
import { el } from "./../../el_mapx/index.js";

JSONEditor.defaults.resolvers.unshift(function (schema) {
  // Handle both string and array types with select_tom_simple format
  if (
    (schema.type === "string" && schema.format === "select_tom_simple") ||
    (schema.type === "array" && schema.format === "select_tom_simple" && schema.items?.type === "string")
  ) {
    return "select_tom_simple";
  }
});

/**
 * Custom editor supporting both single string and array of strings
 */
JSONEditor.defaults.editors.select_tom_simple = class mxeditors extends JSONEditor.AbstractEditor {
  build() {
    const editor = this;

    editor.title = editor.theme.getFormInputLabel(editor.getTitle());
    editor.title_controls = editor.theme.getHeaderButtonHolder();
    editor.title.appendChild(editor.title_controls);
    editor.error_holder = document.createElement("div");

    if (editor.schema.description) {
      editor.description = editor.theme.getDescription(editor.schema.description);
      editor.description.classList.add("help-block");
    }

    editor.input = el("input", { type: "text" });

    const group = editor.theme.getFormControl(
      editor.title,
      editor.input,
      editor.description
    );

    editor.container.appendChild(group);
    editor.container.appendChild(editor.error_holder);

    // Handle both array and string schema types
    const isArray = editor.schema.type === "array";
    const enumValues = isArray ? editor.schema.items.enum : editor.schema.enum;
    const enumTitles = isArray 
      ? editor.schema.items.options?.enum_titles || enumValues
      : editor.schema.options?.enum_titles || enumValues;

    const options = enumValues.map((v, i) => {
      return { value: v, text: enumTitles[i] };
    });

    editor.input.ts = new TomSelect(editor.input, {
      options,
      delimiter: ",",
      createOnBlur: false,
      create: false,
      showAddOptionOnCreate: false,
      searchField: ["text", "value"],
      maxItems: isArray ? null : 1, // null means unlimited for arrays
      plugins: isArray ? ['remove_button'] : [], // Add remove button for array mode
      persist: false,
      // Handle unique items constraint
      duplicates: !(isArray && editor.schema.uniqueItems === true)
    });

    editor.refreshValue();
  }

  postBuild() {
    const editor = this;
    editor.input.ts.on("change", function () {
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
      editor.input.ts.destroy();
      editor.input.parentNode.removeChild(editor.input);
    }
    super.destroy();
  }

  empty() {}

  setValue(value) {
    const editor = this;
    const ts = editor.input.ts;
    ts.clear(true);
    
    // Handle both string and array values
    if (Array.isArray(value)) {
      value.forEach(v => ts.addItem(v));
    } else if (value !== undefined && value !== null) {
      ts.addItem(value);
    }
    
    editor.refreshValue();
  }

  refreshValue() {
    const editor = this;
    const value = editor.input.ts.getValue();
    
    // Convert value based on schema type
    if (editor.schema.type === "array") {
      editor.value = value ? value.split(",") : [];
    } else {
      editor.value = value || "";
    }
  }
};
