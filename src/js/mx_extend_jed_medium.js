/*
 * mx_extend_jed_medium.js
 * Copyright (C) 2017 fxi <fxi@mbp-fxi.home>
 *
 * Distributed under terms of the MIT license.
 */
(function(){
  'use strict';

  JSONEditor.defaults.resolvers.unshift(function(schema) {
    console.log(schema.format);
    if(schema.type === "string" && schema.format === "medium") {
      return "medium";
    }
  });

  JSONEditor.defaults.editors.medium = JSONEditor.defaults.editors.string.extend({
     setValue: function(value,initial,from_template) {
        var self = this;

        if(value === null || typeof value === 'undefined') value = "";
        if(value === this.serialized) return;

        var changed = from_template || this.getValue() !== value;

        this.refreshValue();

        if(initial) this.is_dirty = false;
        else if(this.jsoneditor.options.show_errors === "change") this.is_dirty = true;

        if(this.adjust_height) this.adjust_height(this.input);

       if(value === this.serialized) return;

        // Sanitize value before setting it
        var sanitized = this.sanitize(value);

        if(this.input.value === sanitized) {
          return;
        }

        this.input.value = sanitized;

         
        //this.medium_instance.val(sanitized);
 
        // Bubble this setValue to parents if the value changed
        this.onChange(changed);

     },
      afterInputReady: function() {

        var self = this, options;

        // Code editor
        if(!self.options.hidden ){

          System.import('medium-editor').then(function(MediumEditor){
            
            require('medium-editor/dist/css/medium-editor.min.css');
            require('medium-editor/dist/css/themes/flat.min.css');
            require('../css/mx_jed_medium_flat.css');
            require('./mx_extend_jed_medium_dragdrop.js');

            self.medium_container = document.createElement("div");
            self.medium_container.innerHTML = self.value;

            self.input.parentNode.insertBefore(self.medium_container,self.input);
            self.input.style.display = 'none';

            self.medium_editor = new MediumEditor(self.medium_container,{
              buttonLabels:"fontawesome",
              toolbar: {
                buttons: ['h1','h2','h3','bold', 'italic', 'quote', 'anchor','unorderedlist']
              }
            });

            self.medium_editor.subscribe('editableInput', function (event, editable) {
              self.input.value = editable.innerHTML;
              self.refreshValue();
              self.is_dirty = true;
              self.onChange(true);
            });

          });

        }

        self.theme.afterInputReady(self.input);
      }

  });


})();
