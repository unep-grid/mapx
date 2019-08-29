export function fetchJsonProgress(url, opt) {
  opt = opt || {};
  const onProgress = opt.onProgress || console.log;
  const onComplete = opt.onComplete || opt.onProgress;
  const onError =
    opt.onError ||
    function(e) {
      throw new Error(e);
    };

  let hasMapxContentLength = false;

  return new Promise((resolve, reject) => {
    let xmlhttp = new XMLHttpRequest();

    xmlhttp.open('GET', url, true);
    xmlhttp.onprogress = (d) => {
      let p = {
        total: d.total,
        loaded: d.loaded
      };
      if (p.total === 0 || !d.lengthComputable) {
        let cLength = d.target.getResponseHeader('mapx-content-length') * 1;
        if (cLength > 0) {
          p.total = cLength;
          hasMapxContentLength = true;
        }
      }

      if(hasMapxContentLength){
         p.loaded = d.target.response.length;
      }

      onProgress(p);
    };
    xmlhttp.onerror = (err) => {
      reject(err);
    };
    xmlhttp.onload = onLoad;

    xmlhttp.send();

    /**
     * Helpers
     */
    function onLoad() {
      var that = this;
      if (that.status !== 200) {
        reject(`Unable to fetch ${url} ${that.responseText}`);
      } else {
        let data = JSON.parse(that.responseText);
        resolve(data);
      }
      onComplete();
    }
  }).catch((err) => {
    onError({
      message: err
    });
  });
}

export function fetchProgress_fetch(url, opt) {
  opt = opt || {};
  const onProgress = opt.onProgress || console.log;
  const onComplete = opt.onComplete || console.log;
  const onError = opt.onError || console.log;

  return fetch(url, {cache: 'no-cache'})
    .then((response) => {
      let err = '';
      if (!response.ok) {
        err = response.status + ' ' + response.statusText;
        onError({
          message: err
        });
        throw Error(err);
      }

      if (!response.body) {
        err = 'ReadableStream not yet supported in this browser.';
        onError({
          message: err
        });
        throw Error(err);
      }

      const contentLength = response.headers.get('content-length');

      if (!contentLength) {
        err = 'Content-Length response header unavailable';
        onError({
          message: err
        });
        throw Error(err);
      }

      const total = parseInt(contentLength, 10);
      console.log('Content Length', total);
      let loaded = 0;

      return new Response(
        new ReadableStream({
          start(controller) {
            const reader = response.body.getReader();

            read();

            function read() {
              reader
                .read()
                .then(({done, value}) => {
                  if (done) {
                    onComplete({
                      loaded: loaded,
                      total: total
                    });
                    controller.close();
                    return;
                  }
                  loaded += value.byteLength;
                  onProgress({
                    loaded: loaded,
                    total: total
                  });
                  controller.enqueue(value);
                  read();
                })
                .catch((error) => {
                  onError({
                    message: error
                  });
                  controller.error(error);
                });
            }
          }
        })
      );
    })
    .catch((error) => {
      onError({
        message: error
      });
    });
}
