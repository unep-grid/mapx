/*
 * mx_extend_jed_codemirror.js
 *
 */
(function(){
  'use strict';

  JSONEditor.defaults.resolvers.unshift(function(schema) {
    if(schema.type === "string" && schema.format === "textarea" && schema.options) {
      if( schema.options.editor === "codemirror"){
        return "codemirror";
      }
    }
  });

  JSONEditor.defaults.editors.codemirror = JSONEditor.defaults.editors.string.extend({

    refreshValue: function() {
      this.value = this.value || "";
      this.serialized = this.value;
    },
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

      this.value = sanitized;

      if(this.codemirror_editor) {
        this.codemirror_editor.setValue(sanitized);
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
      var that = this;
      var mode = this.options.language;

      //function getMode(mode){
        //var out;
        //switch(mode){
          //case "html" :
            //out = System.import("brace/mode/html");
            //break;
          //case "javascript":
            //out = System.import("brace/mode/javascript");
            //break;
          //default:
            //out = System.import("brace/mode/text");
            //break;
        //}
        //return(out);
      //}
//v
      
      if( that.options.hidden ){
        that.theme.afterInputReady(that.input);
      }else{


        var CodeMirror;


        Promise.all([
          System.import('codemirror'),
          System.import('codemirror/lib/codemirror.css')
        ])
          .then(function(m){
            CodeMirror = m[0];
            return System.import('codemirror/mode/javascript/javascript.js');
          })
          .then(function(){

            that.codemirror_container = that.input;
            that.codemirror_container.style.width = '100%';
            that.codemirror_container.style.minHeight = '80vh';
            that.codemirror_container.style.position = 'relative';
            //that.input.parentNode.insertBefore(that.codemirror_container,that.input);
            //that.input.style.display = 'none';

            that.codemirror_editor = CodeMirror.fromTextArea(that.codemirror_container, {
              lineNumbers : true,              
              mode: mode || "text",
              readOnly : that.options.readOnly === true
            });
            that.codemirror_editor.setSize('100%','100%');

            that.codemirror_editor.setValue(that.getValue()||"");
            
            // Listen for changes
            that.codemirror_editor.on('change',function() {
              var val = that.codemirror_editor.getValue()||"";
              that.value = val;
              that.refreshValue();
              that.is_dirty = true;
              that.onChange(true);
            });


            /**
             * Add toolbar
             */

            var elToolContainer  = document.createElement("div");

            /**
             * Add beautify button
             */
            if( (mode == "javascript" || mode == "json" ) && that.options.readOnly !== true ){


              var elBeautifyBtn = document.createElement("button");
              elBeautifyBtn.className = "btn btn-info";
              elBeautifyBtn.innerHTML= "tidy";
              elToolContainer.appendChild(elBeautifyBtn);
              elBeautifyBtn.addEventListener("click",function(){
              System.import('js-beautify')
                .then(function(beautify){
                    var val = that.codemirror_editor.getValue();
                    var valClean = beautify(val);
                    that.codemirror_editor.setValue(valClean);
                });
              });

            }

            /**
             * Add optional help panel
             */
            if( that.options.htmlHelp ){
              var elHelp = mx.helpers.textToDom( that.options.htmlHelp );
              var elBtn = document.createElement("button");

              elBtn.className = "btn btn-info";
              elBtn.innerHTML= "help";
              elBtn.addEventListener("click",function(){
                mx.helpers.modal({
                  id : "modalHelp",
                  title : "Map-x help",
                  content : elHelp
                });
              });

              elToolContainer.appendChild(elBtn);
            }

            /**
             * Insert toolbar before input
             */
            that.input.parentNode.insertBefore(elToolContainer,that.codemirror_container);
          });

      }

    },
    disable: function() {
      this.input.disabled = true;
      if( this.codemirror_editor ){
         this.codemirror_editor.setOption('readonly',true);
      }
      this._super();
    },
    enable: function() {
      if(!this.always_disabled) {
        this.input.disabled = false;
        if( this.codemirror_editor ){
         this.codemirror_editor.setOption('readonly',false);
        }
      }
      this._super();
    },
    destroy: function() {
      if(this.codemirror_editor) {
         this.codemirror_editor.toTextArea();
      }
    }

  });


})();
