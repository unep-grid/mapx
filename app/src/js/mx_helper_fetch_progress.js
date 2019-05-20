export function fetchProgress(url, opt) {
  opt = opt || {};
  const onProgress = opt.onProgress || console.log;
  const onComplete = opt.onComplete || console.log;
  const onError = opt.onError || console.log;

  return fetch(url)
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
                      loaded : loaded,
                      total : total
                    });
                    controller.close();
                    return;
                  }
                  loaded += value.byteLength;
                  onProgress({
                    loaded : loaded,
                    total : total
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
