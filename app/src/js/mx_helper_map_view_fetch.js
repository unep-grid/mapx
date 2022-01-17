let start;



export async function fetchViews(o) {
  const h = mx.helpers;
  o = o || {};
  const def = {
    idProject: mx.settings.project.id,
    idUser: mx.settings.user.id,
    language: mx.settings.language || mx.settings.languages[0],
    token: mx.settings.user.token,
    useQueryFilters: null,
    idViewsOpen: [],
    collections: [],
    idViews: [],
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

  if (opt.idViews.length > 0 && opt.idViewsOpen.length > 0) {
    opt.idViews.push(...opt.idViewsOpen);
  }

  opt.idViews = h.getArrayDistinct(opt.idViews);

  const queryString = h.objToParams({
    idProject: opt.idProject,
    idUser: opt.idUser,
    language: opt.language,
    token: opt.token,
    idViews: opt.idViews,
    collections: opt.collections,
    collectionsSelectOperator: opt.collectionsSelectOperator,
    roleMax: opt.roleMax
  });

  const url = ` ${host}?${queryString}`;

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
  const idViewsDiff = h.getArrayDiff(
    opt.idViews,
    dataOut.views.map((v) => v.id)
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
      const idViewsNotFound = h.getArrayDiff(
        idViewsDiff,
        dataOut.views.map((v) => v.id)
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
