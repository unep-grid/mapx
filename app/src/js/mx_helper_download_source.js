export function handlerDownloadVectorSource(o) {
  var elOutput = document.getElementById(o.idHandlerContainer);

  var dlUrlCreate = mx.helpers.getApiUrl('downloadSourceCreate');
  var dlUrlGet = mx.helpers.getApiUrl('downloadSourceGet');

  dlUrlCreate = dlUrlCreate + '?' + mx.helpers.objToParams(o.request);

  if (!elOutput) {
    throw new Error('No handler container');
  }
  var h = mx.helpers;
  var el = h.el;

  /* log messages */
  var elLogLabel, elProgressBar, elProgressBarContainer, elProgressLabel, elProgressMessage, elProgressMessageContainer;

  var elProgressContainer = el(
    'div',
    /**
     * Progress bar
     */
    (elProgressLabel = el('label', {dataset: {lang_key: 'api_progress_title'}})),
    (elProgressBarContainer = el(
      'div',
      {
        class: 'mx-inline-progress-container'
      },
      (elProgressBar = el('div', {
        class: 'mx-inline-progress-bar'
      }))
    )),
    /**
     * Message box
     */
    (elLogLabel = el('label', {dataset: {lang_key: 'api_log_title'}})),
    (elProgressMessageContainer = el(
      'div',
      {
        class: ['form-control', 'mx-logs']
      },
      (elProgressMessage = el('ul'))
    ))
  );

  elOutput.appendChild(elProgressContainer);
  updateTranslation();

  mx.helpers.getJSON({
    maxWait: 1e3 * 120,
    url: dlUrlCreate,
    onProgress: function(progress) {
      cleanMsg(progress);
      updateTranslation();
    },
    onMessage: function(data) {
      cleanMsg(data);
      updateTranslation();
    },
    onSuccess: function(data) {
      cleanMsg(data);
      updateTranslation();
    },
    onError: function(er) {
      cleanMsg(er);
      updateTranslation();
    }
  });

  var messageStore = {};

  function updateTranslation() {
    h.updateLanguageElements({el: elProgressContainer});
  }

  function cleanMsg(msg) {
    return mx.helpers.handleRequestMessage(msg, messageStore, {
      end: function(msg) {
        const urlDownload = dlUrlGet + msg.filepath.slice(1,msg.filepath.length);

        var li = el(
          'li',
          {
            class: ['mx-log-item', 'mx-log-green']
          },
          el('div',
            el(
              'p',
              {
                dataset: {
                  lang_key: 'api_download_ready'
                }
              }),
            el('a', {
              dataset: {
                lang_key: 'api_download_btn'
              },
              href: urlDownload,
              target: '_blank'
            })
          )
        );
        elProgressMessage.appendChild(li);
      },
      error: function(err) {
        var li = el(
          'li',
          {
            class: ['mx-log-item', 'mx-log-red']
          },
          err
        );
        elProgressMessage.appendChild(li);
      },
      warning: function(err) {
        var li = el(
          'li',
          {
            class: ['mx-log-item', 'mx-log-orange']
          },
          err
        );
        elProgressMessage.appendChild(li);
      },
      message: function(msg) {
        var li = el(
          'li',
          {
            class: ['mx-log-item', 'mx-log-blue']
          },
          msg
        );
        elProgressMessage.appendChild(li);
      },
      progress: function(progress) {
        elProgressBar.style.width = progress + '%';
      },
      default: function(msg) {
        if (msg && msg.length > 3) {
          var li = el(
            'li',
            {
              class: ['mx-log-item', 'mx-log-gray']
            },
            msg
          );
          elProgressMessage.appendChild(li);
        }
      }
    });
  }
}
