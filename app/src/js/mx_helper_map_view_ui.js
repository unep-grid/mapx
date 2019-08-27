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
  opt = opt || {};
  let idInput = opt.idInput || 'projectViewsState';
  let isCurrentProject = opt.idProject === mx.settings.project;
  let hasShiny = h.isObject(window.Shiny);
  let state = [];
  if (isCurrentProject) {
    let mData = h.getMapData();
    if (mData.viewsList) {
      state = mData.viewsList.getState();
    }
    if (hasShiny) {
      Shiny.onInputChange(idInput, JSON.stringify(state));
    }
  }
  return state;
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
  let idsViews = views.map((v) => v.id);
  state.forEach((s, i) => {
    if (s.type === 'item') {
      let missing = idsViews.indexOf(s.id) === -1;
      if (missing) {
        state.splice(i, 1);
      }
    }
  });
  /**
   * Expend state
   */
  let idsState = state.map((s) => s.id);
  idsViews.forEach((i) => {
    let unrefer = idsState.indexOf(i) === -1;
    if (unrefer) {
      let newItem = {id: i, type: 'item', render: true, moveTop: true};
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
  let settings = {
    id: view.id,
    moveTop: true,
    render: true,
    open: true,
    view: view
  };
  opt = Object.assign({}, settings, opt);
  let mData = mx.helpers.getMapData();
  let ids = mData.views.map((v) => v.id);
  let idPosOld = ids.indexOf(view.id);
  let idNew = idPosOld === -1;
  if (!idNew) {
    mData.views.splice(idPosOld, 1);
  }
  mData.views.unshift(view);
  mData.viewsList.addItem(opt);
  mData.viewsFilter.update();
}

export function updateViewsFilter() {
  const h = mx.helpers;
  let mData = h.getMapData();
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
  let mData = h.getMapData(o.id);
  let elViewsContainer = document.querySelector('.mx-views-container');
  let elFilterText = document.getElementById('viewsFilterText');
  let elFilterTags = document.getElementById('viewsFilterContainer');
  let elFilterSwitch = document.getElementById('viewsFilterSwitch');
  let elViewsList = elViewsContainer.querySelector('.mx-views-list');
  let views = o.views;
  let hasState = o.state && h.isArray(o.state) && o.state.length > 0;
  let state = hasState ? o.state : h.viewsToNestedListState(views);

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
   * Replace content without replacing views array
   */
  mData.views.length = 0;
  mData.views.push(...views);

  /**
   * Sync views and state: trim and expend
   * according to actual views list
   */
  state = updateState(mData.views, state);

  /**
   *
   */

  /**
   * Create views list ui
   */
  mData.viewsList = new NestedList(elViewsList, {
    id: mx.settings.project,
    state: state,
    useStateStored: true,
    autoMergeState: true,
    customClassDragIgnore: ['mx-view-tgl-more-container'],
    customDictItems: [
      {id: 'name_group', en: 'category', fr: 'catégorie'},
      {id: 'name_item', en: 'view', fr: 'vue'}
    ],
    onSetDragImage: handleSetDragImage,
    onRenderItemContent: handleRenderItemContent,
    onGetItemTextById : (id) => {
      return mx.helpers.getViewTitleNormalized(id);
    },
    onGetItemDateById : (id) => {
      return mx.helpers.getView(id).date_modified;
    },
    onChange: () => {
      mx.helpers.viewControler();
    },
    emptyLabel: getEmptyLabel()
  });

  /**
   * Handle views list filtering
   */
  mData.viewsFilter = new ViewsFilter(mData.views, {
    elFilterTags: elFilterTags,
    elFilterText: elFilterText,
    operator: 'and',
    onFilter: (ids, rules) => {
      mData.viewsList.filterById(ids, {
        flatMode: false || rules.length < 0 // > 0 NOTE: remove this
      });
    }
  });

  /**
   * Toggle between AND or OR operator for filter
   */
  mData.viewsSwitchToggle = new Switch(elFilterSwitch, {
    labelLeft: '⋂',
    labelRight: '⋃',
    onChange: (s) => {
      let op = s ? 'or' : 'and';
      mData.viewsFilter.setOperator(op);
    }
  });

  /*
   * Global translation
   */
  h.updateLanguageElements();

  /**
   * Handle view click
   */
  mx.listenerStore.addListener({
    target: elViewsList,
    bind: mData.viewsList,
    type: 'click',
    group: 'view_list',
    listener: handleViewClick
  });

  /**
   * Local helpers
   */
  function handleSetDragImage(el) {
    let li = this;
    let isGroup = li.isGroup(el);
    let isItem = !isGroup && li.isItem(el);
    if (isGroup) {
      return el.querySelector('.li-group-header');
    }
    if (isItem) {
      return el.querySelector('label');
    }
    return el;
  }

  /*
   * Render view
   */
  function handleRenderItemContent(el, data) {
    let li = this;

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

    let view = mData.views.find((v) => v.id === data.id);
    let missing = !h.isView(view);

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
    let viewBase = new ViewBase(view);
    let elView = viewBase.getEl();
    let open = data.open === true;
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
  let mData = h.getMapData();
  let viewList = mData.viewsList;
  if (viewList instanceof NestedList) {
    viewList.setEmptyMode(enable);
  }
}

function getEmptyLabel() {
  const h = mx.helpers;
  let noViewKey = 'noView';
  let elTitle;
  let elItem = h.el(
    'div',
    {
      class: ['mx-item-empty']
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
