import {NestedList} from './nested_list/index.js';
import {ViewsFilter} from './views_filter/index.js';
import {Switch} from './switch/index.js';
import {ViewBase} from './views_builder/view_base.js';

/**
 * Get the current project views state.
 *
 * @param {Object} opt Options
 * @param {String} opt.idProject ID of the project
 * @param {String} opt.idInput Shiny input id. This will trigger an event in Shiny with the state as value
 * @return {Array} State
 */
export function getProjectViewsState(opt) {
  const h = mx.helpers;
  opt = Object.assign(
    {},
    {idProject: mx.settings.project, idInput: 'projectViewsStates'},
    opt
  );
  const idInput = opt.idInput;
  const isCurrentProject = opt.idProject === mx.settings.project;
  const hasShiny = h.isObject(window.Shiny);
  const state = [];
  if (isCurrentProject) {
    const mData = h.getMapData();
    if (mData.viewsList) {
      if (mData.viewsList.isModeFrozen()) {
        alert('Operation not allowed : remove activated filters');
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
 * Get current collections available in rendered views
 * @param {Object} opt  Options
 * @param {String} opt.idInput Shiny input id,
 */
export function getProjectViewsCollections(opt) {
  const h = mx.helpers;
  opt = Object.assign({}, {idInput: 'projectViewsCollections'}, opt);
  const hasShiny = h.isObject(window.Shiny);
  const views = h.getViews();
  const collections = h.getArrayDistinct(
    views.flatMap((v) => h.path(v, 'data.collections', []))
  );

  if (hasShiny && opt.idInput) {
    Shiny.onInputChange(opt.idInput, collections);
  }
  return collections;
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
      group: 'root',
      type: 'item'
    };
  });
}

/**
 * Trim and expend state according to views list
 * @param {Array} state State list
 * @return {Array} modified state
 */
function sanitizeState(states) {
  const h = mx.helpers;
  const hasStateStored = h.isArray(states.stored) && 
    states.stored.length > 0;
  let state = hasStateStored ? states.stored : states.orig || [];
  /**
   * Trim state
   */
  const views = h.getViews();
  const idsViews = views.map((v) => v.id);
  state = state.filter((s) => {
    return s.type !== 'item' || idsViews.indexOf(s.id) > -1;
  });
  /**
   * Expend state
   */
  const idsState = state.map((s) => s.id);
  idsViews.forEach((i) => {
    const unrefer = idsState.indexOf(i) === -1;
    if (unrefer) {
      const newItem = {id: i, type: 'item', render: true, moveTop: true};
      state.push(newItem);
    }
  });

  return state;
}

/**
 * Add single view to the views list
 * @param {Object} view View object to add
 * @param {Object} settings Settings (id,moveTop,render,open)
 */
export function viewsListAddSingle(view, settings) {
  settings = settings || {};
  const h = mx.helpers;
  if (!h.isView(view)) {
    return;
  }
  const settings_default = {
    id: view.id,
    moveTop: true,
    render: true,
    open: true,
    view: view
  };
  settings = Object.assign({}, settings_default, settings);

  const mData = mx.helpers.getMapData();
  const ids = mData.views.map((v) => v.id);
  const idPosOld = ids.indexOf(view.id);
  const idNew = idPosOld === -1;
  if (!idNew) {
    mData.views.splice(idPosOld, 1);
  }
  mData.views.unshift(view);
  mData.viewsList.addItem(settings);
  mData.viewsFilter.update();
}

/**
 * Update single view alread in the view list
 * @param {Object} view View object to add
 */
export function viewsListUpdateSingle(view) {
  const h = mx.helpers;
  const mData = mx.helpers.getMapData();
  const oldView = h.getView(view.id);
  if (!h.isView(oldView)) {
    console.warn('No old view to update');
  }
  h.viewModulesRemove(oldView);
  Object.assign(oldView, view);
  const settings = {
    id: view.id,
    view: oldView,
    update: true
  };
  mData.viewsList.updateItem(settings);
  mData.viewsFilter.updateViewsComponents();
  mData.viewsFilter.updateCount();
}

export function updateViewsFilter() {
  const h = mx.helpers;
  const mData = h.getMapData();
  mData.viewsFilter.update();
}

/**
 * Render views HTML list in viewStore
 * @param {object} o options
 * @param {string} o.id map id
 * @param {Object} o.views views to render
 * @param {boolean} o.add Add views to an existing list
 */
export function viewsListRenderNew(o) {
  const h = mx.helpers;
  const idMap = o.id;
  const mData = h.getMapData(idMap);
  const elViewsContainer = document.querySelector('.mx-views-container');
  const elFilterText = document.getElementById('viewsFilterText');
  const elFilterTags = document.getElementById('viewsFilterContainer');
  const elFilterActivated = document.getElementById('btnFilterChecked');
  const elFilterSwitch = document.getElementById('viewsFilterSwitch');
  const elFilterCount = document.getElementById('viewsFilterCount');
  const elViewsList = elViewsContainer.querySelector('.mx-views-list');
  const views = o.views;
  const hasState = o.state && h.isArray(o.state) && o.state.length > 0;
  const state = hasState ? o.state : h.viewsToNestedListState(views);
  const noViewsMode = h.getQueryParameterInit('noViews')[0] === 'true';

  if (mData.viewsFilter instanceof ViewsFilter) {
    mData.viewsFilter.destroy();
  }
  if (mData.viewsList instanceof NestedList) {
    mData.viewsList.destroy();
  }
  if (mData.viewsSwitchToggle instanceof Switch) {
    mData.viewsSwitchToggle.destroy();
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
    id: mx.settings.project,
    state: state,
    locked: noViewsMode,
    useStateStored: true,
    autoMergeState: true,
    emptyLabel: getEmptyLabel(),
    classDragHandle: 'li-drag-handle',
    addDictItems: [
      {id: 'name_group', en: 'category', fr: 'catégorie'},
      {id: 'name_item', en: 'view', fr: 'vue'}
    ],
    eventsCallback: [
      {id: 'set_drag_image', action: handleSetDragImage},
      {id: 'set_drag_text', action: handleSetDragText},
      {id: 'render_item_content', action: handleRenderItemContent},
      {id: 'get_item_text_by_id', action: h.getViewTitleNormalized},
      {id: 'get_item_date_by_id', action: h.getViewDateModified},
      {id: 'filter_end', action: h.viewsCheckedUpdate},
      {id: 'state_reset', action: h.viewsCheckedUpdate},
      {id: 'state_change', action: h.viewsCheckedUpdate},
      {id: 'state_order', action: h.viewsLayersOrderUpdate},
      {id: 'state_save_local', action: h.iconFlashSave},
      {id: 'state_sanitize', action: sanitizeState}
    ]
  });

  /**
   * Handle views list filtering
   */
  mData.viewsFilter = new ViewsFilter(mData.views, {
    elFilterActivated: elFilterActivated,
    elFilterTags: elFilterTags,
    elFilterText: elFilterText,
    operator: 'and',
    onFilter: (ids, rules) => {
      /*
       * Update filter activated button
       */
      h.updateBtnFilterActivated();

      /*
       * Apply filter to nested list
       */
      mData.viewsList.filterById(ids, {
        flatMode: rules.length > 0
      });
    },
    onUpdateCount: (count) => {
      /**
       * Update filter count
       */
      elFilterCount.innerText = `( ${count.nSubset} / ${count.nTot} )`;
    }
  });

  /**
   * Toggle between AND or OR operator for filter
   */
  mData.viewsSwitchToggle = new Switch(elFilterSwitch, {
    labelLeft: h.el(
      'div',
      {dataset: {lang_key: 'operator_and'}},
      'Intersection'
    ),
    labelRight: h.el('div', {dataset: {lang_key: 'operator_or'}}, 'Union'),
    onChange: (s) => {
      const op = s ? 'or' : 'and';
      mData.viewsFilter.setOperator(op);
    }
  });

  /**
   *  Auto open
   */
  filterIfOpen();

  /**
   * Set image for the drag item
   */
  function handleSetDragImage(el) {
    const li = this;
    const isGroup = li.isGroup(el);
    const isItem = !isGroup && li.isItem(el);
    if (isGroup) {
      return el.querySelector('.li-group-header');
    }
    if (isItem) {
      return el.querySelector('label');
    }
    return el;
  }
  function handleSetDragText(el) {
    const li = this;
    const isGroup = li.isGroup(el);
    const isItem = !isGroup && li.isItem(el);
    if (isGroup) {
      return el.dataset;
    }
    if (isItem) {
      const elView = el.querySelector('.mx-view-item');
      let out = '';
      if (elView && elView.vb) {
        let out = mx.helpers.getViewJson(elView.vb.view);
        return out;
      } else {
        return el.dataset;
      }
    }
    return el;
  }

  /**
   * Trigger a filter activated if any view opened
   */
  function filterIfOpen() {
    const views = h.getViews();
    let found = false;
    views.forEach((v) => {
      if (!found && v.vb.isOpen()) {
        found = true;
      }
    });
    if (found) {
      h.setBtnFilterActivated(true);
    }
  }

  /*
   * Render view item
   */
  function handleRenderItemContent(config) {
    const li = this;
    const el = config.el;
    const data = config.data;
    const viewsOpen = h.getQueryParameterInit('viewsOpen');
    const update = data.update;
    /**
     * Add given element
     */
    if (data.el) {
      el.appendChild(data.el);
      return;
    }

    /**
     * No given element, assume it's a view
     */
    const view = data.view || mData.views.find((v) => v.id === data.id);
    const missing = !h.isView(view);

    /**
     * View requested but not vailable)
     */
    if (missing) {
      li.log(`View ${data.id} unavailable`);
      li.removeItemById(data.id);
      return;
    }

    if (update && view._el) {
      view._el.remove();
    }

    /**
     * Create new view
     */
    const viewBase = new ViewBase(view, update);

    /**
     * Test if registered to auto-open
     */
    const idOpen = viewsOpen.indexOf(view.id);
    if (idOpen > -1) {
      data.open = true;
      viewsOpen.splice(idOpen, 1);
      h.setBtnFilterActivated(true);
    }

    /**
     * Handle view element
     */
    const elView = viewBase.getEl();
    const open = data.open === true;
    if (elView) {
      el.appendChild(elView);
      h.setViewBadges({view: view});
      if (update) {
        h.viewModulesInit(view);
        h.viewLayersAdd({
          viewData: view
        });
      } else if (open) {
        h.viewOpenAuto(view);
      }
    }
  }
}

/**
 * Check if there is an empty views list and add a message if needed
 */
export function setViewsListEmpty(enable) {
  enable = enable || false;
  const h = mx.helpers;
  const mData = h.getMapData();
  const viewList = mData.viewsList;
  if (viewList instanceof NestedList) {
    viewList.setModeEmpty(enable);
  }
}

function getEmptyLabel() {
  const h = mx.helpers;
  const noViewForced = h.getQueryParameterInit('noViews')[0] === 'true';
  const noViewKey = noViewForced ? 'noView' : 'noViewOrig';
  let elTitle;
  const elItem = h.el(
    'div',
    {
      class: ['mx-view-item-empty']
    },
    (elTitle = h.el('span', {
      dataset: {
        lang_key: noViewKey
      }
    }))
  );
  h.getDictItem(noViewKey).then((item) => {
    elTitle.innerHTML = item;
  });

  return elItem;
}
