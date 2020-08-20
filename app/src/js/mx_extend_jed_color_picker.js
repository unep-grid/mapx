import {el} from '@fxi/el';
import Picker from 'vanilla-picker';

const color_pickers = [];

/*
 * Distributed under terms of the MIT license.
 */
(function() {
  'use strict';

  JSONEditor.defaults.resolvers.unshift(function(schema) {
    if (schema.type === 'string' && schema.format === 'color-picker') {
      return 'colorpicker';
    }
  });

  JSONEditor.defaults.editors.colorpicker = JSONEditor.defaults.editors.string.extend(
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

        if (this._elColorPicker) {
          this._elColorPicker.style.backgroundColor = value;
        }

        // Bubble this setValue to parents if the value changed
        this.onChange(changed);
      },

      afterInputReady: function() {
        var that = this;
        if (that.options.hidden) {
          that.theme.afterInputReady(that.input);
        } else {
          var elColorPicker = el('button', {
            style: {
              width: 'calc( 100% - 4px )',
              height: '30px',
              padding: '10px',
              borderRadius: '5px',
              margin: '2px',
              backgroundColor: that.value
            }
          });
          elColorPicker.addEventListener('click',show);
          that.input.style.display = 'none';
          that.input.parentNode.insertBefore(elColorPicker, that.input);
          that._elColorPicker = elColorPicker;
        }

        function show() {
          if (that._color_picker) {
            return;
          }
          while (color_pickers.length) {
            const p = color_pickers.pop();
            try {
              p.destroy();
            } catch (e) {}
          }
          const picker = new Picker(elColorPicker);
          picker.show();
          picker.setColour(that.value);
          console.log(picker);
          /**
           * Keep ref to keep things clean on destroy
           * or if another button is clicked
           */
          that._color_picker = picker;
          picker._input = that;
          color_pickers.push(picker);

          /**
           * On Change
           */
          picker.onChange = (color) => {
            elColorPicker.style.background = color.rgbaString;
            that.setValue(color.rgbaString);
          };
          /**
           * On close
           */
          picker.onClose = () => {
            that._color_picker = null;
            try {
              picker.destroy();
            } catch (e) {}
          };
          /**
           * On done (click ok)
           */
          picker.onDone = (color) => {
            that.input.value = color.rgbaString;
            that._color_picker = null;
            try {
              picker.destroy();
            } catch (e) {}
          };
        }
      }
    }
  );
})();
