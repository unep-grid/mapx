import { JSONEditor } from "@json-editor/json-editor";
import { SymbolPicker, resolveSvgUrl } from "@unep-grid/mapx-style";
import { getApiUrl } from "./../../api_routes/index.js";
import { theme } from "./../../mx.js";
import { isArray, isObject } from "./../../is_test/index.js";

JSONEditor.defaults.resolvers.unshift((schema) => {
  const { type, format, mx_options } = schema;
  const isFormat = type === "string" && format === "mapx-sprite-picker";
  const isRenderer =
    type === "string" &&
    isObject(mx_options) &&
    mx_options.renderer === "mapx-sprite-picker";

  if (isFormat || isRenderer) {
    return "mapxSpritePicker";
  }
});

JSONEditor.defaults.editors.mapxSpritePicker = class MapxSpritePicker extends (
  JSONEditor.AbstractEditor
) {
  async build() {
    const editor = this;
    editor.error_holder = document.createElement("div");

    if (!isTableCellEditor(editor)) {
      editor.title = editor.theme.getFormInputLabel(editor.getTitle());
      editor.title_controls = editor.theme.getHeaderButtonHolder();
      editor.title.appendChild(editor.title_controls);
    }

    if (editor.schema.description) {
      editor.description = editor.theme.getDescription(
        editor.schema.description,
      );
      editor.description.classList.add("help-block");
    }

    editor.input = document.createElement("div");
    editor.input.className = "mx-mapx-sprite-picker";

    const group = editor.theme.getFormControl(
      editor.title,
      editor.input,
      editor.description,
    );

    editor.container.appendChild(group);
    editor.container.appendChild(editor.error_holder);

    editor._sprites = await loadSprites(editor.schema);
    const value = normalizeValue(
      editor._queued_value || editor.value || editor.schema.default,
    );
    editor._sprites = ensureValueInSprites(editor._sprites, value);
    editor.picker = new SymbolPicker({
      target: editor.input,
      sprites: editor._sprites,
      value,
      groups: getGroups(editor.schema),
      getPreviewUrl: (id, sprite) => getSpritePreviewUrl(id, sprite),
      onChange: (nextValue) => {
        editor.value = normalizeValue(nextValue);
        editor.onChange(true);
      },
    });

    editor._is_ready = true;
    if (editor._queued_value) {
      editor.setValue(editor._queued_value);
      delete editor._queued_value;
    } else {
      editor.refreshValue();
    }
  }

  destroy() {
    const editor = this;
    editor.picker?.destroy();
    if (editor.title?.parentNode) {
      editor.title.parentNode.removeChild(editor.title);
    }
    if (editor.description?.parentNode) {
      editor.description.parentNode.removeChild(editor.description);
    }
    if (editor.input?.parentNode) {
      editor.input.parentNode.removeChild(editor.input);
    }
    super.destroy();
  }

  setValue(value) {
    const editor = this;
    const normalized = normalizeValue(value);
    editor.value = normalized;
    if (!editor._is_ready) {
      editor._queued_value = normalized;
      return;
    }
    editor._sprites = ensureValueInSprites(editor._sprites, normalized);
    editor.picker.setSprites(editor._sprites);
    editor.picker.setValue(normalized);
    editor.refreshValue();
  }

  refreshValue() {
    const editor = this;
    editor.value = normalizeValue(editor.picker?.getValue() || editor.value);
  }
};

function getGroups(schema) {
  return isArray(schema.mx_options?.groups) ? schema.mx_options.groups : [];
}

async function loadSprites(schema) {
  try {
    return await theme.getSprites({ groups: getGroups(schema) });
  } catch (e) {
    console.error("Failed to load sprite options", e);
    return [];
  }
}

function normalizeValue(value) {
  return value ? String(value) : "none";
}

function ensureValueInSprites(sprites = [], value) {
  const normalized = normalizeValue(value);
  if (
    normalized === "none" ||
    sprites.some((sprite) => sprite?.id === normalized)
  ) {
    return sprites;
  }
  return [...sprites, { id: normalized, group: "legacy" }];
}

function getSpritePreviewUrl(id, sprite) {
  if (!sprite?.id || id === "none") {
    return "";
  }
  return resolveSvgUrl(sprite.id, {
    baseUrl: getApiUrl("/s3"),
  });
}

function isTableCellEditor(editor) {
  let cursor = editor.parent;
  while (cursor) {
    const format = cursor.schema?.format;
    if (format === "table" || format === "tableSourceAutoStyle") {
      return true;
    }
    cursor = cursor.parent;
  }
  return false;
}
