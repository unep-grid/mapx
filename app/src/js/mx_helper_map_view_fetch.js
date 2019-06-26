export function fetchViews(opt) {
  var h = mx.helpers;
  var idProject = mx.settings.project;
  var idUser = mx.settings.user.id;
  var token = mx.settings.user.token;
  opt = opt || {};
  var host = h.getApiUrl('getViews');

  var url =
    host +
    '?' +
    h.objToParams({
      idProject: opt.idProject || idProject,
      idUser: opt.idUser || idUser,
      token: opt.token || token
    });

  return h
    .fetchProgress(url, {
      onProgress: opt.onProgress || onProgress,
      onError: opt.onError || onError,
      onComplete: opt.onComplete || onComplete
    })
    .then((data) => {
      return data.json() || [];
    });
}

function onProgress(d) {
  console.log(Math.round((d.loaded / d.total) * 100));
}

function onError(d) {
  console.log(d);
}

function onComplete(d) {
  console.log(d);
}



