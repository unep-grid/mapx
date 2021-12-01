export function getValidateSourceGeom(opt) {
  if (mx.settings.user.guest){
    return;
  }

  var h = mx.helpers;
  var elForm = document.getElementById(opt.idForm);
  var elButtonValidate = document.getElementById(opt.idButtonValidate);
  var elListMessage = elForm.querySelector('#' + opt.idListMessage);

  var host = h.getApiUrl('getSourceValidateGeom');
  var query = {
    idSource: opt.idSource,
    idUser: mx.settings.user.id,
    token: mx.settings.user.token,
    idProject: mx.settings.project.id,
    useCache: opt.useCache || false,
    autoCorrect: opt.autoCorrect || false,
    analyze : opt.analyze || true
  };

  var params = h.objToParams(query);
  var url = host + '?' + params;

  enableButtons(false);
  elListMessage.innerHTML = "";

  try {
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
        enableButtons(true);
      }
    });
  } catch (e) {
    enableButtons(true);
    throw new Error(e);
  }

  var messageStore = {};

  function handleMessage(msg) {
    return h.handleRequestMessage(msg, messageStore, {
      result: function(msg) {
        var elMsg = h.el(
          'li',
          {class: ['mx-log-item', 'mx-log-white']},
          h.el(
            'ul',
            h.el('li', h.el('b', msg.title || '')),
            h.el('li', h.el('span', 'Valid: ' + msg.valid || false)),
            h.el(
              'li',
              h.el(
                'span',
                'Count of valid geometries: ' + msg.status.nValid || false
              )
            ),
            h.el(
              'li',
              h.el(
                'span',
                'Count of invalid geometries: ' + msg.status.nInvalid || false
              )
            ),
            h.el('li', h.el('span', 'Cache enabled: ' + msg.useCache || false)),
            h.el(
              'li',
              h.el('span', 'Automatic correction: ' + msg.autoCorrect || false)
            ),
            h.el(
              'li',
              h.el('span', 'Analyze ' + msg.analyze || false)
            )
          ),
          h.el('hr')
        );
        elListMessage.appendChild(elMsg);
        enableButtons(true);
      },
      error: function(msg) {
        var elErr = h.el(
          'li',
          {class: ['mx-log-item', 'mx-log-red']},
          JSON.stringify(msg)
        );
        elListMessage.appendChild(elErr);
        enableButtons(true);
      },
      message: function(msg) {
        var elMsg = h.el('li', {class: ['mx-log-item', 'mx-log-blue']}, msg);
        elListMessage.appendChild(elMsg);
      }
    });
  }

  function enableButtons(enable) {
    if (enable) {
      elButtonValidate.removeAttribute('disabled');
    } else {
      elButtonValidate.setAttribute('disabled', 'disabled');
    }
  }
}
