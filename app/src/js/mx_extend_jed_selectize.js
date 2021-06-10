import {getGemetConcept, searchGemetLabelDefinition} from './gemet_util/index.js';

(function() {
  'use strict';

  const h = mx.helpers;
  const el = h.el;

  JSONEditor.defaults.resolvers.unshift(function(schema) {
    if (schema.type === 'array' && schema.format === 'selectizeGemet') {
      return 'selectizeGemet';
    }
  });

  JSONEditor.defaults.resolvers.unshift(function(schema) {
    if (schema.type === 'array' && schema.format === 'selectizeOptGroup') {
      return 'selectizeOptGroup';
    }
  });

  /**
   * Gemet specific input : remote fetch
   */

  JSONEditor.defaults.editors.selectizeGemet = JSONEditor.AbstractEditor.extend(
    {
      initValue: async function(value) {
        const editor = this;
        const selectize = editor.input.selectize;
        if (editor._init_value) {
          return;
        }
        /*
         * Add initial option:
         * Fetch concepts and push items like
         * {value:<string>,definition:<string>,label:<string>}
         */
        if (value.length > 0) {
          for (let v of value) {
            const c = await getGemetConcept(v);
            selectize.addOption(c);
          }
          editor._init_value = true;
        }
      },
      build: function() {
        const editor = this;
        editor.title = editor.theme.getFormInputLabel(editor.getTitle());
        editor.title_controls = editor.theme.getHeaderButtonHolder();
        editor.title.appendChild(editor.title_controls);
        editor.error_holder = document.createElement('div');

        if (editor.schema.description) {
          editor.description = editor.theme.getDescription(
            editor.schema.description
          );
        }

        editor.input = document.createElement('select');
        editor.input.setAttribute('multiple', 'multiple');

        const group = editor.theme.getFormControl(
          editor.title,
          editor.input,
          editor.description
        );

        editor.container.appendChild(group);
        editor.container.appendChild(editor.error_holder);

        window.jQuery(editor.input).selectize({
          valueField: 'value',
          labelField: 'label',
          searchField: ['label', 'definition'],
          options: [],
          multiple: true,
          maxItems: 30,
          render: {
            option: function(item, escape) {
              return el(
                'div',
                {
                  style: {
                    padding: '10px'
                  }
                },
                el('h3', escape(item.label)),
                el('p', escape(item.definition))
              );
            }
          },
          load: async function(query, callback) {
            /**
             * When the user search, fetch and
             * format results for the callback
             */
            if (!query.length) return callback();
            try {
              const value = await searchGemetLabelDefinition(query);
              return callback(value);
            } catch (e) {
              callback();
              console.warn(e);
            }
          }
        });

        editor.refreshValue();
      },
      postBuild: function() {
        const editor = this;
        editor.input.selectize.on('change', function() {
          editor.refreshValue();
          editor.onChange(true);
        });
      },
      destroy: function() {
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
        editor._super();
      },
      empty: function() {},
      setValue: async function(value) {
        try {
          const editor = this;
          const selectize = editor.input.selectize;
          selectize.clear(true);
          value = h.isArray(value) ? value : [value];
          await editor.initValue(value);
          selectize.setValue(value);
          editor.refreshValue();
        } catch (e) {
          console.warn(e);
        }
      },
      refreshValue: function() {
        const editor = this;
        editor.value = editor.input.selectize.getValue();
      }
    }
  );

  /**
   * Generic input with group + async translation
   */

  JSONEditor.defaults.editors.selectizeOptGroup = JSONEditor.AbstractEditor.extend(
    {
      initGroups: function() {
        const editor = this;
        /**
         * Addition
         * - async
         * - Add group options
         */
        const grp = h.path(editor, 'schema.options.groupOptions');
        if (grp) {
          editor._group_init = true;
          const selectize = editor.input.selectize;
          // User can't create new entry
          selectize.settings.create = false;
          // Remove existing options
          selectize.clearOptions();
          // For each group, add an option
          for (let k in grp) {
            selectize.addOptionGroup(k, {
              key: k
            });
            const items = grp[k];
            for (let i = 0, iL = items.length; i < iL; i++) {
              const it = items[i];
              selectize.addOption({
                label: it, // will be replaced in render
                value: it,
                optgroup: k
              });
            }
          }
        }
      },
      build: function() {
        const editor = this;
        editor.title = editor.theme.getFormInputLabel(editor.getTitle());
        editor.title_controls = editor.theme.getHeaderButtonHolder();
        editor.title.appendChild(editor.title_controls);
        editor.error_holder = document.createElement('div');

        if (editor.schema.description) {
          editor.description = editor.theme.getDescription(
            editor.schema.description
          );
        }

        editor.input = document.createElement('select');
        editor.input.setAttribute('multiple', 'multiple');

        const group = editor.theme.getFormControl(
          editor.title,
          editor.input,
          editor.description
        );

        editor.container.appendChild(group);
        editor.container.appendChild(editor.error_holder);

        window.jQuery(editor.input).selectize({
          delimiter: false,
          createOnBlur: true,
          create: true,
          showAddOptionOnCreate: false,
          render: {
            item: editor.renderOption,
            option: editor.renderOption,
            optgroup_header: editor.renderOptionHeader
          },
          searchField: ['label', 'value']
        });
        editor.refreshValue();
      },
      renderOption: function(option) {
        const elOption = h.el(
          'div',
          {
            class: 'option',
            dataset: {
              selectable: true,
              value: option.value
            }
          },
          option.value
        );

        h.getDictItem(option.value).then((label) => {
          elOption.innerText = label;
          option.label = label;
        });

        return elOption;
      },
      renderOptionHeader: function(option) {
        /**
         * Selectize seems to delete or clone header buit here.
         * It's not possible to async set label: it's removed. USELESS renderer !
         * Ugly hack : set an id and.. find it using getElementById.
         */
        const id = h.makeId();
        const elHeader = h.el(
          'div',
          {
            id: id,
            class: 'optgroup-header'
          },
          option.value
        );
        h.getDictItem(option.value).then((v) => {
          const elH = document.getElementById(id);
          if (elH) {
            elH.innerText = v;
          }
        });
        return elHeader;
      },
      postBuild: function() {
        const editor = this;
        editor.input.selectize.on('change', function() {
          editor.refreshValue();
          editor.onChange(true);
        });
      },
      destroy: function() {
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
        editor._super();
      },
      empty: function() {},
      setValue: function(value) {
        const editor = this;
        if (!editor._group_init) {
          editor.initGroups();
        }
        const selectize = editor.input.selectize;
        selectize.clear(true);
        value = h.isArray(value) ? value : [value];
        editor.input.selectize.setValue(value);
        editor.refreshValue();
      },
      refreshValue: function() {
        const editor = this;
        editor.value = editor.input.selectize.getValue();
      }
    }
  );
})();
