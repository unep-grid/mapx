import { NestedList } from "./nested_list/index.js";
import { ViewsFilter } from "./views_filter/index.js";
import { ViewBase } from "./views_builder/view_base.js";
import { getArrayDistinct } from "./array_stat/index.js";
import { settings } from "./settings";
import { isView, isArray, isViewOpen, isObject } from "./is_test_mapx";
import { path, itemFlashSave } from "./mx_helper_misc.js";
import { getQueryParameterInit } from "./url_utils";
import { getDictItem, updateLanguageElements } from "./language";
import { setViewBadges } from "./mx_helper_map_view_badges.js";
import { el } from "./el/src/index.js";
import {
  viewModulesRemove,
  getView,
  getMapData,
  getViews,
  viewLayersAdd,
  viewsCloseAll,
  viewAdd,
  getViewTitleNormalized,
  getViewDateModified,
  viewsCheckedUpdate,
  viewsLayersOrderUpdate,
  updateBtnFilterActivated,
} from "./map_helpers";

/**
 * Get the current project views state.
 *
 * @param {Object} opt Options
 * @param {String} opt.idProject ID of the project
 * @param {String} opt.idInput Shiny input id. This will trigger an event in Shiny with the state as value
 * @return {Array} State
 */
export function getProjectViewsState(opt) {
  opt = Object.assign(
    {},
    { idProject: settings.project.id, idInput: "projectViewsStates" },
    opt
  );
  const idInput = opt.idInput;
  const isCurrentProject = opt.idProject === settings.project.id;
  const hasShiny = isObject(window.Shiny);
  const state = [];
  if (isCurrentProject) {
    const mData = getMapData();
    if (mData.viewsList) {
      if (mData.viewsList.isModeFrozen()) {
        alert("Operation not allowed : remove activated filters");
        return;
      }
      state.push(...mData.viewsList.getState());
      mData.viewsList.setStateOrig(state);
    }
    if (hasShiny) {
      Shiny.onInputChange(idInput, JSON.stringify(state));
    }
  }
  return state;
}

/**
 * Get current collections available in rendered views and update Shiny input
 * @param {Object} opt  Options
 * @param {String} opt.idInput Shiny input id,
 */
export function getProjectViewsCollectionsShiny(opt) {
  opt = Object.assign({}, { idInput: "projectViewsCollections" }, opt);

  const hasShiny = isObject(window.Shiny);
  const collections = getProjectViewsCollections();

  if (hasShiny && opt.idInput) {
    Shiny.onInputChange(opt.idInput, collections);
  }
  return collections;
}

/**
 * Get current collections available in views list
 * @param {Object} opt Options
 * @param {Boolean} opt.open Return only collection from open views
 * @return {Array} Array of names of collections
 */
export function getProjectViewsCollections(opt) {
  opt = Object.assign({ open: null }, opt);
  const useOpen = opt.open === true;
  const collections = getViews().reduce((a, v) => {
    if (useOpen && !isViewOpen(v)) {
      return a;
    }
    return a.concat(path(v, "data.collections", []));
  }, []);
  return getArrayDistinct(collections);
}

/**
 * View list to default nested list state
 * @param {Array} view list
 * @param {Arras} Array of state item.
 */
export function viewsToNestedListState(views) {
  return views.map((v) => {
    return {
      id: v.id,
      group: "root",
      type: "item",
    };
  });
}

/**
 * Trim and expend state according to views list
 * @param {Array} state State list
 * @return {Array} modified state
 */
function sanitizeState(states) {
  const hasStateStored = isArray(states.stored) && states.stored.length > 0;
  let state = hasStateStored ? states.stored : states.orig || [];
  /**
   * Trim state
   */
  const views = getViews();
  const idsViews = views.map((v) => v.id);
  state = state.filter((s) => {
    return s.type !== "item" || idsViews.indexOf(s.id) > -1;
  });
  /**
   * Expend state
   */
  const idsState = state.map((s) => s.id);
  idsViews.forEach((i) => {
    const unrefer = idsState.indexOf(i) === -1;
    if (unrefer) {
      const newItem = { id: i, type: "item", render: true, moveTop: true };
      state.push(newItem);
    }
  });

  return state;
}

/**
 * Add single view to the views list
 * @param {Object} view View object to add
 * @param {Object} options
 * @param {String} options.id
 * @param {Boolean} options.moveTop Move view item to top
 * @param {Boolean} options.render Trigger item rendering
 * @param {Boolean} options.open Open and add view to the map
 * @param {Object} options.view View object to render
 * @return {Promise<Object>} Object options realised
 */
export async function viewsListAddSingle(view, options) {
  options = options || {};
  const staticMode = !!settings.mode.static;

  if (!isView(view)) {
    return;
  }

  const opt_default = {
    id: view.id,
    moveTop: true,
    render: true,
    open: true,
    view: view,
  };

  options = Object.assign({}, opt_default, options);

  const mData = getMapData();
  const ids = mData.views.map((v) => v.id);
  const idPosOld = ids.indexOf(view.id);
  const idNew = idPosOld === -1;
  if (!idNew) {
    mData.views.splice(idPosOld, 1);
  }
  mData.views.unshift(view);

  if (staticMode) {
    await viewLayersAdd({
      idView: view.id,
      addTitle: true,
    });
  } else {
    await mData.viewsList.addItem(options);
    mData.viewsFilter.update();
  }

  return options;
}

/**
 * Update single view alread in the view list
 * @param {Object} view View object to add
 */
export async function viewsListUpdateSingle(view) {
  const mData = getMapData();
  const oldView = getView(view.id);
  if (isView(oldView)) {
    await viewModulesRemove(oldView);
  } else {
    console.warn("No old view to update");
  }
  Object.assign(oldView, view);
  const settings = {
    id: view.id,
    view: oldView,
    update: true,
    open: true,
  };
  await mData.viewsList.updateItem(settings);
  mData.viewsFilter.updateViewsComponents();
  mData.viewsFilter.updateCount();
}

export function updateViewsFilter() {
  const mData = getMapData();
  mData.viewsFilter.update();
}

/**
 * Render views HTML list in viewStore
 * @param {object} o options
 * @param {string} o.id map id
 * @param {Object} o.views views to render
 * @param {boolean} o.add Add views to an existing list
 */
export async function viewsListRenderNew(o) {
  const idMap = o.id;
  const mData = getMapData(idMap);
  const elFilterText = document.getElementById("viewsFilterText");
  const elFilterTags = document.getElementById("viewsFilterContainer");
  const elFilterActivated = document.getElementById("btnFilterChecked");
  const elFilterSwitch = document.getElementById("viewsFilterSwitch");
  const elFilterCount = document.getElementById("viewsFilterCount");
  const elViewsList = document.getElementById("mxViewsList");
  const views = o.views;
  const hasState = o.state && isArray(o.state) && o.state.length > 0;
  const state = hasState ? o.state : viewsToNestedListState(views);
  const noViewsMode = getQueryParameterInit("noViews")[0] === "true";

  if (mData.viewsFilter instanceof ViewsFilter) {
    await mData.viewsFilter.destroy();
  }
  if (mData.viewsList instanceof NestedList) {
    await mData.viewsList.destroy();
  }

  /**
   * Should be always empty
   */
  if (mData.views.length > 0) {
    mData.views.length = 0;
  }

  /**
   * Add all new views
   */
  mData.views.push(...views);

  /**
   * Create views list ui
   */
  mData.viewsList = new NestedList(elViewsList, {
    id: settings.project.id,
    state: state,
    locked: noViewsMode,
    useStateStored: true,
    autoMergeState: true,
    emptyLabel: getEmptyLabel(),
    classDragHandle: "li-drag-handle",
    customDictItems: [
      { id: "name_group", en: "category", fr: "catégorie" },
      { id: "name_item", en: "view", fr: "vue" },
    ],

    eventsCallback: [
      /**
       * handlers non async
       */
      { id: "set_drag_image", action: handleSetDragImage },
      { id: "set_drag_text", action: handleSetDragText },
      { id: "state_save_local", action: itemFlashSave },
      { id: "state_sanitize", action: sanitizeState },
      { id: "get_item_text_by_id", action: getViewTitleNormalized },
      { id: "get_item_date_by_id", action: getViewDateModified },

      /**
       * Async handlers
       */
      { id: "render_item_content", action: handleRenderItemContent },
      { id: "state_reset", action: viewsCheckedUpdate },
      { id: "state_order", action: viewsLayersOrderUpdate },
      { id: "destroy", action: viewsCloseAll },
    ],
  });

  /**
   * Handle views list filtering
   */
  mData.viewsFilter = new ViewsFilter(mData.views, {
    elFilterActivated: elFilterActivated,
    elFilterTags: elFilterTags,
    elFilterSwitch: elFilterSwitch,
    elFilterText: elFilterText,
    operator: "and",
    onFilter: (ids, rules) => {
      /*
       * Update filter activated button
       */
      updateBtnFilterActivated();

      /*
       * Apply filter to nested list
       */
      mData.viewsList.filterById(ids, {
        flatMode: rules.length > 0,
      });
    },
    onUpdateCount: (count) => {
      /**
       * Update filter count
       */
      elFilterCount.innerText = `( ${count.nSubset} / ${count.nTot} )`;
    },
  });

  /**
   *  Auto open
   */
  //filterIfOpen();

  /**
   * Set image for the drag item
   */
  function handleSetDragImage(el) {
    const li = this;
    const isGroup = li.isGroup(el);
    const isItem = !isGroup && li.isItem(el);

    if (isGroup) {
      return el.querySelector(".li-group-header");
    }

    if (isItem) {
      return el.querySelector(".mx-view-tgl-content");
    }
    return el;
  }

  /**
   * Handle drag text
   */
  function handleSetDragText(el) {
    const li = this;
    const isGroup = li.isGroup(el);
    const isItem = !isGroup && li.isItem(el);
    if (isGroup) {
      return el.id;
    }
    if (isItem) {
      const elView = el.querySelector(".mx-view-item");
      if (elView && elView._vb) {
        let out = mx.helpers.getViewJson(elView._vb.view);
        return out;
      } else {
        return el.dataset;
      }
    }
    return el;
  }

  /**
   * Internal view rendering handler
   */
  async function handleRenderItemContent(config) {
    try {
      const li = this;
      const elItem = config.el;
      const data = config.data;
      const update = data.update;
      const open = data.open === true;
      /**
       * Add given element
       */

      if (data.el) {
        elItem.appendChild(data.el);
        return;
      }

      /**
       * No given element, assume it's a view
       */
      const view = data.view || mData.views.find((v) => v.id === data.id);
      const missing = !isView(view);

      /**
       * View requested but not vailable)
       */
      if (missing) {
        li.log(`View ${data.id} unavailable`);
        li.removeItemById(data.id);
        return;
      }

      /**
       * Remove view element
       */
      if (update && view._el) {
        view._el.remove();
      }

      /**
       * Create / update view element.
       */
      const viewBase = new ViewBase(view, update);

      /**
       * Get view element
       */
      const elView = viewBase.getEl();

      if (elView) {
        elItem.appendChild(elView);

        if (update) {
          await viewLayersAdd({
            view: view,
          });
          await updateLanguageElements({
            el: view._el,
          });
        }
        if (!update && open) {
          await viewAdd(view);
        }
        await setViewBadges(view);
      }
    } catch (e) {
      console.error("handleRenderItemContent error", e);
    }
  }
}

/**
 * Check if there is an empty views list and add a message if needed
 */
export function setViewsListEmpty(enable) {
  enable = enable || false;
  const mData = getMapData();
  const viewList = mData.viewsList;
  if (viewList instanceof NestedList) {
    viewList.setModeEmpty(enable);
  }
}

function getEmptyLabel() {
  const noViewForced = getQueryParameterInit("noViews")[0] === "true";
  const noViewKey = noViewForced ? "noView" : "noViewOrig";
  let elTitle;
  const elItem = el(
    "div",
    {
      class: ["mx-view-item-empty"],
    },
    (elTitle = el("span", {
      dataset: {
        lang_key: noViewKey,
      },
    }))
  );
  // Can't be async : catching within
  getDictItem(noViewKey)
    .then((item) => {
      elTitle.innerHTML = item;
    })
    .catch(console.error);

  return elItem;
}
