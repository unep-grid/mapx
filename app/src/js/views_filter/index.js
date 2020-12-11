import {
  getArrayDistinct,
  getArrayStat,
  getArrayIntersect
} from '../array_stat/index.js';
import {Checkbox} from './components/checkbox.js';
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
    vf.updateCheckboxes();
  }

  initStorage(views) {
    const vf = this;
    vf._views = views || opt.views;
    vf._checkboxes = [];
    vf._rules = [];
    vf._previousState = [];
  }

  initListeners() {
    const vf = this;

    vf._lStore.addListener({
      target: vf.opt.elFilterActivated,
      type: ['click'],
      callback: vf.filterActivated,
      group: 'view_filter',
      bind: vf
    });

    vf._lStore.addListener({
      target: vf.opt.elFilterTags,
      type: ['click'],
      callback: handleFilterViewIdByCheckbox,
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
        vf.apply('handler_switch_mode');
      }
    });
  }

  destroy() {
    const vf = this;
    vf.clear();
    vf._lStore.destroy();
    vf.switchMode.destroy();
  }

  apply(from) {
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

  addCheckbox(checkbox, elParent) {
    this._checkboxes.push(checkbox);
    if (elParent) {
      elParent.appendChild(checkbox.el);
    }
  }

  getCheckboxes() {
    return this._checkboxes;
  }

  getCheckbox(id, type) {
    return this.getCheckboxes().reduce(
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
        vf.updateCheckboxState(r);
      }
      if (r.type === 'text') {
        vf.updateRuleByText(r, true);
      }
    });

    vf.getCheckboxes().forEach((t) => {
      vf.updateRuleByCheckbox(t);
    });

    vf.setMode(opt.mode);
    vf.apply('filter_combined');
  }

  /**
   * Activate filter by activaed state
   * @param {Boolean} enable/disable the filter and set button state accordingly
   */
  filterActivated(enable) {
    const vf = this;
    const elBtn = vf.opt.elFilterActivated;
    const clActive = 'active';
    const id = elBtn.id;
    const isActive = elBtn.classList.contains(clActive) === true;
    const isToggle = typeof(enable) !== 'boolean';

    if (isToggle) {
      enable = !isActive;
    } else {
      if ((isActive && enable) || (!isActive && !enable)) {
        return;
      }
    }

    /*
     * Set classes
     */
    if (enable) {
      elBtn.classList.add(clActive);
    } else {
      elBtn.classList.remove(clActive);
    }

    /*
     * Filter views
     */
    const views = vf.getViews();
    const idViews = views.reduce((a, v) => {
      let isOpen = v._vb.isOpen();
      if (enable && isOpen) {
        a.push(v.id);
      }
      return a;
    }, []);

    /**
     * Update rule
     */
    vf.updateRule({
      group: 'input',
      type: 'views_activated',
      id: id,
      idViews: idViews,
      enable: enable
    });

    /**
     * Apply
     */
    vf.apply('handler_activated');
  }

  updateCheckboxState(opt) {
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
    vf.getCheckboxes().forEach((t) => {
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

  updateRuleByCheckbox(cbx) {
    const vf = this;

    if (!(cbx instanceof Checkbox)) {
      return;
    }

    const views = vf.getViews();
    const type = cbx.getType();
    const id = cbx.getId();
    const state = cbx.getState();
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
      group: 'checkbox',
      type: type,
      id: id,
      idViews: idViews,
      enable: state
    });
  }

  removeCheckbox(checkbox) {
    const checkboxes = this._checkboxes;
    const pos = checkboxes.indexOf(checkbox);
    if (pos > -1) {
      checkboxes.splice(pos, 1);
    }
  }

  updateCheckboxes() {
    return updateCheckboxes.bind(this)();
  }

  updateCheckboxesOrder() {
    return updateCheckboxesOrder.bind(this)();
  }

  reset() {
    const vf = this;
    vf.getCheckboxes().forEach((t) => {
      t.setState(false);
    });
    vf.removeRules();

    const elFilter = vf.opt.elFilterActivated;
    const elFilterText = vf.opt.elFilterText;

    elFilter.classList.remove('active');
    elFilterText.value = '';
    vf.apply('reset');
  }

  clear() {
    const vf = this;
    vf.reset();
    /**
     * Remove checkboxes
     */
    vf.getCheckboxes().forEach((t) => {
      t.destroy();
      vf.removeCheckbox(t);
    });
    const elCheckboxes = vf.opt.elFilterTags;
    while (elCheckboxes.firstElementChild) {
      elCheckboxes.removeChild(elCheckboxes.firstElementChild);
    }
  }

  updateCount() {
    const vf = this;
    const views = vf.getViews();
    const viewsSubset = vf.getViewsSubset();
    const isIntersect = vf.opt.mode === 'intersection';
    const viewsDisplayed = isIntersect ? viewsSubset : views;
    const checkboxes = vf.getCheckboxes();
    const checkboxesCount = getFreqTable(viewsDisplayed);
    let count, byType, byId;
    checkboxes.forEach((checkbox) => {
      count = 0;
      byType = checkboxesCount[checkbox.getType()];
      if (byType) {
        byId = byType[checkbox.getId()];
        if (byId) {
          count = byId;
        }
      }
      checkbox.setCount(count);
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
      customStyle,
      local,
      editable;

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
    local = path(v, 'project') === mx.settings.project.id;
    editable = path(v, '_edit') === true;

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

    if (editable && local) {
      components.push('view_editable');
    }
    if (local) {
      components.push('view_local');
    }

    v._components = components;
  });
}
/**
 * Extract checkboxes from various path in given views list and produce frequency tables
 * @param {Array} v Views list
 * @note : expect type, data.collections
 */
export function getFreqTable(views) {
  const path = mx.helpers.path;
  const checkboxes = {
    components: [],
    collections: []
  };

  const stat = {};

  views.forEach(function(v) {
    checkboxes.components = checkboxes.components.concat(
      path(v, '_components', [])
    );
    checkboxes.collections = checkboxes.collections.concat(
      path(v, 'data.collections', [])
    );
  });

  // grouprs
  stat.view_components = getArrayStat({
    arr: checkboxes.components,
    stat: 'frequency'
  });

  stat.view_collections = getArrayStat({
    arr: checkboxes.collections,
    stat: 'frequency'
  });

  return stat;
}

function updateCheckboxesOrder() {
  const vf = this;
  const checkboxes = vf.getCheckboxes();
  const types = ['view_components', 'view_collections'];

  types.forEach((t) => {
    const tt = checkboxes.filter((checkbox) => checkbox.getType() === t);
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

function updateCheckboxes() {
  const vf = this;
  const views = vf.getViews();
  const elContainer = vf.opt.elFilterTags;
  const table = getFreqTable(views);
  const types = Object.keys(table);
  const elCheckboxes = document.createDocumentFragment();
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
    elCheckboxes.appendChild(p);
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
      const checkbox = new Checkbox({
        order: i,
        id: key,
        label_key: key,
        label: label,
        count: tbl[key],
        type: type
      });
      vf.addCheckbox(checkbox, elParent);
      labels.push(label);
    });
  });

  /**
   * Update checkboxes order when checkboxes labels are updated
   */
  Promise.all(labels).then(() => {
    return vf.updateCheckboxesOrder();
  });

  /**
   * Render fragment
   */
  elContainer.appendChild(elCheckboxes);
  /**
   * Helpers
   */

  function elTitleKey(key) {
    return el(
      'span',
      {
        class: 'vf-checkbox-group-title',
        dataset: {lang_key: key}
      },
      getDictItem(key)
    );
  }

  function elGroup() {
    return el('div', {
      class: ['vf-checkbox-group']
    });
  }
  function elEmpty() {
    var promText = getDictItem('view_filter_no_items');
    return el(
      'div',
      {
        class: ['vf-checkbox-empty'],
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
  vf.apply('handler_text');
}

function handleFilterViewIdByCheckbox(event) {
  const vf = this;
  if (!(event instanceof Event)) {
    return;
  }

  const elCheckbox = findCheckbox(event.target);

  if (!elCheckbox || !isCheckbox(elCheckbox)) {
    return;
  }

  event.stopPropagation();
  event.stopImmediatePropagation();

  const cbx = elCheckbox.checkbox;
  vf.updateRuleByCheckbox(cbx);
  vf.apply('handler_checkbox');
}

/**
 * Misc
 */

function isCheckbox(el) {
  return el instanceof Element && el.checkbox instanceof Checkbox;
}

function findCheckbox(el) {
  let found = false;
  while (el && el.parentElement && !found) {
    if (isCheckbox(el)) {
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
