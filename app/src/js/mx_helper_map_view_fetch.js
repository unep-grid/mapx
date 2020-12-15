let start;

export function fetchViews(opt) {
  opt = opt || {};
  const h = mx.helpers;
  const idProject = mx.settings.project.id;
  const idUser = mx.settings.user.id;
  const language = mx.settings.language || mx.settings.languages[0];
  const token = mx.settings.user.token;
  
  const idViewsOpen = h.getQueryParameterInit(['idViewsOpen','viewsOpen']);
  const collections = h.getQueryParameterInit(['idCollections','collections' ]);
  
  const collectionsSelectOperator = h.getQueryParameterInit(
    'collectionsSelectOperator'
  );
  const roleMax =
    h.getQueryParameterInit(['viewsRoleMax', 'filterViewsByRoleMax'])[0] || '';
  const noViews = h.getQueryParameterInit('noViews')[0] || '';

  const dataEmpty = {
    views: [],
    states: [],
    timing: 0
  };
  const host = h.getApiUrl('getViewsListByProject');


  let idViews = h.getQueryParameterInit(['idViews', 'views']);

  if (noViews === true || noViews.toLowerCase() === 'true') {
    dataEmpty.noViews = true;
    return Promise.resolve(dataEmpty);
  }

  if(idViews.length > 0 && idViewsOpen.length > 0){
    idViews = idViews.concat(idViewsOpen);
    idViews = h.getArrayDistinct(idViews);
  }

  const url =
    host +
    '?' +
    h.objToParams({
      idProject: opt.idProject || idProject,
      idUser: opt.idUser || idUser,
      language: language,
      token: opt.token || token,
      idViews: idViews,
      collections: opt.collections || collections,
      collectionsSelectOperator:
        opt.collectionsSelectOperator || collectionsSelectOperator,
      roleMax: roleMax
    });

  start = performance.now();

  return h
    .fetchJsonProgress(url, {
      onProgress: opt.onProgress || onProgress,
      onError: opt.onError || onError,
      onComplete: opt.onComplete || onComplete
    })
    .then((data) => {
      data = data || {};
      data.views = data.views || [];
      data.states = data.states || [];
      console.log(`Views n: ${data.views.length}`);
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
    `Views fetch + DB: ${Math.round(performance.now() - start)} [ms]`
  );
}
