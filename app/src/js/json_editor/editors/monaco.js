import { JSONEditor } from "@json-editor/json-editor";
import { modalSimple } from "./../../mx_helper_modal.js";
import { moduleLoad } from "./../../modules_loader_async";
import { textToDom } from "./../../mx_helper_misc.js";
import { el, elSpanTranslate, elButtonFa } from "./../../el_mapx/index.js";
import { theme } from "./../../mx.js";
import { jed } from "./../index.js";
import { DataDiffModal } from "../../data_diff_recover/index.js";
import { isEmpty } from "../../is_test/index.js";

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

JSONEditor.defaults.editors.monaco = class mxeditors extends (
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
    } else if (typeof value === "object") {
      value = JSON.stringify(value);
    } else if (typeof value !== "string") {
      value = "" + value;
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

    /**
     * wrapper
     *  - tools
     *  - container
     */
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

    /**
     * Create instance
     */
    const monaco = await moduleLoad("monaco-editor");

    /**
     * set default;
     */
    const value = editor.getValue();
    editor._monaco = monaco;
    editor._editor = monaco.editor;
    editor._monaco_editor = monaco.editor.create(editor._el_monaco_container, {
      language: mode,
      value:
        mode === "json"
          ? JSON.stringify(JSON.parse(value || '""'), 0, 2)
          : value,
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
    });

    editor._monaco_editor._set_theme_auto = () => {
      const dark = theme.isDarkMode();
      editor._monaco_editor.setTheme(dark ? "vs-dark" : "vs-light");
    };

    /*
     * Listen for changes
     */

    editor._monaco_editor.onDidChangeModelContent(() => {
      const val = editor._monaco_editor.getValue() || "";
      editor.value = val;
      editor.refreshValue();
      editor.is_dirty = true;
      editor.onChange(true);
    });

    editor.theme.afterInputReady(editor.input);

    /**
     * Save in ace editors
     */
    editors.push(editor._monaco_editor);

    await handleCustomFeatures(editor);
  }

  disable() {
    const editor = this;
    editor.input.disabled = true;
    if (editor._monaco_editor) {
      const model = editor._monaco_editor.getModel();
      model.updateOptions({ readOnly: true });
    }
    super.disable();
  }
  enable() {
    const editor = this;
    if (!editor.always_disabled) {
      editor.input.disabled = false;
      if (editor._monaco_editor) {
        editor.input.disabled = true;
        if (editor._monaco_editor) {
          const model = editor._monaco_editor.getModel();
          model.updateOptions({ readOnly: false });
        }
      }
    }
    super.enable();
  }
  destroy() {
    const editor = this;
    const monacoEditor = editor._monaco_editor;
    const editors = jed.monacoEditors || [];
    if (monacoEditor) {
      monacoEditor.dispose();
      if (editors.includes(monacoEditor)) {
        const pos = editors.indexOf(monacoEditor);
        editors.splice(pos, 1);
      }
    }
  }
};

async function handleCustomFeatures(editor) {
  const options = editor.options;
  const editorMonaco = editor._monaco_editor;
  /**
   * Add tools
   */
  if (!options.readonly) {
    const elBtnTidy = elButtonFa("btn_editor_tool_format", {
      icon: "magic",
      action: async () => {
        await editorMonaco.getAction("editor.action.formatDocument").run();
      },
    });
    editor._el_tool_container.appendChild(elBtnTidy);
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
          editor.input.parentNode.insertBefore(
            editor._el_monaco_wrapper,
            editor.input,
          );
          editor._el_monaco_wrapper.scrollIntoView(true);
        } else {
          elTarget.style.display = "none";
          elTargetContainer.appendChild(elWrapper);
        }
      },
    });
    editor._el_tool_container.appendChild(elBtnExpand);
  }

  /**
   * Add optional help panel
   */
  if (editor.options.htmlHelp) {
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

  /**
   * Theme editor management
   * - import
   * - preview
   * -
   */
  if (editor.options.resolver === "theme_editor") {
    const elBtnThemeImport = elButtonFa(
      "btn_editor_tool_import_current_theme",
      {
        icon: "download",
        action: async () => {
          const importTheme = await theme.getFromInput();

          const projectTheme = JSON.parse(editorMonaco.getValue());

          if (isEmpty(projectTheme)) {
            editorMonaco.setValue(JSON.stringify(importTheme, 0, 2));
          } else {
            const diff = new DataDiffModal({
              contextLabel: "Theme Editor Diff",
              dataSource: projectTheme,
              dataTarget: importTheme,
              onAccept: (data) => {
                editorMonaco.setValue(JSON.stringify(data, 0, 2));
              },
            });

            await diff.start();
          }
        },
      },
    );
    editor._el_tool_container.appendChild(elBtnThemeImport);
  }
}
