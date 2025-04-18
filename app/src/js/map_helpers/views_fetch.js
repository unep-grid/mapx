import { getArrayDistinct, getArrayDiff } from "./../array_stat/index.js";
import { getApiUrl } from "./../api_routes";
import { updateIfEmpty } from "./../mx_helper_misc.js";
import { isTrue, isEmpty, isArrayOfViewsId } from "./../is_test";
import { fetchJsonProgress } from "./../mx_helper_fetch_progress.js";
import { modal, modalConfirm } from "./../mx_helper_modal.js";
import { getQueryViewsInit } from "./../url_utils";
import { getDictItem, getLanguageCurrent } from "./../language";
import { getViewsRemote } from "./index.js";
import { settings } from "./../settings";

let start;
export async function fetchViews(o) {
  o = o || {};

  const queryItems = [
    "idProject",
    "idUser",
    "language",
    "token",
    "idViews",
    "collections",
    "collectionsSelectOperator",
    "roleMax",
    "allViews",
    "includeAllPublic",
    "types",
  ];

  const def = {
    idProject: settings.project.id,
    idUser: settings.user.id,
    language: getLanguageCurrent(),
    token: settings.user.token,
    useQueryFilters: null,
    idViews: [],
    idViewsOpen: [],
    collections: [],
    collectionsSelectOperator: "",
    noViews: null,
    selectKeys: ["*"],
    roleMax: "",
    allViews: false,
    includeAllPublic: false,
    types: ["vt", "rt", "cc", "sm"],
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
    noViews: false,
  };

  start = performance.now();

  const isModeNoViews = isTrue(opt.noView);

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

  const url = new URL(getApiUrl("getViewsListByProject"));
  for (let id of queryItems) {
    url.searchParams.set(id, opt[id]);
  }

  const data = await fetchJsonProgress(url, {
    onProgress: opt.onProgress || onProgress,
    onError: opt.onError || onError,
    onComplete: opt.onComplete || onComplete,
  });

  if (data.type === "error") {
    throw new Error(data.message);
  }

  const dataOut = Object.assign({}, dataDefault, data);

  /**
   * Handle missing views
   */
  const hasModalLogin = !!document.getElementById("loginCode");
  const idViewsExist = dataOut.views.map((v) => v.id);
  const idViewsDiff = getArrayDiff(opt.idViews, idViewsExist);

  if (idViewsDiff.length > 0 && !hasModalLogin) {
    /**
     * Ask for temporary views
     */
    const addViewTemp = await modalConfirm({
      title: getDictItem("fetch_views_add_temp_modal_title"),
      content: getDictItem("fetch_views_add_temp_confirm"),
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
          title: getDictItem("fetch_views_not_found_modal_title"),
          content: getDictItem("fetch_views_not_found_message"),
          addBackground: true,
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
 * e.g. Math.round((d.loaded / d.total) * 100));
 */
function onProgress() {
  return;
}

function onError(d) {
  console.error(d);
}

function onComplete() {
  console.log(
    `Views fetch + DB: ${Math.round(performance.now() - start)} [ms]`,
  );
}
