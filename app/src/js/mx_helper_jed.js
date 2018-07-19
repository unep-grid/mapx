/*jshint esversion: 6 , node: true */
//'use strict';
import * as mx from './mx_init.js';
//var Image, Node,escape,unescape,$,postMessage,Shiny,self,Blob,URL,Worker,XMLHttpRequest, window, document, System;


/**
 * @param {Object} o options
 * @param {String} o.id Id of target element
 * @param {Object} o.schema JSON schema to render
 * @param {Object} o.startVal JSON of initial values
 * @param {Object} o.options JSONEditor options
 */
export function jedRender(o) {

  var id = o.id;
  var schema = o.schema;
  var startVal = o.startVal;
  var options = o.options;

  System.import("json-editor")
    .then(function(){
      return Promise.all([
        //System.import("./mx_extend_jed_medium.js"),
        System.import("./mx_extend_jed_position.js"),
        System.import("./mx_extend_jed_ace.js"),
        System.import("./mx_extend_jed_array2.js")
      ]);
    }).then(function(){
      var JSONEditor = window.JSONEditor;
      var el = document.getElementById(id);
      var jed = window.jed ;
      if(!jed){
        window.jed = jed = {
          editors : {},
          helper : {},
          extend : {
            position : {},
            texteditor : {}
          }
        };
      }

      if(!el) throw("jed element " + id + "not found");
      JSONEditor.plugins.ace.theme = 'github';
      JSONEditor.plugins.selectize.enable = true;

      var opt_final = {};

      if(!options){
        options = {};
      }

      // opt can't be changed after instantiation. 
      var opt = {
        ajax : true,
        theme : 'bootstrap3',
        iconlib : "bootstrap3",
        disable_collapse : false,
        disable_properties : true,
        disable_edit_json : false,
        required_by_default : true,
        show_errors : "always",
        no_additional_properties : true,
        schema : schema,
        startval : startVal
      };


      for (var v1 in opt) { opt_final[v1] = opt[v1]; }
      for (var v2 in options) { opt_final[v2] = options[v2]; }

      if(jed.editors[id]){
        jed.editors[id].destroy();
      }

      el.innerHTML="";
      var editor = new JSONEditor(el,opt_final);

      editor.on('ready',function() {
        var id = editor.element.id;
        if(window.Shiny){
          Shiny.onInputChange(id + '_ready', (new Date()));     
        }else{
          console.log(id + "_ready");
        }
      });

      editor.on('change',function() {
        var id = editor.element.id;

        var valid = {
          msg : editor.validate(),
          time : (new Date())
        };

        var values = {
          msg : editor.getValue(),
          time : (new Date())
        };

        /**
        * Test size
        */

        new Promise(function(resolve,reject){
          var res = mx.helpers.getSizeOf(values,false);
          resolve(res);
        }).then(function(size){
          if( size > mx.settings.maxByteJed){
            var sizeReadable = mx.helpers.formatByteSize(size); 

            mx.helpers.modal({
              id:"warningSize",
              title:"Warning : size greater than " + mx.settings.maxByteJed + " ( " + sizeReadable + ")",
              content:"Warning: this form data is too big. Please remove unnecessary item(s) and/or source data (images, binary files) from a dedicated server."
            });
          }
        });

        if(window.Shiny){
          Shiny.onInputChange(id + '_values', values);     
          Shiny.onInputChange(id + '_issues', valid);             
        }else{
          console.log(id + '_values :' + JSON.stringify( values ));
          console.log(id + '_issues :' + JSON.stringify( valid ));
        }

        /**
         * Add jed-error class to all ancestor of issue's element
         */
        var elEditor = editor.element;
        var elsJedError = elEditor.querySelectorAll(".jed-error");

        for(var i = 0; i < elsJedError.length ; i++){
          elsJedError[i].classList.remove("jed-error");
        }

        var issueLength =  valid.msg.length;

        if(issueLength > 0){
          for(var j = 0 ; j < issueLength; j++){
            var p = valid.msg[j].path.split(".");
            var pL = p.length;
            for(var k =0; k < pL ; k++){
              var elError = elEditor
                .querySelector("[data-schemapath='"+p.join(".")+"']");

              if(elError){
                elError
                  .classList
                  .add("jed-error");
              }
              p.pop();
            }
          }
        }

      });

      jed.editors[id] = editor; 
    });
} 

/** Update jed editor
 * @param {Object} o options
 * @param {String} o.id Id of target element
 * @param {Object} o.val JSON of initial values
 */
export function jedUpdate(o) {

  var id = o.id;
  var val = o.val;
  var jed = mx.helpers.path(window,"jed.editors."+id);
  if(jed){
    jed.setValue(val);
  }
}



