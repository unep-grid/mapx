/*
 * mx_extend_jed_medium.js
 * Copyright (C) 2017 fxi <fxi@mbp-fxi.home>
 *
 * Distributed under terms of the MIT license.
 */
(function(){
  'use strict';

  JSONEditor.defaults.resolvers.unshift(function(schema) {
    if(schema.type === "string" && schema.format === "medium") {
      return "medium";
    }
  });

  JSONEditor.defaults.editors.medium = JSONEditor.defaults.editors.string.extend({
    setValue: function(value,initial,from_template) {
      var self = this;

      if(this.template && !from_template) {
        return;
      }

      if(value === null || typeof value === 'undefined') value = "";
      else if(typeof value === "object") value = JSON.stringify(value);
      else if(typeof value !== "string") value = ""+value;

      if(value === this.serialized) return;

      // Sanitize value before setting it
      var sanitized = this.sanitize(value);

      if(this.input.value === sanitized) {
        return;
      }

      this.input.value = sanitized;

      if(this.medium_editor){
        this.medium_editor.setContent(sanitized);
      }

      var changed = from_template || this.getValue() !== value;

      this.refreshValue();

      if(initial) this.is_dirty = false;
      else if(this.jsoneditor.options.show_errors === "change") this.is_dirty = true;

      if(this.adjust_height) this.adjust_height(this.input);

      // Bubble this setValue to parents if the value changed
      this.onChange(changed);
    },
    afterInputReady: function() {

      var self = this, options;

      // Code editor
      if( !self.options.hidden && !self._init ){
        self._init = true;
        self.theme.afterInputReady(self.input);

        return import('medium-editor')
          .then(({ "default": MediumEditor }) => {

            // medium-editor-tables need Medium editor on window...
            window.MediumEditor = MediumEditor;

            Promise.all([
              import('medium-editor-tables'),
              import('medium-editor/dist/css/medium-editor.min.css'),
              import('medium-editor/dist/css/themes/flat.min.css'),
              import('medium-editor-tables/dist/css/medium-editor-tables.css'),
              import('../css/mx_jed_medium_flat.css'),
              import('./mx_extend_jed_medium_dragdrop.js')
            ]).then(function(m){
              var MediumEditorTable = m[0];
              m[5].addDragDropToMedium(MediumEditor);

              self.medium_container = document.createElement("div");
              self.medium_container.innerHTML = self.input.value;

              self.input.parentNode.insertBefore(self.medium_container,self.input);
              self.input.style.display = 'none';

              self.medium_editor = new MediumEditor(self.medium_container,{
                buttonLabels:"fontawesome",
                toolbar: {
                  buttons: ['table','h1','h2','h3','bold', 'italic', 'quote', 'anchor','unorderedlist',"justifyLeft","justifyCenter","justifyRight","justifyFull"]
                },
                extensions: {
                  table: new MediumEditorTable()
                }
              });

              self.medium_editor.setContent(self.getValue());

              self.medium_editor.subscribe('editableInput', function (event, editable) {
                self.input.value = editable.innerHTML;
                self.refreshValue();
                self.is_dirty = true;
                self.onChange(true);
              });

            });

          });
      }

    },
    destroy: function() {
      if(this.medium_editor) {
        this.medium_editor.destroy();
      }
    }

  });


})();
