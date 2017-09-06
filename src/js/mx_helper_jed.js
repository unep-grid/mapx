/*jshint esversion: 6 */

/* init */
/* NOTE: this should be rewritten */

export function render(id, schema, startVal, options ) {

  Promise.all([
  System.import("json-editor"),
  System.import("./mx_extend_jed_medium.js"),
  System.import("./mx_extend_jed_position.js")
  ]) .then(function(){

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


    /* end*/


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
 * @param id {string} id of the editor
 * @param val {object} object to populate editor, according to schema
 */
export function update(id, val) {
  var jed = jed.editors[[id]];
  if(jed){
    jed.setValue(val);
  }
}



