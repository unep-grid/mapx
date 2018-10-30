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
        title : title,
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
  form.append('vector',o.file || o.geojson);
  form.append('token',o.token || mx.settings.user.token);
  form.append('idUser',o.idUser || mx.settings.user.id);
  form.append('email',o.email || mx.settings.user.email);
  form.append('project',o.idProject || mx.settings.project);
  form.append('title',o.title);


  /**
   * Create ui
   */ 

  var progressMsg = "";
  var elProgressTarget = o.selectorProgressContainer instanceof Node ? o.selectorProgressContainer : document.querySelector(o.selectorProgressContainer);
  var el = mx.helpers.el;
  var elProgressLabel =  el("label","Progress");

  /* progress bar */
  var elProgressBar = el("div",{class:'mx-inline-progress-bar'});
  var elProgressBarContainer = el("div",{class:'mx-inline-progress-container'},elProgressBar);
  var elProgressMessage = el("pre");
  var elProgressIssues = el("pre");
  var elProgressIssuesContainer = mx.helpers.uiFold({
    label : 'Issues',
    content : elProgressIssues
  });

  var elProgressContainer = el("div",
    elProgressLabel,
    elProgressBarContainer,
    elProgressMessage,
    elProgressIssuesContainer
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


  function isJson(str) {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  }

  function addMsg(msg,type){
    if(type=="error") console.log(msg);

    var p = el("p");
    switch(type){
      case 'end' :
        var elUpDone = el("div","Process done,the data should be available in sources list");
        elProgressBar.style.width = 100 + "%";
        elProgressMessage.appendChild(elUpDone);
        break;
      case 'progress' :
        elProgressBar.style.width = msg + "%";
        break;
      case 'message': 
        p.innerText = msg ;
        elProgressMessage.appendChild(p);
        break;
      case 'error':
        p.innerText = msg ;
        elProgressIssues.appendChild(p);
        break;
      default :
        p.innerText = msg ;
        elProgressMessage.appendChild(p);
    }
  }

  var msgs = [];
  var uploadDone = false;
  function cleanMsg(res){
    if(typeof res === "number"){ 
      elProgressLabel.innerText = "Upload progress";
      addMsg(res*100,"progress");
      if(res>=0.99 && !uploadDone){
        uploadDone = true;
        addMsg("Upload done. Importation in DB, please wait, this could take a while...","message");
      }
    }else{
      res.split("\t\n").forEach(function(j){
        if(j){
          if(msgs.indexOf(j) == -1){
            elProgressLabel.innertText = "Importation progress";
            msgs.push(j);
            var val =  JSON.parse(j);
            addMsg(val.msg,val.type);
          }
        }
      });
    }
  }
}
