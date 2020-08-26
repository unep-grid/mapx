export function getOverlapAnalysis(opt) {
  if (mx.settings.user.guest){
    return;
  }

  var h = mx.helpers;
  var elForm = document.getElementById(opt.idForm);
  var elButtonCompute = document.getElementById(opt.idButtonAnalyse);
  var elTextAreaResult = elForm.querySelector('#' + opt.idTextResult);
  var elListMessage = elForm.querySelector('#' + opt.idListMessage);

  var host = h.getApiUrl('getSourceOverlap');
  var query = {
    layers: opt.layers.join(','),
    countries: opt.countries.join(','),
    method: opt.method || 'getArea',
    idUser: mx.settings.user.id,
    token: mx.settings.user.token,
    idProject: mx.settings.project,
    sourceTitle: opt.sourceTitle
  };

  var params = h.objToParams(query);
  var url = host + '?' + params;

  elButtonCompute.setAttribute('disabled', 'disabled');

  h.getJSON({
    maxWait: 1e3 * 120,
    url: url,
    onProgress: handleMessage,
    onMessage: handleMessage,
    onSuccess: handleMessage,
    onError: handleMessage,
    onTimeout: function(err) {
      console.log(err);
      var elTimeout = h.el('li', 'Timeout reached, cancelled analysis.');
      elListMessage.appendChild(elTimeout);
      elButtonCompute.removeAttribute('disabled');
    }
  });

  function updateLayerList() {
    Shiny.onInputChange('mx_client_update_source_list', {
      date: new Date() * 1
    });
  }

  var messageStore = {};

  function handleMessage(msg) {
    return h.handleRequestMessage(msg, messageStore, {
      result: function(msg) {
        if (msg.content === 'area') {
          var area = msg.value;
          var elArea = h.el(
            'li',
            {class: ['mx-log-item', 'mx-log-white']},
            'Area = ' + area + '[' + msg.unit + ']'
          );
          elListMessage.appendChild(elArea);
          if (msg.unit === 'm2'){
            area = area / 1e6;
          }
          elTextAreaResult.innerText = Math.round(area * 1000) / 1000;
        }
        if (msg.content === 'sourceMeta') {
          var m = msg.value;
          console.log(m);
          updateLayerList();
        }
      },
      error: function(msg) {
        var elErr = h.el(
          'li',
          {class: ['mx-log-item', 'mx-log-red']},
          JSON.stringify(msg)
        );
        elListMessage.appendChild(elErr);
        elButtonCompute.removeAttribute('disabled');
      },
      message: function(msg) {
        var elMsg = h.el('li', {class: ['mx-log-item', 'mx-log-blue']}, msg);
        elListMessage.appendChild(elMsg);
      },
      warning: function(msg) {
        var li = el(
          'li',
          {
            class: ['mx-log-item', 'mx-log-orange']
          },
          msg
        );
        elProgressMessage.appendChild(li);
      },
      timing: function(msg) {
        console.log(msg);
        var txtTiming = 'duration = ' + msg.duration + '[' + msg.unit + ']';
        var elTiming = h.el(
          'li',
          {class: ['mx-log-item', 'mx-log-blue']},
          txtTiming
        );
        elListMessage.appendChild(elTiming);
      },
      end: function(msg) {
        var elEnd = h.el('li', {class: ['mx-log-item', 'mx-log-green']}, msg);
        elListMessage.appendChild(elEnd);
        elButtonCompute.removeAttribute('disabled');
        elListMessage.appendChild(h.el('hr'));
      }
    });
  }
}
