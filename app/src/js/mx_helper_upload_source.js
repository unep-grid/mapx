/* jshint esversion:6, evil: true */
import * as mx from './mx_init.js';

export function triggerUploadForm(opt){
  var el = mx.helpers.el;
  
  var elForm = document.getElementById(opt.idForm);
  var elInput =  el('input',{
    type : 'file',
    class : 'mx-hide'
  }).on("change",uploadSource);

  elForm.appendChild(elInput);
  elInput.click();

}


function uploadSource(evt){
  /** 
   ** rebuilding formdata, as append seems to add value in UI...
   **/
  var el = mx.helpers.el;
  var elInput = evt.target;
  var elForm = elInput.parentElement;
  var host = mx.settings.apiUrlBase + '/upload/vector';
  var file  = elInput.files[0];
  var elTitle = elForm.querySelector("#txtUploadSourceFileName");
  var title = elTitle.value;
  var elEmail = elForm.querySelector("#txtEmailSourceUpload");
  var elButton = document.getElementById("btnSourceUpload");
  var email = elEmail.value;
  var form = new FormData();
  var idUser =  mx.settings.user.id;

  elEmail.setAttribute("disabled",true);
  elTitle.setAttribute("disabled",true);
  elButton.setAttribute("disabled",true);

  //function onEnd(){
    //elEmail.setAttribute("disabled",false);
    //elTitle.setAttribute("disabled",false);
    //elButton.setAttribute("disabled",false);
  /*}*/
  /**
   * Create ui
   */ 

  var progressMsg = "";
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

  elForm.appendChild(elProgressContainer);

  /* Server will validate token, 
   * but we can avoid much trouble here
   */
  if(mx.settings.user.guest) return;

  form.append('vector',file);
  form.append('token',mx.settings.user.token);
  form.append('idUser',mx.settings.user.id);
  form.append('project',mx.settings.project);
  form.append('title',title);
  form.append('email',email);

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

    console.log({msg:msg,type:type});

    var p = el("p");
    switch(type){
      case 'end' :
        elProgressBar.style.width = 100 + "%";
        var elUpDone = el("div","Process done,the data should be available in sources list");
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
      res.split("\t\n").map(function(j){
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



