


export function getOverlapAnalysis(opt){

  if(mx.settings.user.guest) return;

  var elTextResult = document.getElementById(opt.idTextResult);
  var host = mx.helpers.getApiUrl('sourceOverlap');
  var layers = opt.layers.join(',');
  var countries = opt.countries.join(',');
  var method = opt.method || "getArea";

  var url = host + "?layers=" + layers + "&countries=" + countries + "&method=" + method ;

  mx.helpers.getJSON({
    maxWait : 1e3 * 120,
    url : url,
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
      result : function(msg){
        msg = msg / 1e6;
        elTextResult.innerText = (Math.round(msg*1000))/1000;
      },
      error :function(msg){
        elTextResult.innerText = msg;
      },
      message : function(msg){
        elTextResult.innerText = msg;
      },
      timging : function(){
        console.log(msg);
      }
    });
  }

}
