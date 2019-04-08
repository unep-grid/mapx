/*
 * Distributed under terms of the MIT license.
 */
(function() {
  'use strict';

  JSONEditor.defaults.resolvers.unshift(function(schema) {
    if (schema.type === 'string' && schema.format === 'color-picker') {
      return 'pickolor';
    }
  });

  JSONEditor.defaults.editors.pickolor = JSONEditor.defaults.editors.string.extend(
    {
      setValue: function(value, initial, from_template) {
        if (this.template && !from_template) {
          return;
        }

        if (value === null || typeof value === 'undefined') {
          value = '';
        } else if (typeof value === 'object') {
          value = JSON.stringify(value);
        } else if (typeof value !== 'string') {
          value = '' + value;
        }
        if (value === this.serialized) {
          return;
        }

        // Sanitize value before setting it
        var sanitized = this.sanitize(value);

        if (this.input.value === sanitized) {
          return;
        }

        this.input.value = sanitized;

        var changed = from_template || this.getValue() !== value;

        this.refreshValue();

        if (initial) {
          this.is_dirty = false;
        } else if (this.jsoneditor.options.show_errors === 'change') {
          this.is_dirty = true;
        }

        if (this.elColorPicker) {
          this.elColorPicker.style.backgroundColor = value;
        }

        // Bubble this setValue to parents if the value changed
        this.onChange(changed);
      },

      afterInputReady: function() {
        var that = this;
        if (that.options.hidden) {
          that.theme.afterInputReady(that.input);
        } else {
          var elColorPicker = document.createElement('button');
          elColorPicker.dataset.pickolor_trigger = true;
          var style = elColorPicker.style;
          var path = that.input.name.replace(/(\[)|(\]\[)|(\])/g, '.');
          path = path.substr(0, path.length - 1);
          elColorPicker.dataset.id_editor = path;
          style.width = 'calc( 100% - 4px )';
          style.height = '30px';
          style.padding = '10px';
          style.borderRadius = '5px';
          style.margin = '2px';
          style.backgroundColor = that.value;
          that.elColorPicker = elColorPicker;
          that.input.style.display = 'none';
          that.input.parentNode.insertBefore(elColorPicker, that.input);
        }
      }
    }
  );
})();
