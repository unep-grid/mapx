import { modalSimple } from "./mx_helper_modal.js";
import { moduleLoad } from "./modules_loader_async";
import { textToDom } from "./mx_helper_misc.js";
import { el, elSpanTranslate, elButtonFa } from "./el_mapx/index.js";
import { theme } from "./mx.js";
import { isEmpty } from "./is_test/index.js";
(function () {
  "use strict";

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

  JSONEditor.defaults.editors.monaco =
    JSONEditor.defaults.editors.string.extend({
      refreshValue: function () {
        const editor = this;
        editor.value = editor.value || "";
        editor.serialized = editor.value;
      },
      setValue: function (value, initial, from_template) {
        const editor = this;
        if (editor.template && !from_template) {
          return;
        }

        if (value === null || typeof value === "undefined") {
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

        if (editor.input.value === sanitized) {
          return;
        }

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
      },
      afterInputReady: async function () {
        const editor = this;
        const mode =
          editor.options.language === "javascript"
            ? "typescript"
            : editor.options.language;

        if (isEmpty(window.jed.monacoEditors)) {
          window.jed.monacoEditors = [];
        }
        const editors = window.jed.monacoEditors;

        if (editor.options.hidden) {
          editor.theme.afterInputReady(editor.input);
          return;
        }

        const addTools = !editor.options.readonly;

        /**
         * Add layout
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

        editor.input.parentNode.insertBefore(
          editor._el_monaco_container,
          editor.input
        );
        editor.input.style.display = "none";

        /**
         * Create instance
         */
        const monaco = await moduleLoad("monaco-editor");

        /**
         * set default;
         */
        editor._monaco = monaco;
        editor._editor = monaco.editor;
        editor._monaco_editor = monaco.editor.create(
          editor._el_monaco_container,
          {
            language: mode,
            value: editor.getValue(),
            theme: theme.isDarkMode() ? "vs-dark" : "vs-light",
            readOnly: editor.options.readOnly === true,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: "on",
            rulers: [80],
          }
        );

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

        /**
         * Add beautify button
         */
        if (addTools) {
          const elBtnTidy = elButtonFa("btn_editor_tool_format", {
            icon: "magic",
            action: async () => {
              await editor._monaco_editor
                .getAction("editor.action.formatDocument")
                .run();
            },
          });
          editor._el_tool_container.appendChild(elBtnTidy);
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
         * Insert toolbar before input
         */
        editor.input.parentNode.insertBefore(
          editor._el_tool_container,
          editor._el_monaco_container
        );
      },
      disable: function () {
        const editor = this;
        editor.input.disabled = true;
        if (editor._monaco_editor) {
          const model = editor._monaco_editor.getModel();
          model.updateOptions({ readOnly: true });
        }
        editor._super();
      },
      enable: function () {
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
        editor._super();
      },
      destroy: function () {
        const editor = this;
        const monacoEditor = editor._monaco_editor;
        const editors = window.jed.monacoEditors || [];
        if (monacoEditor) {
          monacoEditor.dispose();
          if (editors.includes(monacoEditor)) {
            const pos = editors.indexOf(monacoEditor);
            editors.splice(pos, 1);
          }
        }
      },
    });
})();
