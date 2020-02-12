var start;

export function fetchProjects(opt) {
  var h = mx.helpers;
  var defaults = {
    idUser: mx.settings.user.id,
    language: mx.settings.language,
    token: mx.settings.user.token,
    onProgress: onProgress,
    onError: onError,
    onComplete: onComplete
  };

  opt = Object.assign({}, defaults, opt);

  var host = h.getApiUrl('getProjectsListByUser');

  var url =
    host +
    '?' +
    h.objToParams({
      idUser: opt.idUser,
      language: opt.language,
      token: opt.token
    });

  start = performance.now();

  return h
    .fetchJsonProgress(url, {
      onProgress: opt.onProgress,
      onError: opt.onError,
      onComplete: opt.onComplete
    })
    .then((data) => {
      data = data || [];
      console.log(`Projects n: ${data.length}`);
      return data;
    });
}

function onProgress(d) {
  console.log(Math.round((d.loaded / d.total) * 100));
}

function onError(d) {
  console.log(d);
}

function onComplete() {
  console.log(
    `Project fetch + DB: ${Math.round(performance.now() - start)} [ms]`
  );
}
