/* jshint esversion:6 */

export function triggerUploadForm(opt){
  var el = mx.helpers.el;

  /* 
   * Get elements
   */
  var elForm = document.getElementById(opt.idForm);
  var elTitle = elForm.querySelector("#txtUploadSourceFileName");
  var elEmail = elForm.querySelector("#txtEmailSourceUpload");
  var elButton = document.getElementById("btnSourceUpload");

  /*
   * Create fake input
   */
  var elInput =  el('input',{
    type : 'file',
    class : 'mx-hide',
    on : ['change',upload]
  });

  elForm.appendChild(elInput);
  elInput.click();

  /**
   * Upload file helper
   */
  function upload(){
    /*
     * Disable inputs
     */
    elEmail.setAttribute("disabled",true);
    elTitle.setAttribute("disabled",true);
    elButton.setAttribute("disabled",true);

    /**
     * Get values
     */
    var title = elTitle.value;
    var file  = elInput.files[0];

    uploadSource({
      file : file,
      title : title,
      selectorProgressContainer : elForm
    });
  }
}




export function uploadGeojsonModal(idView){
  var h = mx.helpers;
  var el = mx.helpers.el;
  var email = mx.settings.user.email;
  var role = mx.settings.user.role;
  var idUser = mx.settings.user.id;
  var project = mx.settings.project;
  var token = mx.settings.user.token;


  mx.data.geojson.getItem(idView).then(function(item){
    var geojson  = mx.helpers.path(item,"view.data.source.data");
    var title =  mx.helpers.path(item,"view.data.title.en"); 
    var hasIssue = false;
    if(!title) title = idView;
    if(!geojson) return;

    var elBtnUpload = el('buton','Upload',{
      class : 'btn btn-default',
      on:['click', upload]
    });

    var elInput =  el('input', {
      class : 'form-control',
      id : 'txtInputSourceTitle',    
      type : 'text',
      placeholder : 'Source title',
      value : title,
      on : ["input",validateTitle]
    });

    var elWarning = el('span');
    var elProgress = el('div');

    var elLabel = el( 'label', 'Title of the source' , { 
      for : 'txtInputSourceTitle'
    });

    var elFormGroup = el('div',
      {
        class : 'form-group' 
      }, 
      elLabel,
      elInput,
      elWarning,
      elProgress
    );

    var elFormUpload = el('div',
      elFormGroup
    );

    h.modal({
      title : "Upload " + title,
      content: elFormUpload,
      buttons : [elBtnUpload]
    });

    function upload(){
      if(hasIssue) return;
      elBtnUpload.setAttribute('disabled',true);
      elBtnUpload.remove();
      uploadSource({
        title : elInput.value || title || idView,
        geojson : geojson,
        selectorProgressContainer : elProgress
      });
    }

    function validateTitle(){
      var title = elInput.value.trim();

      hasIssue = false;

      if( title.length < 5 ){
        hasIssue = true;
        elWarning.innerText = "Title too short";
      }
      if( title.length > 50 ){
        hasIssue = true;
        elWarning.innerText = "Title too long";
      }
      if(hasIssue){
        elFormGroup.classList.add("has-error");
        elBtnUpload.setAttribute("disabled",true);
      }else{
        elBtnUpload.removeAttribute("disabled");
        elFormGroup.classList.remove("has-error");
        elWarning.innerText = "";
      }
    }

    

  });

}


/**
* Upload source wrapper
*
* @param {Object} o Options
* @param {String} o.idUser id of the user
* @param {String} o.idProject id of the project
* @param {String} o.token user token
* @param {String} o.email user email
* @param {String} o.title title of the source 
* @param {File} o.file Single file object
* @param {Object|String} o.geojson Geojson data
* @param {Node|String} o.selectorProgressContainer Selector or element where to put the progress bar container 
*/
function uploadSource(o){


  /* Server will validate token, 
   * but we can avoid much trouble here
   */
  if(mx.settings.user.guest) return;

  /** 
   ** rebuilding formdata, as append seems to add value in UI...
   **/
  var host = mx.helpers.getApiUrl('uploadVector');

  if( o.geojson ){
    o.geojson = typeof(o.geojson) == "string" ? o.geojson : JSON.stringify(o.geojson);
    o.file = new File([o.geojson], mx.helpers.makeId(12) + '.geojson',{type: "application/json"});
  }
  /*
   * create upload form
   */
  var form = new FormData(); 
  form.append('title',o.title);
  form.append('vector',o.file || o.geojson);
  form.append('token',o.token || mx.settings.user.token);
  form.append('idUser',o.idUser || mx.settings.user.id);
  form.append('email',o.email || mx.settings.user.email);
  form.append('project',o.idProject || mx.settings.project);

  /**
   * Create ui
   */ 

  var progressMsg = "";
  var elProgressTarget = o.selectorProgressContainer instanceof Node ? o.selectorProgressContainer : document.querySelector(o.selectorProgressContainer);
  var el = mx.helpers.el;
  var elProgressLabel =  el("label","Progress");
  var elLogLabel =  el("label","Logs");


  /* progress bar */
  var elProgressBar = el("div",{
    class: 'mx-inline-progress-bar'
  });
  var elProgressBarContainer = el("div",{
    class: 'mx-inline-progress-container'
  },elProgressBar);
  var elProgressMessageContainer = el("div",{
    class: ['form-control', 'mx-logs']
  });

  var elProgressMessage = el("ul");

  elProgressMessageContainer.appendChild(elProgressMessage);

  var elProgressContainer = el("div",
    elProgressLabel,
    elProgressBarContainer,
    elLogLabel,
    elProgressMessageContainer
  );

  elProgressTarget.appendChild(elProgressContainer);

  mx.helpers.sendData({
    maxWait : 1e3 * 60 * 60,
    url : host,
    data : form,
    onProgress : function(progress){
      cleanMsg(progress);
    },
    onMessage : function(data){
      cleanMsg(data);
    },
    onSuccess : function(data){
      cleanMsg(data);
    },
    onError: function(er){
      cleanMsg(er);
    }
  });

  var uploadDone = false;

  function updateLayerList(){
    Shiny.onInputChange( 'mglEvent_update_source_list',{
      date : new Date() * 1
    });
  }

  var messageStore = {};

  function cleanMsg(msg){
    return mx.helpers.handleRequestMessage( msg, messageStore ,{
      end : function(msg){
        var li = el("li",{
          class : ['mx-log-item','mx-log-green'] 
        },"Process done,the data should be available in sources list");
        elProgressMessage.appendChild(li);
        updateLayerList();
      },
      error :function(msg){
        var li = el("li",{
          class:['mx-log-item','mx-log-red']},
          msg);
        elProgressMessage.appendChild(li);
      },
      message : function(msg){
        var li = el("li",{
          class:['mx-log-item','mx-log-gray']},
          msg);
        elProgressLabel.innertText = "Importation progress";
        elProgressMessage.appendChild(li);
      },
      progress : function(progress){
        elProgressLabel.innerText = "Upload progress";
        elProgressBar.style.width = progress + "%";
        if( progress >= 99.9 && !uploadDone ){
          uploadDone = true;
          var msg = "Upload done. Importation in DB, please wait, this could take a while...";
          var li = el("li",{
            class:['mx-log-item','mx-log-white']},
            msg);
          elProgressMessage.appendChild(li);
        }
      },
      default : function(msg){
        if(msg && msg.length>3){
          var li = el("li",{
            class:['mx-log-item','mx-log-gray']},
            msg);
          elProgressMessage.appendChild(li);
        }
      }
    });
  }
}



