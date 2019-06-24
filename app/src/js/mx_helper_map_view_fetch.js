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
      onProgress: onProgressData,
      onError: onProgressError,
      onComplete: onProgressDataComplete
    })
    .then((data) => {
      return data.json() || [];
    });
}

function onProgressData(d) {
  console.log(Math.round((d.loaded / d.total) * 100));
}

function onProgressError(d) {
  console.log(d);
}

function onProgressDataComplete(d) {
  console.log(d);
}
