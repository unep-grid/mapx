// @ts-check
import { JSONEditor } from "@json-editor/json-editor";
import { settings } from "../../settings/index.js";
import "../../source/picker/index.js";

const RENDERER = "source-picker";

JSONEditor.defaults.resolvers.unshift((schema) => {
  if (schema.type === "string" && schema.mx_options?.renderer === RENDERER) {
    return "mapxSourcePicker";
  }
});

JSONEditor.defaults.editors.mapxSourcePicker = class MapxSourcePicker extends (
  JSONEditor.AbstractEditor
) {
  build() {
    const options = this.schema.mx_options || {};
    const doc = this.container.ownerDocument;
    this.title = this.theme.getFormInputLabel(this.getTitle());
    this.title_controls = this.theme.getHeaderButtonHolder();
    this.title.appendChild(this.title_controls);
    this.error_holder = doc.createElement("div");
    if (this.schema.description) {
      this.description = this.theme.getDescription(this.schema.description);
    }
    this.input = doc.createElement("mx-source-picker");
    this.input.classList.add("mx-source-picker--json-editor");
    this.title.setAttribute("for", this.input.controlId);
    this.input.config = {
      label: this.getTitle(),
      acceptedTypes: options.acceptedTypes || ["vector", "join"],
      requiredCapabilities: options.requiredCapabilities || [],
      geometryTypes: options.geometryTypes || [],
      accessMode: options.accessMode || "readable",
      language: settings.language || "en",
    };
    this._onPickerChange = (event) => {
      if (this._suppressChange || event.target !== this.input) {
        return;
      }
      this.refreshValue();
      this.onChange(true);
    };
    this._suppressChange = true;
    this.input.addEventListener(
      "mx-source-picker-change",
      this._onPickerChange,
    );
    const group = this.theme.getFormControl(
      this.title,
      this.input,
      this.description,
    );
    this.container.append(group, this.error_holder);
    this._isReady = true;
    if (this._queuedValue !== undefined) {
      this.setValue(this._queuedValue);
      delete this._queuedValue;
    } else {
      this.refreshValue();
    }
    queueMicrotask(() => {
      this._suppressChange = false;
    });
  }

  setValue(value) {
    const normalized = value ? String(value) : "";
    this.value = normalized;
    if (!this._isReady) {
      this._queuedValue = normalized;
      return;
    }
    this._suppressChange = true;
    this.input.value = normalized;
    this.refreshValue();
    queueMicrotask(() => {
      this._suppressChange = false;
    });
  }

  refreshValue() {
    this.value = this.input?.value || "";
  }

  enable() {
    if (!this.always_disabled) {
      if (this.input) {
        this.input.disabled = false;
      }
      super.enable();
    }
  }

  disable(alwaysDisabled) {
    if (alwaysDisabled) {
      this.always_disabled = true;
    }
    if (this.input) {
      this.input.disabled = true;
    }
    super.disable();
  }

  destroy() {
    this.input?.removeEventListener(
      "mx-source-picker-change",
      this._onPickerChange,
    );
    this.input?.browserWindow?.close("editor-destroyed");
    super.destroy();
  }
};
