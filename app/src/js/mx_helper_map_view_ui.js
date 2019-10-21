import {NestedList} from './nested_list/index.js';
import {ViewsFilter} from './views_filter/index.js';
import {handleViewClick} from './views_click/index.js';
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
 * @param {Array} views Views list
 * @param {Array} state State list
 * @return {Array} modified state
 */
function updateState(views, state) {
  /**
   * Trim state
   */
  const idsViews = views.map((v) => v.id);
  state.forEach((s, i) => {
    if (s.type === 'item') {
      const missing = idsViews.indexOf(s.id) === -1;
      if (missing) {
        state.splice(i, 1);
      }
    }
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
 * Add signle view to the views list
 * @param {Object} view View object to add
 * @param {Object} opt Options View list options (id,moveTop,render,open)
 */
export function viewsListAddSingle(view, opt) {
  opt = opt || {};
  const h = mx.helpers;
  if (!h.isView(view)) {
    return;
  }
  const settings = {
    id: view.id,
    moveTop: true,
    render: true,
    open: true,
    view: view
  };
  opt = Object.assign({}, settings, opt);
  const mData = mx.helpers.getMapData();
  const ids = mData.views.map((v) => v.id);
  const idPosOld = ids.indexOf(view.id);
  const idNew = idPosOld === -1;
  if (!idNew) {
    mData.views.splice(idPosOld, 1);
  }
  mData.views.unshift(view);
  mData.viewsList.addItem(opt);
  mData.viewsFilter.update();
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
  const mData = h.getMapData(o.id);
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
   * Clean old views, modules, array of views ...
   */
  h.viewsRemoveAll({idMap: o.id});

  /**
   * Add all new views
   */
  mData.views.push(...views);

  /**
   * Sync views and state: trim and expend
   * according to actual views list
   */
  updateState(mData.views, state);

  /**
   * Create views list ui
   */
  mData.viewsList = new NestedList(elViewsList, {
    id: mx.settings.project,
    state: state,
    locked: noViewsMode,
    useStateStored: true,
    autoMergeState: true,
    customClassDragIgnore: ['mx-view-tgl-more-container'],
    customDictItems: [
      {id: 'name_group', en: 'category', fr: 'catégorie'},
      {id: 'name_item', en: 'view', fr: 'vue'}
    ],
    onSetDragImage: handleSetDragImage,
    onRenderItemContent: handleRenderItemContent,
    onGetItemTextById: (id) => {
      return h.getViewTitleNormalized(id);
    },
    onGetItemDateById: (id) => {
      return h.getView(id).date_modified;
    },
    onChange: () => {
      h.viewsRender();
    },
    onFilterEnd: () => {
      h.viewsRender();
    },
    onResetState: () => {
      h.viewsRender();
    },
    onSaveLocal: () => {
      mx.helpers.iconFlash('floppy-o');
    },
    emptyLabel: getEmptyLabel()
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
   * Handle view click
   */
  mx.listenerStore.addListener({
    //target: elViewsList,
    target: document.body,
    bind: mData.viewsList,
    type: 'click',
    idGroup: 'view_list',
    callback: handleViewClick
  });

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

  /*
   * Render view item
   */
  function handleRenderItemContent(el, data) {
    const li = this;

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
    const view = mData.views.find((v) => v.id === data.id);
    const missing = !h.isView(view);

    /**
     * View requested but not vailable)
     */
    if (missing) {
      li.log(`View ${data.id} unavailable`);
      li.removeItemById(data.id);
      return;
    }
    /**
     * Add new view list item
     */
    const viewBase = new ViewBase(view);
    const elView = viewBase.getEl();
    view._el = elView;
    const open = data.open === true;
    if (elView) {
      el.appendChild(elView);
      h.setViewBadges({view: view});
      if (open) {
        viewBase.open();
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
