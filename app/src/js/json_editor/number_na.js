import { JSONEditor } from "@json-editor/json-editor";

JSONEditor.defaults.editors.number_na = class mxeditors extends (
  JSONEditor.defaults.editors.string
) {
  sanitize(value) {
    return (value + "").replace(/[^0-9\.\-eE]/g, "");
  }
  getNumColumns() {
    return 2;
  }
  getValue() {
    if (
      this.value === "" ||
      typeof this.value === "undefined" ||
      this.value === null
    ) {
      return null;
    } else {
      return this.value * 1;
    }
  }
};
