import {getArrayDistinct, getArrayDiff} from './array_stat/index.js';
import {getApiUrl} from './api_routes';
import {updateIfEmpty} from './mx_helper_misc.js';
import {isString, isEmpty, isArrayOfViewsId} from './is_test';
import {fetchJsonProgress} from './mx_helper_fetch_progress.js';
import {modal, modalConfirm} from './mx_helper_modal.js';
import {getQueryViewsInit} from './mx_helper_url.js';
import {getDictItem, getLanguageCurrent} from './language';
import {getViewsRemote} from './map_helpers/index.js';

let start;
export async function fetchViews(o) {
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
    language: getLanguageCurrent(),
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
    const optQuery = getQueryViewsInit();
    updateIfEmpty(opt, optQuery);
  }

  const dataDefault = {
    views: [],
    states: [],
    timing: 0,
    noViews: false
  };

  start = performance.now();

  const isModeNoViews =
    opt.noViews === true || isString(opt.noViews)
      ? opt.noViews.toLowerCase() === 'true'
      : false;

  if (isModeNoViews) {
    /**
     * This returns an empty list ( legacy option )
     */

    dataDefault.noViews = true;
    return dataDefault;
  }

  /**
   * if idViews is empty,set allViews to true
   * -> handled in server too
   */
  if (isEmpty(opt.idViews)) {
    opt.allViews = true;
  }

  /**
   * Add idViewsOpen to views
   */
  if (isArrayOfViewsId(opt.idViewsOpen)) {
    opt.idViews.push(...opt.idViewsOpen);
  }

  opt.idViews = getArrayDistinct(opt.idViews);

  const url = new URL(getApiUrl('getViewsListByProject'));
  for (let id of queryItems) {
    url.searchParams.set(id, opt[id]);
  }

  const data = await fetchJsonProgress(url, {
    onProgress: opt.onProgress || onProgress,
    onError: opt.onError || onError,
    onComplete: opt.onComplete || onComplete
  });

  if (data.type === 'error') {
    throw new Error(data.message);
  }

  const dataOut = Object.assign({}, dataDefault, data);

  /**
   * Handle missing views
   */
  const hasModalLogin = !!document.getElementById('loginCode');
  const idViewsExist = dataOut.views.map((v) => v.id);
  const idViewsDiff = getArrayDiff(opt.idViews, idViewsExist);

  if (idViewsDiff.length > 0 && !hasModalLogin) {
    /**
     * Ask for temporary views
     */
    const addViewTemp = await modalConfirm({
      title: getDictItem('fetch_views_add_temp_modal_title'),
      content: getDictItem('fetch_views_add_temp_confirm')
    });

    if (addViewTemp) {
      /**
       * Fetch missing views
       */
      const tmpViews = await getViewsRemote(idViewsDiff);
      for (const view of tmpViews) {
        view._temp = true;
      }

      dataOut.views.unshift(...tmpViews);
      const idViewsAll = dataOut.views.map((v) => v.id);
      const idViewsNotFound = getArrayDiff(idViewsDiff, idViewsAll);

      if (idViewsNotFound.length > 0) {
        modal({
          title: getDictItem('fetch_views_not_found_modal_title'),
          content: getDictItem('fetch_views_not_found_message'),
          addBackground: true
        });
      }
    }
  }
  /**
   * Return result
   */
  return dataOut;
}

/**
 * Progress default
 */
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
