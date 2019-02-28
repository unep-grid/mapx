
export function handlerDownloadVectorSource(o){
  var elMsg;
  var elOutput = document.getElementById(o.idHandlerContainer);

  var dlUrlCreate = mx.helpers.getApiUrl('downloadSourceCreate');
  var dlUrlGet = mx.helpers.getApiUrl('downloadSourceGet');

  dlUrlCreate = dlUrlCreate +'?'+ mx.helpers.objToParams(o.request);

  if(!elOutput){
    throw new Error("No handler container");
  }

  var el = mx.helpers.el;


  /* progress bar */
  var progressMsg = "";
  var elProgressLabel =  el("label","Progress");

  var elProgressBar = el("div",{
    class: 'mx-inline-progress-bar'
  });
  var elProgressBarContainer = el("div",{
    class: 'mx-inline-progress-container'
  },
    elProgressBar
  );
  /* log messages */
  var elLogLabel =  el("label","Logs");
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

  var messageStore = {};

  function cleanMsg(msg){
    return mx.helpers.handleRequestMessage( msg, messageStore ,{
      end : function(msg){
        var li = el("li",{
          class : ['mx-log-item','mx-log-green'] 
        },el('p','Process done, the data is available for',
          el('a','download',{
            href  : dlUrlGet + msg.filepath,
            target : '_blank'
          })
        ));
        elProgressMessage.appendChild(li);
      },
      error :function(err){
        var li = el("li",{
          class:['mx-log-item','mx-log-red']},
          err
        );
        elProgressMessage.appendChild(li);
      },
      warning :function(err){
        var li = el("li",{
          class:['mx-log-item','mx-log-orange']},
          err
        );
        elProgressMessage.appendChild(li);
      },
      message : function(msg){
        var li = el("li",{
          class:['mx-log-item','mx-log-blue']},
          msg
        );
        elProgressMessage.appendChild(li);
      },
      progress : function(progress){
        elProgressBar.style.width = progress + "%";
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

