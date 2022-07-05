(function() {
  'use strict';

  JSONEditor.defaults.resolvers.unshift(function(schema) {
    if (
      schema.type === 'string' &&
      schema.format === 'textarea' &&
      schema.options
    ) {
      if (schema.options.editor === 'ace') {
        return 'ace';
      }
    }
  });

  JSONEditor.defaults.editors.ace = JSONEditor.defaults.editors.string.extend({
    refreshValue: function() {
      const editor = this;
      editor.value = editor.value || '';
      editor.serialized = editor.value;
    },
    setValue: function(value, initial, from_template) {
      const editor = this;
      if (editor.template && !from_template) {
        return;
      }

      if (value === null || typeof value === 'undefined') value = '';
      else if (typeof value === 'object') value = JSON.stringify(value);
      else if (typeof value !== 'string') value = '' + value;

      if (value === editor.serialized) return;

      // Sanitize value before setting it
      const sanitized = editor.sanitize(value);

      if (editor.input.value === sanitized) {
        return;
      }

      editor.value = sanitized;

      if (editor._ace_editor) {
        editor._ace_editor.setValue(sanitized);
      }

      const changed = from_template || editor.getValue() !== value;

      editor.refreshValue();

      if (initial) editor.is_dirty = false;
      else if (editor.jsoneditor.options.show_errors === 'change')
        editor.is_dirty = true;

      if (editor.adjust_height) editor.adjust_height(editor.input);

      // Bubble editor setValue to parents if the value changed
      editor.onChange(changed);
    },
    afterInputReady: async function() {
      const h = mx.helpers;
      const editor = this;
      const mode = editor.options.language;

      const editors = window.jed.aceEditors || [];

      if (editor.options.hidden) {
        editor.theme.afterInputReady(editor.input);
      } else {
        /**
         * Load module
         */

        const modules = await h.modulesLoad(['ace', 'js-beautify']);

        /**
         * Add layout
         */
        editor._el_tool_container = document.createElement('div');
        editor._el_ace_container = document.createElement('div');
        editor._el_ace_container.style.width = '100%';
        editor._el_ace_container.style.position = 'relative';
        editor.input.parentNode.insertBefore(
          editor._el_ace_container,
          editor.input
        );
        editor.input.style.display = 'none';

        editor._ace_editor = window.ace.edit(editor._el_ace_container);

        editor._ace_editor.session.on('changeMode', (e, session) => {
          if ('ace/mode/javascript' === session.getMode().$id) {
            if (!!session.$worker) {
              session.$worker.send('setOptions', [
                {
                  esversion: 9,
                  esnext: false
                }
              ]);
            }
          }
        });

        editor._ace_editor.session.setMode(`ace/mode/${mode}`);

        editor._ace_editor._set_theme_auto = () => {
          const mode = mx.theme.mode();
          let idTheme = 'ace/theme/github';
          if (mode === 'dark') {
            idTheme = 'ace/theme/monokai';
          }
          editor._ace_editor.setOptions({
            theme: idTheme
          });
        };

        editor._ace_editor.setValue(editor.getValue() || '');
        editor._ace_editor.getSession().selection.clearSelection();

        editor._ace_editor.setOptions({
          minLines: 1,
          maxLines: Infinity,
          autoScrollEditorIntoView: true,
          wrap: false,
          indentedSoftWrap: false
        });

        editor._ace_editor.setOption('indentedSoftWrap', false);

        editor._ace_editor._set_theme_auto();

        /*
         * Listen for changes
         */
        editor._ace_editor.on('change', function() {
          const val = editor._ace_editor.getValue() || '';
          editor.value = val;
          editor.refreshValue();
          editor.is_dirty = true;
          editor.onChange(true);
        });

        editor.theme.afterInputReady(editor.input);

        /**
         * Save in ace editors
         */
        editors.push(editor._ace_editor);

        /**
         * Set readonly if needed
         */
        if (editor.options.readOnly === true) {
          editor._ace_editor.setReadOnly(true);
        }

        /**
         * Add beautify button
         */
        if (
          (mode === 'javascript' || mode === 'json') &&
          editor.options.readOnly !== true
        ) {
          const elBeautifyBtn = document.createElement('button');
          elBeautifyBtn.className = 'btn btn-info';
          elBeautifyBtn.innerHTML = 'tidy';
          elBeautifyBtn.addEventListener('click', async () => {
            try {
              const beautify = modules[1].js;
              const session = editor._ace_editor.getSession();
              const code = session.getValue() || '';
              const codeClean = await beautify(code);
              session.setValue(codeClean);
            } catch (e) {
              h.modal({
                id: 'modalError',
                title: 'Error',
                content: '<p>Error during tidy process :' + JSON.stringify(e)
              });
            }
          });

          editor._el_tool_container.appendChild(elBeautifyBtn);
        }

        /**
         * Add optional help panel
         */
        if (editor.options.htmlHelp) {
          const elHelp = h.textToDom(editor.options.htmlHelp);
          const elBtn = document.createElement('button');

          elBtn.className = 'btn btn-info';
          elBtn.innerHTML = 'help';
          elBtn.addEventListener('click', function() {
            h.modal({
              id: 'modalHelp',
              title: 'Map-x help',
              content: elHelp
            });
          });

          editor._el_tool_container.appendChild(elBtn);
        }

        /**
         * Insert toolbar before input
         */
        editor.input.parentNode.insertBefore(
          editor._el_tool_container,
          editor._el_ace_container
        );
      }
    },
    disable: function() {
      const editor = this;
      editor.input.disabled = true;
      if (editor._ace_editor) {
        editor._ace_editor.setReadOnly(true);
      }
      editor._super();
    },
    enable: function() {
      const editor = this;
      if (!editor.always_disabled) {
        editor.input.disabled = false;
        if (editor._ace_editor) {
          editor._ace_editor.setReadOnly(false);
        }
      }
      editor._super();
    },
    destroy: function() {
      const aceEditor = this._ace_editor;
      const aceEditors = window.jed.aceEditors;
      if (aceEditor) {
        aceEditor.destroy();
        if (Array.isArray(aceEditors)) {
          const pos = aceEditors.indexOf(aceEditor);
          if (pos > -1) {
            aceEditors.splice(pos, 1);
          }
        }
      }
    }
  });
})();
