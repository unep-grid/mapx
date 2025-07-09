import { JSONEditor } from "@json-editor/json-editor";
import { modalSimple } from "./../../mx_helper_modal.js";
import { moduleLoad } from "./../../modules_loader_async";
import { textToDom } from "./../../mx_helper_misc.js";
import { el, elSpanTranslate, elButtonFa } from "./../../el_mapx/index.js";
import { theme } from "./../../mx.js";
import { jed } from "./../index.js";
import { DataDiffModal } from "../../data_diff_recover/index.js";
import { isEmpty } from "../../is_test/index.js";
import { isObject } from "highcharts";

// Helper functions
function safeJsonParse(value, fallback = '""') {
  try {
    return JSON.parse(value || fallback);
  } catch (e) {
    console.warn("Invalid JSON value, using fallback:", e);
    return JSON.parse(fallback);
  }
}

function safeJsonStringify(value, indent = 2) {
  try {
    return JSON.stringify(value, null, indent);
  } catch (e) {
    console.warn("Failed to stringify value:", e);
    return '""';
  }
}

async function createMonacoInstance(container, options) {
  try {
    const monaco = await moduleLoad("monaco-editor");
    const editor = monaco.editor.create(container, options);
    return { monaco, editor };
  } catch (error) {
    console.error("Failed to create Monaco editor:", error);
    throw error;
  }
}

function setupToolbar(editor) {
  const options = editor.options;
  const editorMonaco = editor._monaco_editor;

  if (options.readonly) {
    return;
  }

  // Format button
  const elBtnTidy = elButtonFa("btn_editor_tool_format", {
    icon: "magic",
    action: async () => {
      try {
        await editorMonaco.getAction("editor.action.formatDocument").run();
      } catch (error) {
        console.warn("Format action failed:", error);
      }
    },
  });
  editor._el_tool_container.appendChild(elBtnTidy);

  // Expand/collapse button
  const elBtnExpand = elButtonFa("btn_editor_tool_expand_editor", {
    icon: "expand",
    action: async () => {
      const elIcon = elBtnExpand.querySelector(".fa");
      const elTarget = editor.jsoneditor.element.parentElement;
      const elTargetContainer = elTarget.parentElement;
      const elWrapper = editor._el_monaco_wrapper;
      const isExpanded = elIcon.classList.contains("fa-compress");

      elIcon.classList.toggle("fa-compress");
      elIcon.classList.toggle("fa-expand");

      if (isExpanded) {
        elTarget.style.display = "block";
        editor.input.parentNode.insertBefore(elWrapper, editor.input);
        elWrapper.scrollIntoView(true);
      } else {
        elTarget.style.display = "none";
        elTargetContainer.appendChild(elWrapper);
      }
    },
  });
  editor._el_tool_container.appendChild(elBtnExpand);
}

function setupHelpPanel(editor) {
  if (!editor.options.htmlHelp) {
    return;
  }

  const elHelp = textToDom(editor.options.htmlHelp);
  const elBtnHelp = elButtonFa("btn_editor_tool_help", {
    icon: "question",
    action: () => {
      modalSimple({
        title: elSpanTranslate("btn_editor_tool_help_title"),
        content: elHelp,
        addBackground: true,
      });
    },
  });
  editor._el_tool_container.appendChild(elBtnHelp);
}

JSONEditor.defaults.resolvers.unshift(function (schema) {
  if (
    schema.type === "string" &&
    schema.format === "textarea" &&
    schema.options
  ) {
    if (schema.options.editor === "monaco") {
      return "monaco";
    }
  }
});

JSONEditor.defaults.editors.monaco = class MonacoEditor extends (
  JSONEditor.defaults.editors.string
) {
  refreshValue() {
    const editor = this;
    editor.value = editor.value || "";
    editor.serialized = editor.value;
  }

  setValue(value, initial, from_template) {
    const editor = this;
    if (editor.template && !from_template) {
      return;
    }

    if (isEmpty(value)) {
      value = "";
    } else if (isObject(value)) {
      value = safeJsonStringify(value);
    }

    if (value === editor.serialized) {
      return;
    }

    // Sanitize value before setting it
    const sanitized = editor.sanitize(value);
    editor.value = sanitized;

    if (editor._monaco_editor) {
      const model = editor._monaco_editor.getModel();
      model.setValue(sanitized);
    }

    const changed = from_template || editor.getValue() !== value;
    editor.refreshValue();

    if (initial) {
      editor.is_dirty = false;
    } else if (editor.jsoneditor.options.show_errors === "change") {
      editor.is_dirty = true;
    }

    if (editor.adjust_height) {
      editor.adjust_height(editor.input);
    }

    // Bubble editor setValue to parents if the value changed
    editor.onChange(changed);
  }

  async afterInputReady() {
    const editor = this;
    const mode = editor.options.language;
    const editors = jed.monacoEditors;

    if (editor.options.hidden) {
      editor.theme.afterInputReady(editor.input);
      return;
    }

    // Create UI elements
    editor._el_tool_container = el("div", {
      class: "btn-group",
      style: {
        width: "100%",
        paddingBottom: "2px",
        display: "flex",
      },
    });

    editor._el_monaco_container = el("div", {
      style: {
        width: "100%",
        height: "80vh",
        position: "relative",
        resize: "vertical",
      },
    });

    editor._el_monaco_wrapper = el(
      "div",
      {
        width: "100%",
        height: "100%",
        position: "relative",
      },
      [editor._el_tool_container, editor._el_monaco_container],
    );

    editor.input.parentNode.insertBefore(
      editor._el_monaco_wrapper,
      editor.input,
    );
    editor.input.style.display = "none";

    try {
      // Create Monaco editor instance
      const def = editor.schema.default;
      const value = editor.getValue() || def;

      let formattedValue = value;
      if (mode === "json") {
        const parsed = safeJsonParse(value, '""');
        formattedValue = safeJsonStringify(parsed);
      }

      const { monaco, editor: monacoEditor } = await createMonacoInstance(
        editor._el_monaco_container,
        {
          language: mode,
          value: formattedValue,
          theme: theme.isDarkMode() ? "vs-dark" : "vs-light",
          readOnly: editor.options.readOnly === true,
          automaticLayout: true,
          detectIndentation: false,
          tabSize: 2,
          indentSize: 2,
          autoIndent: true,
          formatOnPaste: true,
          wordWrap: "off",
          rulers: [80],
        },
      );

      editor._monaco = monaco;
      editor._editor = monaco.editor;
      editor._monaco_editor = monacoEditor;

      // Setup theme auto-switching
      this._update_theme = this._update_theme.bind(this);
      theme.on("set_colors", this._update_theme);

      // Listen for content changes
      editor._monaco_editor.onDidChangeModelContent(() => {
        const val = editor._monaco_editor.getValue() || "";
        editor.value = val;
        editor.refreshValue();
        editor.is_dirty = true;
        editor.onChange(true);
      });

      editor.theme.afterInputReady(editor.input);

      // Register editor for global management
      editors.push(editor._monaco_editor);

      // Setup additional features
      setupToolbar(editor);
      setupHelpPanel(editor);
    } catch (error) {
      console.error("Failed to initialize Monaco editor:", error);
      // Fallback to showing the original input
      editor.input.style.display = "block";
      editor._el_monaco_wrapper.style.display = "none";
    }
  }

  _update_theme() {
    const dark = theme.isDarkMode();
    if (this._monaco_editor && this._monaco) {
      this._monaco.editor.setTheme(dark ? "vs-dark" : "vs-light");
    }
  }

  disable() {
    const editor = this;
    editor.input.disabled = true;
    if (editor._monaco_editor) {
      editor._monaco_editor.updateOptions({ readOnly: true });
    }
    super.disable();
  }

  enable() {
    const editor = this;
    if (!editor.always_disabled) {
      editor.input.disabled = false;
      if (editor._monaco_editor) {
        editor._monaco_editor.updateOptions({ readOnly: false });
      }
    }
    super.enable();
  }

  destroy() {
    const editor = this;
    const monacoEditor = editor._monaco_editor;
    const editors = jed.monacoEditors || [];

    if (monacoEditor) {
      // Clean up theme handler
      theme.off("set_colors", this._update_theme);

      // Dispose Monaco editor
      monacoEditor.dispose();

      // Remove from global editors array
      if (editors.includes(monacoEditor)) {
        const pos = editors.indexOf(monacoEditor);
        editors.splice(pos, 1);
      }
    }

    // Clean up DOM elements
    if (editor._el_monaco_wrapper && editor._el_monaco_wrapper.parentNode) {
      editor._el_monaco_wrapper.parentNode.removeChild(
        editor._el_monaco_wrapper,
      );
    }
  }
};
