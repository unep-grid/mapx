let start;

export async function fetchViews(o) {
  const h = mx.helpers;
  o = o || {};
  const queryItems = [
    'idProject',
    'idUser',
    'language',
    'token',
    'idViews',
    'collections',
    'collectionsSelectOperator',
    'roleMax',
    'allViews'
  ];

  const def = {
    idProject: mx.settings.project.id,
    idUser: mx.settings.user.id,
    language: mx.settings.language || mx.settings.languages[0],
    token: mx.settings.user.token,
    useQueryFilters: null,
    idViews: [],
    idViewsOpen: [],
    allViews: false,
    collections: [],
    collectionsSelectOperator: '',
    noViews: null,
    roleMax: ''
  };
  const opt = Object.assign({}, def, o);

  if (opt.useQueryFilters) {
    const optQuery = h.getQueryViewsInit();
    h.updateIfEmpty(opt, optQuery);
  }

  const dataDefault = {
    views: [],
    states: [],
    timing: 0,
    noViews: false
  };

  const host = h.getApiUrl('getViewsListByProject');

  start = performance.now();

  const isModeNoViews =
    opt.noViews === true || h.isString(opt.noViews)
      ? opt.noViews.toLowerCase() === 'true'
      : false;

  if (isModeNoViews) {
    /**
     * This returns an empty list ( legacy option )
     */

    dataDefault.noViews = true;
    return Promise.resolve(dataDefault);
  }

  /**
   * if idViews is empty,set allViews to true
   * -> handled in server too
   */
  if (h.isEmpty(opt.idViews)) {
    opt.allViews = true;
  }

  /**
   * Add idViewsOpen to views
   */
  if (h.isArrayOfViewsId(opt.idViewsOpen)) {
    opt.idViews.push(...opt.idViewsOpen);
  }

  opt.idViews = h.getArrayDistinct(opt.idViews);

  const url = new URL(host);
  for (let id of queryItems) {
    url.searchParams.set(id,opt[id]);
  }
  
  const data = await h.fetchJsonProgress(url, {
    onProgress: opt.onProgress || onProgress,
    onError: opt.onError || onError,
    onComplete: opt.onComplete || onComplete
  });
  if (data.type === 'error') {
    throw new Error(data.message);
  }
  const dataOut = Object.assign({}, dataDefault, data);

  /**
   * Handle requested but missing views
   */
  const hasModalLogin = !!document.getElementById('loginCode');
  const idViewsExist = dataOut.views.map((v) => v.id);
  const idViewsDiff = h.getArrayDiff(
    opt.idViews,
    idViewsExist
  );
  if (idViewsDiff.length > 0 && !hasModalLogin) {
    const addViewTemp = await h.modalConfirm({
      title: h.getDictItem('fetch_views_add_temp_modal_title'),
      content: h.getDictItem('fetch_views_add_temp_confirm')
    });
    if (addViewTemp) {
      const tmpViews = await h.getViewsRemote(idViewsDiff);
      for (const view of tmpViews) {
        view._temp = true;
      }
      dataOut.views.unshift(...tmpViews);
      const idViewsAll = dataOut.views.map((v) => v.id);
      const idViewsNotFound = h.getArrayDiff(
        idViewsDiff,
        idViewsAll
      );
      if (idViewsNotFound.length > 0) {
        h.modal({
          title: h.getDictItem('fetch_views_not_found_modal_title'),
          content: h.getDictItem('fetch_views_not_found_message'),
          addBackground: true
        });
      }
    }
  }
  return dataOut;
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
