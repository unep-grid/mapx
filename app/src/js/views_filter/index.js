import {
  getArrayDistinct,
  getArrayStat,
  getArrayIntersect
} from '../array_stat/index.js';
import {Toggle} from './components/toggle.js';
import {Switch} from './../switch/index.js';
import {ListenerStore} from './../listener_store/index.js';
import {path} from './../mx_helper_misc.js';
import {el} from '@fxi/el';
import {getDictItem} from './../mx_helper_language.js';
import './style.css';
const settings = {
  onFilter: (idViews) => {
    console.log(idViews);
  },
  onUpdateCount: (nTot, nFilter) => {
    console.table({nTot: nTot, nFilter: nFilter});
  },
  mode: 'intersection',
  elFilterText: document.body,
  elFilterTags: document.body,
  elFilterActivated: document.body,
  views: [],
  debug: false
};

class ViewsFilter {
  constructor(views, opt) {
    const vf = this;
    vf.opt = Object.assign({}, settings, opt);
    vf._lStore = new ListenerStore();
    vf.initStorage(views);
    vf.initListeners();
    vf.initSwitchMode();
    vf.update();
  }

  update() {
    const vf = this;
    vf.removeRules();
    vf.updateViewsComponents();
    vf.updateToggles();
  }

  initStorage(views) {
    const vf = this;
    vf._views = views || opt.views;
    vf._toggles = [];
    vf._rules = [];
    vf._previousState = [];
  }

  initListeners() {
    const vf = this;

    vf._lStore.addListener({
      target: vf.opt.elFilterActivated,
      type: ['click'],
      callback: handleFilterActivatedView,
      group: 'view_filter',
      bind: vf
    });

    vf._lStore.addListener({
      target: vf.opt.elFilterTags,
      type: ['click'],
      callback: handleFilterViewIdByToggle,
      group: 'view_filter',
      bind: vf
    });
    vf._lStore.addListener({
      target: vf.opt.elFilterText,
      type: ['keyup'],
      callback: handleFilterViewIdByText,
      group: 'view_filter',
      debounce: true,
      debounceTime: 100,
      bind: vf
    });
  }
  initSwitchMode() {
    const vf = this;
    vf.switchMode = new Switch(vf.opt.elFilterSwitch, {
      labelLeft: el(
        'div',
        {dataset: {lang_key: 'filter_views_list_mode_intersection'}},
        'Intersection'
      ),
      labelRight: el(
        'div',
        {dataset: {lang_key: 'filter_views_list_mode_union'}},
        'Union'
      ),
      onChange: (enabled) => {
        const op = enabled === true ? 'union' : 'intersection';
        vf.setMode(op, false);
        vf.filter('handler_switch_mode');
      }
    });
  }

  destroy() {
    const vf = this;
    vf.clear();
    vf._lStore.destroy();
    vf.switchMode.destroy();
  }

  filter(from) {
    const vf = this;
    const pState = vf._previousState;
    const state = vf.getViewsIdSubset();
    const rules = vf.getRules();
    if (pState !== state) {
      vf._previousState = state;
      vf.opt.onFilter(state, rules);
      vf.updateCount();
    }
    if (vf.opt.debug) {
      console.log('filter', from, rules);
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

  getRuleByHash(hash) {
    return this._rules.reduce(
      (a, r) => (a ? a : r.hash === hash ? r : null),
      null
    );
  }

  getRules() {
    return this._rules || [];
  }

  removeRules() {
    this._rules.length = 0;
  }

  updateRule(rule) {
    const vf = this;
    rule = Object.assign(
      {},
      {
        idViews: [],
        type: null,
        id: null,
        group: null,
        enable: false
      },
      rule
    );

    const hash = [rule.group, rule.type, rule.id].join(':');
    const rules = vf.getRules();
    const ruleStored = vf.getRuleByHash(hash);
    const ruleExists = !!ruleStored;

    if (ruleExists && rule.enable) {
      ruleStored.idViews.length = 0;
      ruleStored.idViews.push(...rule.idViews);
    }

    if (!ruleExists && rule.enable) {
      rule.hash = hash;
      rules.push(rule);
    }

    if (ruleExists && !rule.enable) {
      const pos = rules.indexOf(ruleStored);
      rules.splice(pos, 1);
    }
  }

  getViewsSubset() {
    const vf = this;
    const idViews = vf.getViewsIdSubset();
    const views = vf.getViews();
    const res = views.filter((v) => idViews.indexOf(v.id) > -1);
    return res;
  }

  getViewsIdSubset() {
    const vf = this;
    const rules = vf.getRules();
    const isIntersect = vf.opt.mode.toLowerCase() === 'intersection';
    const viewsBase = isIntersect ? vf.getViewsId() : [];
    const subset = rules.reduce((a, r) => {
      const idViews = r.idViews;
      if (isIntersect) {
        return getArrayIntersect(a, idViews);
      } else {
        return a.concat(idViews);
      }
    }, viewsBase);
    let distinct = getArrayDistinct(subset);
    /**
     * By defaut, empty set in union mode,
     * everything is displayed;
     */
    if (!isIntersect && distinct.length === 0) {
      distinct = vf.getViewsId();
    }
    return distinct;
  }

  setMode(op, updateSwitch) {
    const vf = this;
    const modes = ['intersection', 'union'];
    const opfinal = modes.indexOf(op) > -1 ? op : modes[0];
    const enableSwitch = opfinal === 'union';
    vf.opt.mode = opfinal;
    if (updateSwitch !== false) {
      vf.switchMode.setState(enableSwitch);
    }
  }

  addToggle(toggle, elParent) {
    this._toggles.push(toggle);
    if (elParent) {
      elParent.appendChild(toggle.el);
    }
  }

  getToggles() {
    return this._toggles;
  }

  getToggle(id, type) {
    return this.getToggles().reduce(
      (a, t) => (!a && t._id === id && t_type === type ? t : a),
      null
    );
  }

  filterCombined(opt) {
    const vf = this;
    opt = Object.assign(
      {},
      {
        reset: false,
        rules: [],
        mode: 'intersection'
      },
      opt
    );

    if (opt.reset) {
      vf.reset();
    }

    opt.rules.forEach((r) => {
      if (r.type === 'view_collections' || r.type === 'view_components') {
        vf.updateToggleState(r);
      }
      if (r.type === 'text') {
        vf.updateRuleByText(r, true);
      }
    });

    vf.getToggles().forEach((t) => {
      vf.updateRuleByToggle(t);
    });

    vf.setMode(opt.mode);
    vf.filter('filter_combined');
  }

  updateToggleState(opt) {
    const vf = this;
    opt = Object.assign(
      {},
      {
        type: null,
        value: [],
        state: true
      },
      opt
    );

    opt.state = opt.state === false ? false : true;
    opt.value = Array.isArray(opt.value) ? opt.value : [opt.value];

    /*
     * Enable or disable taggles
     */
    vf.getToggles().forEach((t) => {
      const hasType = t._type === opt.type;
      if (!hasType) {
        return;
      }
      const hasId = opt.value.indexOf(t.id) > -1;
      const enable = opt.state && hasId;
      if (t.getState() !== enable) {
        t.setState(enable);
      }
    });
  }

  updateRuleByText(opt, update) {
    const vf = this;
    const views = vf.getViews();
    const id = vf.opt.elFilterText.id;
    opt = Object.assign(
      {},
      {
        value: '',
        state: false
      },
      opt
    );

    if (update) {
      vf.opt.elFilterText.value = opt.value;
    }

    const enable = opt.value.length > 0;
    const expr = txtToRegex(opt.value);

    const idViews = views.reduce((a, v) => {
      const found =
        enable &&
        Object.values(path(v, 'data.title', {}))
          .join(' ')
          .toLowerCase()
          .search(expr) > -1;

      if (found) {
        return a.concat(v.id);
      }

      return a;
    }, []);

    vf.updateRule({
      group: 'input',
      type: 'text',
      id: id,
      idViews: idViews,
      enable: enable
    });
  }

  updateRuleByToggle(tgl) {
    const vf = this;

    if (!(tgl instanceof Toggle)) {
      return;
    }

    const views = vf.getViews();
    const type = tgl.getType();
    const id = tgl.getId();
    const state = tgl.getState();
    const idViews = [];
    let found = false;

    if (state) {
      idViews.push(
        ...views.reduce((a, v) => {
          found = isFound(v, type, id);
          if (found) {
            a.push(v.id);
          }
          return a;
        }, [])
      );
    }

    vf.updateRule({
      group: 'toggle',
      type: type,
      id: id,
      idViews: idViews,
      enable: state
    });
  }

  removeToggle(toggle) {
    const toggles = this._toggles;
    const pos = toggles.indexOf(toggle);
    if (pos > -1) {
      toggles.splice(pos, 1);
    }
  }

  updateToggles() {
    return updateToggles.bind(this)();
  }

  updateTogglesOrder() {
    return updateTogglesOrder.bind(this)();
  }

  reset() {
    const vf = this;
    vf.getToggles()
      .forEach((t) => {
      t.setState(false);
    });
    vf.removeRules();
    
    const elFilter = vf.opt.elFilterActivated;
    const elFilterText = vf.opt.elFilterText;

    elFilter.classList.remove('active');
    elFilterText.value = '';
    vf.filter('reset');
  }

  clear() {
    const vf = this;
    vf.reset();
    /**
    * Remove toggles
    */
    vf.getToggles()
      .forEach((t) => {
      t.destroy();
      vf.removeToggle(t);
    });
    const elToggles = vf.opt.elFilterTags;
    while (elToggles.firstElementChild) {
      elToggles.removeChild(elToggles.firstElementChild);
    }
  }

  updateCount() {
    const vf = this;
    const views = vf.getViews();
    const viewsSubset = vf.getViewsSubset();
    const isIntersect = vf.opt.mode === 'intersection';
    const viewsDisplayed = isIntersect ? viewsSubset : views;
    const toggles = vf.getToggles();
    const togglesCount = getFreqTable(viewsDisplayed);
    let count, byType, byId;
    toggles.forEach((toggle) => {
      count = 0;
      byType = togglesCount[toggle.getType()];
      if (byType) {
        byId = byType[toggle.getId()];
        if (byId) {
          count = byId;
        }
      }
      toggle.setCount(count);
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
      components.push('sm');
    }

    if (Array.isArray(widgets)) {
      components.push('dashboard');
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
 * Extract toggles from various path in given views list and produce frequency tables
 * @param {Array} v Views list
 * @note : expect type, data.collections
 */
export function getFreqTable(views) {
  const path = mx.helpers.path;
  const toggles = {
    components: [],
    collections: []
  };

  const stat = {};

  views.forEach(function(v) {
    toggles.components = toggles.components.concat(path(v, '_components', []));
    toggles.collections = toggles.collections.concat(
      path(v, 'data.collections', [])
    );
  });

  // grouprs
  stat.view_components = getArrayStat({
    arr: toggles.components,
    stat: 'frequency'
  });

  stat.view_collections = getArrayStat({
    arr: toggles.collections,
    stat: 'frequency'
  });

  return stat;
}

function updateTogglesOrder() {
  const vf = this;
  const toggles = vf.getToggles();
  const types = ['view_components', 'view_collections'];

  types.forEach((t) => {
    const tt = toggles.filter((toggle) => toggle.getType() === t);
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
    if (!txt || !txt.toLowerCase) {
      return txt;
    }
    return txt.toLowerCase().trim();
  }
}

function updateToggles() {
  const vf = this;
  const views = vf.getViews();
  const elContainer = vf.opt.elFilterTags;
  const table = getFreqTable(views);
  const types = Object.keys(table);
  const elToggles = document.createDocumentFragment();
  const labels = [];

  let elTypes;
  let elCollections;
  vf.clear();

  const parts = [
    elTitleKey('view_components'),
    (elTypes = elGroup()),
    elTitleKey('view_collections'),
    (elCollections = elGroup())
  ];

  parts.forEach((p) => {
    elToggles.appendChild(p);
  });

  const groups = {
    view_components: elTypes,
    view_collections: elCollections
  };

  types.forEach((type) => {
    const tbl = table[type];
    const keys = Object.keys(tbl);
    const elParent = groups[type];
    if (keys.length === 0) {
      elParent.appendChild(elEmpty());
    }
    keys.forEach((key, i) => {
      const label = getDictItem(key);
      const toggle = new Toggle({
        order: i,
        id: key,
        label_key: key,
        label: label,
        count: tbl[key],
        type: type
      });
      vf.addToggle(toggle, elParent);
      labels.push(label);
    });
  });

  /**
   * Update toggles order when toggles labels are updated
   */
  Promise.all(labels).then(() => {
    return vf.updateTogglesOrder();
  });

  /**
   * Render fragment
   */
  elContainer.appendChild(elToggles);
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
  function elEmpty() {
    var promText = getDictItem('view_filter_no_items');
    return el(
      'div',
      {
        class: ['vf-check-toggle-empty'],
        dataset: {lang_key: 'view_filter_no_items'}
      },
      promText
    );
  }
}

function handleFilterViewIdByText(event) {
  const vf = this;
  const text = event.target.value.toLowerCase();

  vf.updateRuleByText({
    value: text
  });
  vf.filter('handler_text');
}

function handleFilterViewIdByToggle(event) {
  const vf = this;
  if (!(event instanceof Event)) {
    return;
  }

  const elToggle = findToggle(event.target);

  if (!elToggle || !isToggle(elToggle)) {
    return;
  }

  event.stopPropagation();
  event.stopImmediatePropagation();

  const tgl = elToggle.toggle;
  vf.updateRuleByToggle(tgl);
  vf.filter('handler_toggle');
}

function handleFilterActivatedView(event) {
  const vf = this;
  const clActive = 'active';
  const elBtn = event.target;
  const id = elBtn.id;
  const toDisable = elBtn.classList.contains(clActive);
  if (toDisable) {
    elBtn.classList.remove(clActive);
  } else {
    elBtn.classList.add(clActive);
  }
  const views = vf.getViews();
  const idViews = views.reduce((a, v) => {
    let isOpen = v._vb.isOpen();
    if (!toDisable && isOpen) {
      a.push(v.id);
    }
    return a;
  }, []);

  vf.updateRule({
    group: 'input',
    type: 'views_activated',
    id: id,
    idViews: idViews,
    enable: !toDisable
  });
  vf.filter('handler_activated');
}

/**
 * Misc
 */

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
