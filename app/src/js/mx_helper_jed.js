/*jshint esversion: 6 , node: true */

/**
 * @param {Object} o options
 * @param {String} o.id Id of target element
 * @param {Object} o.schema JSON schema to render
 * @param {Object} o.startVal JSON of initial values
 * @param {Object} o.options JSONEditor options
 */
export function jedInit(o) {

  return mx.helpers.moduleLoad("json-editor")
     .then(()=>{

      var id = o.id;
      var schema = o.schema;
      var startVal = o.startVal;
      var options = o.options;
      var JSONEditor = window.JSONEditor;
      var el = document.getElementById(id);
      var idDraft ;
      var draftLock = true;
      var draftDbTimeStamp = 0;
      
      var jed = window.jed ;

      if(!el) throw("jed element " + id + "not found");

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
        disableSelectize: false,
        enablePickolor : false,
        disable_edit_json : false,
        required_by_default : true,
        show_errors : "always",
        no_additional_properties : true,
        schema : schema,
        startval : startVal,
        draftAutoSaveEnable : false,
        draftAutoSaveId : null,
        draftTimestamp : null,
        getValidationOnChange : false,
        getValuesOnChange : false
      };

      for (var v1 in opt) { opt_final[v1] = opt[v1]; }
      for (var v2 in options) { opt_final[v2] = options[v2]; }

      if( opt_final.draftAutoSaveId && opt_final.draftAutoSaveDbTimestamp ){
        idDraft = id + "@" + opt_final.draftAutoSaveId;
        draftDbTimeStamp = opt_final.draftAutoSaveDbTimestamp;
      }
     
      JSONEditor.plugins.ace.theme = 'github';
      JSONEditor.plugins.selectize.enable = !opt_final.disableSelectize;

      /**
       * Remove old editor if already exists
       */
      if(jed.editors[id] && mx.helpers.isFunction(jed.editors[id].destroy)){
        jed.editors[id].destroy();
      }
      /**
       * Create new editor
       */
      el.innerHTML="";
      el.dataset.jed_id = id;
      var editor = new JSONEditor(el,opt_final);

      /**
       * Test for readyness
       */
      editor.on('ready',function() {
        jed.editors[id] = editor; 
     

        /**
        * Configure pickolor
        */
        if( opt_final.enablePickolor ){
          var pk = window.pk;
          if(pk){
            pk.destroy();
          }
          mx.helpers.moduleLoad("pickolor")
            .then(Pickolor => {
              window.pk = new Pickolor({
                container : el,
                onInitColor : ( target ) => {
                  return target.style.backgroundColor;
                },
                onPick : (color,target) => {
                  var idEditor = target.dataset.id_editor;
                  var ed = editor.editors[idEditor];
                  if(ed && ed.setValue){
                    ed.setValue(color);
                  }
                  target.style.backgroundColor = color;
                }
              });
            });
        }

        /**
         * Auto save draft
         */
        if( idDraft ){
          mx.data.draft.getItem(idDraft)
            .then( draft => {
              draftLock = false ;
              if( !draft || draft.type != "draft" ){
                return;
              }
              var draftClientTimeStamp = draft.timestamp;
              var moreRecent = draftClientTimeStamp > draftDbTimeStamp;
              
              if( moreRecent ){
                jedShowDraftRecovery({
                  id : id,
                  idDraft : idDraft,
                  timeDb : opt_final.draftAutoSaveDbTimestamp,
                  draft : draft,
                  saved : opt_final.startval
                });
              }
            })
            .catch((e)=>{
              draftLock = false ;
              throw new Error(e);
            });
        }
        /**
         * Report ready state to shiny
         */
        if(window.Shiny){
          Shiny.onInputChange(id + '_ready', (new Date()));     
        }else{
          console.log(id + "_ready");
        }
      });

      /**
       * On editor change
       */
      editor.on('change',function() {
        if( idDraft && !draftLock ){
          var data = editor.getValue();
          mx.data.draft.setItem( idDraft, {
            type : 'draft',
            timestamp : Math.round(Date.now()/1000),
            data : data
          })
          .then(m => {
             //console.log( "Auto save " + idDraft );
          });
        }

        /**
         * Set custom ui classes for errors
         */
        jedAddAncestorErrors(editor);
        jedValidateSize(editor);
        if(opt_final.getValidationOnChange){
          /**
          * Continous validation transfer on input
          */
          jedGetValidationById({id:id,idEvent:'change'});
        }
        if(opt_final.getValuesOnChange){
          /**
          * Continous data transfer on input
          */
          jedGetValuesById({id:id,idEvent:'change'});
        }
      });


    });
}


function jedValidateSize(editor){
  /**
   * Test size
   */
  var values = editor.getValue();
  var el = mx.helpers.el;
  new Promise(function(resolve,reject){
    var res = mx.helpers.getSizeOf(values,false);
    resolve(res);
  }).then(function(size){
    if( size > mx.settings.maxByteJed){
      var sizeReadable = mx.helpers.formatByteSize(size);
      mx.helpers.modal({
        addBackground:true,
        id:"warningSize",
        title:"Warning : size greater than " + mx.settings.maxByteJed + " ( " + sizeReadable + ")",
        content:el("b",
          "Warning: this form data is too big. Please remove unnecessary item(s) and/or source data (images, binary files) from a dedicated server.")
      });
    }
  });
}



/**
 * Add jed-error class to all ancestor of issue's element
 * @param {Object} editor json-editor
 */
function jedAddAncestorErrors(editor){
  var elEditor = editor.element;
  var elsJedError = elEditor.querySelectorAll(".jed-error");

  for(var i = 0; i < elsJedError.length ; i++){
    elsJedError[i].classList.remove("jed-error");
  }

  var valid = editor.validate();
  var issueLength =  valid.length;

  if(issueLength > 0){
    valid.forEach(v => {
      var p = v.path.split(".");
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
    });
  }
}
/** Remove draft
 * @param {Object} o options
 * @param {String} o.id Id of the editor
 * @param {Object} o.idItem id of the item to remove
 */
export function jedRemoveDraft(o){
  var idEditor = o.id;
  var idItem = o.idItem;
  var idDraft = idEditor + "@" + idItem;
  mx.data.draft.removeItem(idDraft)
  .then(()=>{
    console.log("item " + idDraft + "removed from mx.data.draft");
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

/** Get jed editor value
 * @param {Object} o options
 * @param {String} o.id Id of target element
 */
export function jedGetValuesById(o) {

  var id = o.id;
  var jed = mx.helpers.path(window,"jed.editors."+id);
  if(jed){
    var values = {
      data : jed.getValue(),
      time : Date.now(),
      idEvent : o.idEvent
    };
    if(values && window.Shiny){
      Shiny.onInputChange(id + '_values', values);     
    }else{
     return values;
    }
  }
}

/** Get jed editor validation
 * @param {Object} o options
 * @param {String} o.id Id of target element
 */
export function jedGetValidationById(o) {
  var id = o.id;
  var jed = mx.helpers.path(window,"jed.editors."+id);
  if(jed){
    var valid = {
      data : jed.validate(),
      time : Date.now(),
      idEvent : o.idEvent
    };
    if( window.Shiny ){
      Shiny.onInputChange(id + '_issues', valid);             
    }else{
      return values;
    }
  }
}
/** Show recovery panel
 * @param {Object} o options
 * @param {String} o.id Id of the editor
 * @param {String} o.idDraft Id of the draft
 * @param {Object} o.draft draft to recover
 * @param {Object} o.saved data provided from db
 * @param {Number} o.timeDb Posix time stamp of the db version
 */
function  jedShowDraftRecovery(o){

  if( ! o.draft || o.draft.type != "draft"){
    throw new Error({
      msg:"Invalid draft",
      data: o.draft
    });
  }
  var jed = mx.helpers.path(window,"jed.editors."+o.id);
  var recoveredData = o.draft.data;
  var dbData = o.saved;
  var dateTimeDb = formatDateTime(o.timeDb);
  var dateTimeBrowser = formatDateTime(o.draft.timestamp);
  var el = mx.helpers.el;
  var btnYes = el("button",{
    type:"button",
    class:["btn","btn-default"],
    "on":["click",restore]
  },
    "Use the most recent"
  );

  var btnDiffData = el("button",{
    type: "button",
    class:["btn","btn-default"],
    "on":["click",previewDiff]
  },"Preview diff");

  var elData = el("div");

  var modal = mx.helpers.modal({
    addBackground : true,
    id:"Data recovery",
    title:"Data recovery : more recent values found",
    buttons : [btnYes,btnDiffData],
    textCloseButton: "Cancel",
    content: el("div",
      el("h3","Summary"),
      el("p",
        el("ul",
          el("li","Last saved date : " + dateTimeDb),
          el("li","Recovered date : " + dateTimeBrowser)
        ),
        elData
      ))
  });


  function previewDiff(){
    var elItem = el("div",{
      class:["mx-diff-item"]
    });
    elData.classList.add("mx-diff-items");
    elData.appendChild(el("h3","Diffs"));
    elData.appendChild(elItem); 

    mx.helpers.jsonDiff(
      dbData,
      recoveredData,
      {
        toHTML: true,
        propertyFilter:function(name){
          var firstChar =  name.slice(0,1);
          /**
          * Set of known key that should not be used in diff
          */
          return name !== "spriteEnable" &&
            firstChar !== "_" &&
            firstChar !== '$';
        }
      })
      .then(html => {
        elItem.innerHTML = html;
      });
  }


  function previewData(){

  }

  function restore(){
    delete recoveredData._timestamp;
    jed.setValue(recoveredData);
    modal.close();
  }

}

function formatDateTime(posix){
  var d = new Date(posix*1000);
  var D = d.getDate();
  var M = d.getMonth()+1;
  var Y = d.getFullYear();
  var h = d.getHours();
  var m = d.getMinutes();
  var s = d.getSeconds();
  
  if(h<10) h = "0"+h;
  if(m<10) m = "0"+m;
  if(s<10) s = "0"+s;
  if(D<10) M = "0"+D;
  if(M<10) M = "0"+M;

  return D +"-"+ M +"-" + Y + " at " + h + ":" + m + ":"+ s; 
}


