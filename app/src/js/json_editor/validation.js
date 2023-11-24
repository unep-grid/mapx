import { JSONEditor } from "@json-editor/json-editor";

JSONEditor.defaults.custom_validators.push(function (schema, value, path) {
  const editor = this;
  const errors = [];
  const rgxEmpty = new RegExp(/^\s+$/);
  if (schema.type === "string") {
    if (rgxEmpty.test(value)) {
      errors.push({
        id: "error_only_space",
        path: path,
        property: "format",
        message: editor.translate("error_space_only"),
      });
    }
  }
  return errors;
});
