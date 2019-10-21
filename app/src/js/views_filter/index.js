import {
  getArrayDistinct,
  getArrayStat,
  getArrayIntersect
} from '../array_stat/index.js';
import {Toggle} from './components/toggle.js';
import {ListenerStore} from './../listener_store/index.js';
import {path} from './../mx_helper_misc.js';
import {el} from '@fxi/el';
import {getDictItem} from './../mx_helper_language.js';
import './style.css';

const settings = {
  onFilter: (ids) => {
    console.log(ids);
  },
  onUpdateCount: (nTot, nFilter) => {
    console.table({nTot: nTot, nFilter: nFilter});
  },
  operator: 'and',
  elFilterText: document.body,
  elFilterTags: document.body,
  elFilterActivated: document.body,
  views: []
};

class ViewsFilter {
  constructor(views, opt) {
    const vf = this;
    vf.opt = Object.assign({}, settings, opt);
    vf.lStore = new ListenerStore();
    vf.initStorage(views);
    vf.initListeners();
    vf.update();
  }

  update() {
    const vf = this;
    vf.removeRules();
    vf.updateViewsComponents();
    vf.updateTags();
  }

  initStorage(views) {
    const vf = this;
    vf._views = views || opt.views;
    vf._tags = [];
    vf._rules = [];
    vf._previousState = [];
  }

  initListeners() {
    const vf = this;

    vf.lStore.addListener({
      target: vf.opt.elFilterActivated,
      type: ['click'],
      callback: handleFilterActivatedView,
      group: 'view_filter',
      bind: vf
    });

    vf.lStore.addListener({
      target: vf.opt.elFilterTags,
      type: ['click'],
      callback: handleFilterViewIdByTag,
      group: 'view_filter',
      bind: vf
    });
    vf.lStore.addListener({
      target: vf.opt.elFilterText,
      type: 'keyup',
      callback: handleFilterViewIdByText,
      group: 'view_filter',
      debounce: true,
      bind: vf
    });
  }
  destroy() {
    const vf = this;
    vf.clear();
    vf.lStore.destroy();
  }

  filter() {
    const vf = this;
    const pState = vf._previousState;
    const state = vf.getViewsIdSubset();
    const rules = vf.getRules();
    if (pState !== state) {
      vf._previousState = state;
      vf.opt.onFilter(state, rules);
      vf.updateCount();
    }
  }

  getViews() {
    return this._views;
  }
  getViewsId() {
    return this._views.map((v) => v.id);
  }
  setViews(views) {
    return this._views === views || [];
  }

  getRules() {
    return this._rules || [];
  }
  removeRules() {
    this._rules.length = 0;
  }
  updateRule(idRule, ids, enable) {
    const vf = this;
    const rules = vf.getRules();
    let rule = rules.filter((r) => r.idRule === idRule)[0];
    const ruleExists = typeof rule !== 'undefined';

    if (ruleExists && enable) {
      rule.ids = ids;
    }
    if (!ruleExists && enable) {
      rule = {
        idRule: idRule,
        ids: ids
      };
      rules.push(rule);
    }

    if (ruleExists && !enable) {
      const pos = rules.indexOf(rule);
      rules.splice(pos, 1);
    }
    vf.filter();
  }

  getViewsSubset() {
    const vf = this;
    const ids = vf.getViewsIdSubset();
    const views = vf.getViews();
    const res =  views.filter((v) => ids.indexOf(v.id) > -1);
    return res;
  }

  getViewsIdSubset() {
    const vf = this;
    const rules = vf.getRules();
    const isIntersect = vf.opt.operator.toLowerCase() === 'and';
    const viewsBase = isIntersect ? vf.getViewsId() : [];
    const subset = rules.reduce((a, r) => {
      const ids = r.ids;
      if (isIntersect) {
        return getArrayIntersect(a, ids);
      } else {
        return a.concat(ids);
      }
    }, viewsBase);
    let distinct = getArrayDistinct(subset);
    /**
    * By defaut, empty set in union mode,
    * everything is displayed;
    */
    if(!isIntersect && distinct.length === 0){
      distinct = vf.getViewsId();
    }
    return distinct;
  }

  setOperator(op) {
    const vf = this;
    vf.opt.operator = op;
    vf.filter();
  }

  setTags(tags) {
    this._tags = tags;
  }
  addTag(tag, elParent) {
    this._tags.push(tag);
    if (elParent) {
      elParent.appendChild(tag.el);
    }
  }
  getTags() {
    return this._tags;
  }
  removeTag(tag) {
    const tags = this._tags;
    const pos = tags.indexOf(tag);
    if (pos > -1) {
      tags.splice(pos, 1);
    }
  }

  updateTags() {
    return updateTags.bind(this)();
  }
  updateTagsOrder() {
    return updateTagsOrder.bind(this)();
  }

  clear() {
    const vf = this;
    vf.removeRules();
    vf.filter();
    vf._tags.forEach((t) => {
      t.destroy();
      vf.removeTag(t);
    });
    const elTags = vf.opt.elFilterTags;
    const elFilter = vf.opt.elFilterActivated;
    while (elTags.firstElementChild) {
      elTags.removeChild(elTags.firstElementChild);
    }
    elFilter.classList.remove('active');
  }

  updateCount() {
    const vf = this;
    const views = vf.getViews();
    const viewsSubset = vf.getViewsSubset();
    const isIntersect = vf.opt.operator === 'and';
    const viewsDisplayed = isIntersect ? viewsSubset : views;
    const tags = vf.getTags();
    const tagsCount = getFreqTable(viewsDisplayed);
    let count, byType, byId;
    tags.forEach((tag) => {
      count = 0;
      byType = tagsCount[tag.getType()];
      if (byType) {
        byId = byType[tag.getId()];
        if (byId) {
          count = byId;
        }
      }
      tag.setCount(count);
    });
    vf.opt.onUpdateCount({
      nTot: views.length,
      nSubset: viewsSubset.length
    });
  }

  updateViewsComponents() {
    const vf = this;
    const views = vf.getViews();
    setViewsComponents(views);
  }
}

export {ViewsFilter};

/**
 * Helpers
 */

function isFound(view, type, filter) {
  let found = false;
  switch (type) {
    case 'view_classes':
      if (view.data && view.data.classes) {
        found = view.data.classes.indexOf(filter) > -1;
      }
      break;
    case 'view_collections':
      if (view.data && view.data.collections) {
        found = view.data.collections.indexOf(filter) > -1;
      }
      break;
    case 'view_components':
      if (view._components) {
        found = view._components.indexOf(filter) > -1;
      }
      break;
    default:
      found = false;
  }
  return found;
}

/**
 * Add components in view for an array of views
 * @param {Array} views Array of views to update
 */
function setViewsComponents(views) {
  views.forEach((v) => {
    let components = [],
      isVt,
      isGj,
      isSm,
      isCc,
      isRt,
      widgets,
      story,
      overlap,
      attributes,
      customStyle;

    isVt = v.type === 'vt';
    isSm = v.type === 'sm';
    isCc = v.type === 'cc';
    isRt = v.type === 'rt';
    isGj = v.type === 'gj';

    widgets = path(v, 'data.dashboard.widgets', '');
    story = path(v, 'data.story.steps', '');
    overlap = path(v, 'data.source.layerInfo.maskName', '');
    attributes = path(v, 'data.attribute.names', '');
    customStyle = path(v, 'data.style.custom', '');

    if (isVt) {
      components.push('vt');
    }
    if (isGj) {
      components.push('gj');
    }
    if (isRt) {
      components.push('rt');
    }
    if (isSm && story && story.length) {
      components.push('story_map');
    }
    if (isVt && widgets && widgets.length) {
      components.push('dashboard');
    }
    if (!isSm) {
      components.push('layer');
    }
    if (isVt && attributes && attributes.indexOf('mx_t0') > -1) {
      components.push('time_slider');
    }
    if (isVt && typeof overlap === 'string' && overlap.length) {
      components.push('overlap');
    }
    if (
      isVt &&
      customStyle &&
      customStyle.json &&
      JSON.parse(customStyle.json).enable
    ) {
      components.push('custom_style');
    }
    if (isCc) {
      components.push('custom_code');
    }
    v._components = components;
  });
}
/**
 * Extract tags from various path in given views list and produce frequency tables
 * @param {Array} v Views list
 * @note : expect type, data.classes and data.collections
 */
export function getFreqTable(views) {
  const path = mx.helpers.path;
  const tags = {
    components: [],
    classes: [],
    collections: []
  };

  const stat = {};

  views.forEach(function(v) {
    tags.components = tags.components.concat(path(v, '_components', []));
    tags.classes = tags.classes.concat(path(v, 'data.classes', []));
    tags.collections = tags.collections.concat(path(v, 'data.collections', []));
  });

  // grouprs
  stat.view_components = getArrayStat({
    arr: tags.components,
    stat: 'frequency'
  });

  stat.view_classes = getArrayStat({
    arr: tags.classes,
    stat: 'frequency'
  });

  stat.view_collections = getArrayStat({
    arr: tags.collections,
    stat: 'frequency'
  });

  return stat;
}

function updateTagsOrder() {
  const vf = this;
  const tags = vf.getTags();
  const types = ['view_components', 'view_classes', 'view_collections'];

  types.forEach((t) => {
    const tt = tags.filter((tag) => tag.getType() === t);
    tt.sort((a, b) => {
      let aLabel = n(a.getLabel());
      let bLabel = n(b.getLabel());
      if (aLabel > bLabel) {
        return 1;
      }
      if (bLabel > aLabel) {
        return -1;
      }
      return 0;
    });
    tt.forEach((t, i) => {
      t.setOrder(i);
    });
  });

  /**
   * Normalise
   */
  function n(txt) {
    return txt.toLowerCase().trim();
  }
}

function updateTags() {
  const vf = this;
  const views = vf.getViews();
  const elContainer = vf.opt.elFilterTags;
  const table = getFreqTable(views);
  const types = Object.keys(table);
  const elTags = document.createDocumentFragment();
  const labels = [];

  let elTypes;
  let elThemes;
  let elCollections;
  vf.clear();

  const parts = [
    elTitleKey('view_components'),
    (elTypes = elGroup()),
    elTitleKey('view_classes'),
    (elThemes = elGroup()),
    elTitleKey('view_collections'),
    (elCollections = elGroup())
  ];

  parts.forEach((p) => {
    elTags.appendChild(p);
  });

  const groups = {
    view_components: elTypes,
    view_classes: elThemes,
    view_collections: elCollections
  };

  types.forEach((type) => {
    const tbl = table[type];
    const keys = Object.keys(tbl);
    keys.forEach((key, i) => {
      const label = getDictItem(key);
      const tag = new Toggle({
        order: i,
        id: key,
        label_key: key,
        label: label,
        count: tbl[key],
        type: type
      });
      const elParent = groups[type];
      vf.addTag(tag, elParent);
      labels.push(label);
    });
  });

  /**
   * Update tags order when tags labels are updated
   */
  Promise.all(labels).then(() => {
    return vf.updateTagsOrder();
  });

  /**
   * Render fragment
   */
  elContainer.appendChild(elTags);
  /**
   * Helpers
   */

  function elTitleKey(key) {
    return el(
      'span',
      {
        class: 'vf-check-toggle-group-title',
        dataset: {lang_key: key}
      },
      getDictItem(key)
    );
  }

  function elGroup() {
    return el('div', {
      class: ['vf-check-toggle-group']
    });
  }
}

/**
 * Filter view by text
 */
function handleFilterViewIdByText(event) {
  const vf = this;
  const txt = event.target.value.toLowerCase();
  const views = vf.getViews();
  const expr = txtToRegex(txt);
  let found = false;
  let text = '';

  const ids = views.reduce((a, v) => {
    text = Object.values(path(v, 'data.title', {}))
      .join(' ')
      .toLowerCase();
    found = text.search(expr) > -1;

    if (found) {
      return a.concat(v.id);
    } else {
      return a;
    }
  }, []);

  const enable = txt.length > 0;
  vf.updateRule('text', ids, enable);
}

function txtToRegex(txt) {
  txt = txt || '';
  txt = txt.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  // OR

  if (txt.match(/ or /)) {
    txt = txt.split(' or ').join('|');
  }
  // AND
  if (txt.match(/ and /)) {
    txt = '(?=' + txt.split(' and ').join(')(=?') + ')';
  }

  return new RegExp(txt);
}

function isToggle(el) {
  return el instanceof Element && el.toggle instanceof Toggle;
}

function findToggle(el) {
  let found = false;
  while (el && el.parentElement && !found) {
    if (isToggle(el)) {
      found = true;
      return el;
    } else {
      el = el.parentElement;
    }
  }
  return false;
}

/**
 * Filter view by tag
 */
function handleFilterViewIdByTag(event) {
  const vf = this;
  const elToggle = findToggle(event.target);

  if (!elToggle || !isToggle(elToggle)) {
    return;
  }

  event.stopImmediatePropagation();
  const isMouseOver = event.type === 'mouseover';
  const isMouseOut = event.type === 'mouseout';
  const isClick = event.type === 'click';

  const tgl = elToggle.toggle;
  const views = vf.getViews();
  const type = tgl.getType();
  const id = tgl.getId();
  const state = isClick ? tgl.getState() : isMouseOver && !isMouseOut;
  const ids = [];
  let found = false;

  if (state) {
    ids.push(
      ...views.reduce((a, v) => {
        found = isFound(v, type, id);
        if (found) {
          a.push(v.id);
        }
        return a;
      }, [])
    );
  }
  const mouseEvent = isMouseOver || isMouseOut ? 'mouse' : '';
  const idRule = ['tag', type, id, mouseEvent].join(':');
  vf.updateRule(idRule, ids, state);
}

function handleFilterActivatedView(event) {
  const vf = this;
  const clActive = 'active';
  const elBtn = event.target;
  const toDisable = elBtn.classList.contains(clActive);
  if (toDisable) {
    elBtn.classList.remove(clActive);
  } else {
    elBtn.classList.add(clActive);
  }
  const views = vf.getViews();
  const ids = views.reduce((a, v) => {
    if (!toDisable && v._open) {
      a.push(v.id);
    }
    return a;
  }, []);

  vf.updateRule('views_activated', ids, !toDisable);
}
