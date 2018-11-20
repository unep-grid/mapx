
export function handlerDownloadVectorSource(o){
  var elMsg;
  var elOutput = document.getElementById(o.idHandlerContainer);

  var dlUrlCreate = mx.helpers.getApiUrl('downloadSourceCreate');
  var dlUrlGet = mx.helpers.getApiUrl('downloadSourceGet');

  dlUrlCreate = dlUrlCreate + o.data ;

  if(!elOutput){
    throw new Error("No handler container");
  }

  var el = mx.helpers.el;

  var progressMsg = "";
  var elProgressContainer = el("div",
    el("label",'Extraction progress')
  );

  /* progress bar */
  var elProgressBar = el("div",{
    class : 'mx-inline-progress-bar'
  });
  var elProgressBarContainer = el("div",{
    class : 'mx-inline-progress-container'
  });
  var elProgressMessage = el("pre");
  var elProgressIssues = el("pre");
  var elProgressIssuesContainer = mx.helpers.uiFold({
    label : 'Issues',
    content : elProgressIssues
  });

  elProgressBarContainer.appendChild(elProgressBar);
  elProgressContainer.appendChild(elProgressBarContainer);
  elProgressContainer.appendChild(elProgressMessage);
  elProgressContainer.appendChild(elProgressIssuesContainer);
  elOutput.appendChild(elProgressContainer);

  mx.helpers.getJSON({
    maxWait : 1e3 * 120,
    url : dlUrlCreate,
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

  function updateLayerList(){
    Shiny.onInputChange( 'mglEvent_update_source_list',{
      date : new Date() * 1
    });
  }

  var messageStore = {};

  function cleanMsg(msg){
    return mx.helpers.handleRequestMessage( msg, messageStore ,{
      end : function(msg){
        var dlMsg = el("span");
        var dlButton = el("button");
        dlButton.classList.add("btn");
        dlButton.innerText = "Download";
        dlButton.onclick = function(){
          window.open(dlUrlGet + msg.filepath,'_blank');
        };
        elProgressBar.style.width = 100 + "%";
        dlMsg.innerText = "Process done, the data is available for download";
        elProgressMessage.appendChild(dlMsg);
        elProgressMessage.appendChild(dlButton);
      },
      error :function(msg){
        var pErr = el("p");
        var pMsg = el("p");
        pMsg.innerText = "An issue occured. Learn more in the issues box below";
        pErr.innerText = JSON.stringify(msg) ;
        elProgressIssues.appendChild(pErr);
        elProgressMessage.appendChild(pMsg);
      },
      message : function(msg){
        var p = el("p");
        p.innerText = msg ;
        elProgressMessage.appendChild(p);
      },
      progress : function(prog){
        elProgressBar.style.width = prog + "%";
      },
      default : function(msg){
        var p = el("p");
        p.innerText = msg ;
        elProgressMessage.appendChild(p);
      }
    });
  }

}

