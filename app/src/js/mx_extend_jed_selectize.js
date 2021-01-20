(function() {
  'use strict';

  const h = mx.helpers;

  JSONEditor.defaults.resolvers.unshift(function(schema) {
    if (schema.type === 'array' && schema.format === 'selectizeOptGroup') {
      return 'selectizeOptGroup';
    }
  });

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
                label : it, // will be replaced in render
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
          render: {
            item : editor.renderOption,
            option: editor.renderOption,
            optgroup_header: editor.renderOptionHeader
          },
          searchField: ['label','value'],
        });
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

        h.getDictItem(option.value).then(label => {
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
        const id = mx.helpers.makeId();
        const elHeader = h.el(
          'div',
          {
            id : id,
            class: 'optgroup-header'
          },
          option.value
        );
        h.getDictItem(option.value).then(v=>{
          const elH = document.getElementById(id);
          if(elH){
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
      },
      showValidationErrors: function(errors) {
        const editor = this;

        // Get all the errors that pertain to this editor
        const my_errors = [];
        const other_errors = [];

        errors.forEach((error) => {
          if (error.path === editor.path) {
            my_errors.push(error);
          } else {
            other_errors.push(error);
          }
        });

        // Show errors for editor editor
        if (editor.error_holder) {
          if (my_errors.length) {
            //const message = [];
            editor.error_holder.innerHTML = '';
            editor.error_holder.style.display = '';
            my_errors.forEach((error) => {
              editor.error_holder.appendChild(
                editor.theme.getErrorMessage(error.message)
              );
            });
          }
          // Hide error area
          else {
            editor.error_holder.style.display = 'none';
          }
        }
      }
    }
  );
})();
