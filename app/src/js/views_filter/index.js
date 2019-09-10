import {
  getArrayDistinct,
  getArrayStat,
  getArrayIntersect
} from '../array_stat/index.js';
import {Toggle} from './components/toggle.js';
import {ListenerStore} from './../listener_store/index.js';
import {path} from './../mx_helper_misc.js';
import {el} from '@fxi/el';
import {updateLanguageElements} from './../mx_helper_language.js';
import './style.css';

let settings = {
  onFilter: (ids) => {
    console.log(ids);
  },
  onUpdateCount: (nTot, nFilter) => {
    console.table({nTot: nTot, nFilter: nFilter});
  },
  operator: 'and',
  elFilterText: document.body,
  elFilterTags: document.body,
  views: []
};

class ViewsFilter {
  constructor(views, opt) {
    let vf = this;
    vf.opt = Object.assign({}, settings, opt);
    vf.lStore = new ListenerStore();
    vf.initStorage(views);
    vf.initListeners();
    vf.update();
  }

  initStorage(views) {
    let vf = this;
    vf._views = views || opt.views;
    vf._tags = [];
    vf._rules = [];
    vf._previousState = [];
  }

  destroy() {
    let vf = this;
    vf.cleanTags();
    vf.lStore.destroy();
  }

  filter() {
    let vf = this;
    let pState = vf._previousState;
    let state = vf.getViewsIdSubset();
    let rules = vf.getRules();
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
    let vf = this;
    let rules = vf.getRules();
    let rule = rules.filter((r) => r.idRule === idRule)[0];
    let ruleExists = typeof rule !== 'undefined';

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
      let pos = rules.indexOf(rule);
      rules.splice(pos, 1);
    }
    vf.filter();
  }

  getViewsSubset() {
    let vf = this;
    let ids = vf.getViewsIdSubset();
    let views = vf.getViews();
    return views.filter((v) => ids.indexOf(v.id) > -1);
  }

  getViewsIdSubset() {
    let vf = this;
    let rules = vf.getRules();
    let isIntersect = vf.opt.operator.toLowerCase() === 'and';
    let viewsBase = isIntersect ? vf.getViewsId() : [];
    let subset = rules.reduce((a, r) => {
      let ids = r.ids;
      if (isIntersect) {
        return getArrayIntersect(a, ids);
      } else {
        return a.concat(ids);
      }
    }, viewsBase);

    return getArrayDistinct(subset);
  }

  setOperator(op) {
    let vf = this;
    vf.opt.operator = op;
    vf.filter();
  }

  update() {
    let vf = this;
    vf.removeRules();
    vf.filter();
    vf.updateViewsComponents();
    vf.updateTags();
    vf.updateCount();
  }

  initListeners() {
    let vf = this;
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

  setTags(tags) {
    this._tags = tags;
  }
  addTag(tag) {
    this._tags.push(tag);
  }
  getTags() {
    return this._tags;
  }
  removeTag(tag) {
    let tags = this._tags;
    let pos = tags.indexOf(tag);
    if (pos > -1) {
      tags.splice(pos, 1);
    }
  }

  updateTags() {
    updateTags.bind(this)();
  }

  cleanTags() {
    let vf = this;
    vf._tags.forEach((t) => {
      t.destroy();
      vf.removeTag(t);
    });
    let elTags = vf.opt.elFilterTags;
    while (elTags.firstElementChild) {
      elTags.removeChild(elTags.firstElementChild);
    }
  }

  updateCount() {
    let vf = this;
    let views = vf.getViews();
    let viewsSubset = vf.getViewsSubset();
    let isIntersect = vf.opt.operator === 'and';
    let viewsDisplayed = isIntersect ? viewsSubset : views;
    let tags = vf.getTags();
    let tagsCount = getFreqTable(viewsDisplayed);
    let count, byType, byId;
    tags.forEach((tag) => {
      count = 0;
      byType = tagsCount[tag.type];
      if (byType) {
        byId = byType[tag.id];
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
    let views = this.getViews();
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
    let components,
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
    components = [];

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
  let tags = {
    components: [],
    classes: [],
    collections: []
  };

  let stat = {};

  views.forEach(function(v) {
    tags.components = tags.components.concat(path(v, '_components'));
    tags.classes = tags.classes.concat(path(v, 'data.classes'));
    tags.collections = tags.collections.concat(path(v, 'data.collections'));
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

function updateTags() {
  let vf = this;
  let views = vf.getViews();
  let elContainer = vf.opt.elFilterTags;
  let table = getFreqTable(views);
  let types = Object.keys(table);
  let elTypes;
  let elThemes;
  let elCollections;
  vf.cleanTags();

  let elTags = document.createDocumentFragment();

  let parts = [
    elTitle('view_components', 'Type of views'),
    (elTypes = elGroup()),
    elTitle('view_classes', 'Themes'),
    (elThemes = elGroup()),
    elTitle('view_collections', 'Collections'),
    (elCollections = elGroup())
  ];

  parts.forEach((p) => {
    elTags.appendChild(p);
  });

  let groups = {
    view_components: elTypes,
    view_classes: elThemes,
    view_collections: elCollections
  };

  let gProm = types.map(function(type) {
    return new Promise((resolve) => {
      let tbl = table[type];
      let keys = Object.keys(tbl);
      let tags = [];

      keys.forEach((key) => {
        let tag = new Toggle({
          id: key,
          label_key: key,
          count: tbl[key],
          type: type
        });
        tags.push(tag);
      });
      resolve(tags);
    })
      .then((tags) => {
        tags.forEach((tag) => {
          vf.addTag(tag);
          groups[tag.type].appendChild(tag.el);
        });
      })
      .then(() => {})
      .catch((err) => {
        console.warn(err);
      });
  });

  return Promise.all(gProm)
    .then(() => {
      elContainer.appendChild(elTags);
    })
    .then(() => {
      return updateLanguageElements({el: elContainer});
    });

  function elTitle(key, txtDefault) {
    return el(
      'span',
      {
        class: 'vf-check-toggle-group-title',
        dataset: {lang_key: key}
      },
      txtDefault
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
  let vf = this;
  let txt = event.target.value;
  let views = vf.getViews();
  txt = txt.toLowerCase();
  let expr = txtToRegex(txt);
  let found = false;
  let text = '';

  let ids = views.reduce((a, v) => {
    text = Object.values(v.data.title)
      .join(' ')
      .toLowerCase();
    found = text.search(expr) > -1;

    if (found) {
      return a.concat(v.id);
    } else {
      return a;
    }
  }, []);

  let enable = txt.length > 0;
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
  let vf = this;
  let elToggle = findToggle(event.target);

  if (!elToggle || !isToggle(elToggle)) {
    return;
  }

  event.stopImmediatePropagation();
  let isMouseOver = event.type === 'mouseover';
  let isMouseOut = event.type === 'mouseout';
  let isClick = event.type === 'click';

  let tgl = elToggle.toggle;
  let views = vf.getViews();
  let type = tgl.getType();
  let id = tgl.getId();
  let state = isClick ? tgl.getState() : isMouseOver && !isMouseOut;
  let ids = [];
  let found = false;
  if (state) {
    ids = views.reduce((a, v) => {
      found = isFound(v, type, id);
      if (found) {
        a.push(v.id);
      }
      return a;
    }, []);
  }
  let mouseEvent = isMouseOver || isMouseOut ? 'mouse' : '';
  let idRule = ['tag', type, id, mouseEvent].join(':');
  vf.updateRule(idRule, ids, state);
}
