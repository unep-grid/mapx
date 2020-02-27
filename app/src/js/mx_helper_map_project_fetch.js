let start;

export function fetchProjects(opt) {
  const h = mx.helpers;
  const defaults = {
    idUser: mx.settings.user.id,
    language: mx.settings.language,
    role: 'any',
    title: null,
    titlePrefix: null,
    titleFuzzy: null,
    token: mx.settings.user.token,
    onProgress: onProgress,
    onError: onError,
    onComplete: onComplete
  };

  opt = Object.assign({}, defaults, opt);

  const host = h.getApiUrl('getProjectsListByUser');
  const query = h.objToParams({
    idUser: opt.idUser,
    language: opt.language,
    token: opt.token,
    role : opt.role,
    titlePrefix: opt.titlePrefix,
    titleFuzzy: opt.titleFuzzy
  });
  const url = `${host}?${query}`;

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

function onProgress() {}

function onError(d) {
  console.error(d);
}

function onComplete() {
  const duration = Math.round(performance.now() - start);
  console.log(`Project fetch + DB: ${duration} [ms]`);
}
