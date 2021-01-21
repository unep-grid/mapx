let start;

export function fetchViews(opt) {
  opt = opt || {};
  const h = mx.helpers;
  const idProject = mx.settings.project.id;
  const idUser = mx.settings.user.id;
  const language = mx.settings.language || mx.settings.languages[0];
  const token = mx.settings.user.token;

  const idViewsOpen = h.getQueryParameterInit(['idViewsOpen', 'viewsOpen']);
  const collections = h.getQueryParameterInit(['idCollections', 'collections']);
  const idViews = h.getQueryParameterInit(['idViews', 'views']);

  const collectionsSelectOperator = h.getQueryParameterInit(
    'collectionsSelectOperator'
  );
  const roleMax =
    h.getQueryParameterInit(['viewsRoleMax', 'filterViewsByRoleMax'])[0] || '';
  const noViews = h.getQueryParameterInit('noViews')[0] || '';

  const dataDefault = {
    views: [],
    states: [],
    timing: 0,
    noViews: false
  };

  start = performance.now();
  const host = h.getApiUrl('getViewsListByProject');

  let idViewsRequested = idViews;

  if (noViews === true || noViews.toLowerCase() === 'true') {
    dataDefault.noViews = true;
    return Promise.resolve(dataDefault);
  }

  if (idViews.length > 0 && idViewsOpen.length > 0) {
    idViews.push(...idViewsOpen);
    idViewsRequested = h.getArrayDistinct(idViews);
  }

  const queryString = h.objToParams({
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

  const url = ` ${host}?${queryString}`;

  return h
    .fetchJsonProgress(url, {
      onProgress: opt.onProgress || onProgress,
      onError: opt.onError || onError,
      onComplete: opt.onComplete || onComplete
    })
    .then((data) => {
      const out = Object.assign({}, dataDefault, data);
      const diff = h.getArrayDiff(idViewsRequested, out.views.map((v) => v.id));
      if (diff.length > 0) {
        fetchDiffWarn(diff);
      }
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

async function fetchDiffWarn(diff) {
  const h = mx.helpers;  
  const title = await h.getDictItem('fetch_views_diff_modal_title');
  const text =  await h.getDictItem('fetch_views_diff_message');
  console.warn('Views not available in this project:',diff);
  h.modal({
    title: title,
    content: text,
    addBackround: true
  });
}
