import {settings} from './data/settings.js';
import {el} from '@fxi/el';
import {Item} from './components/item.js';
import {Group} from './components/group.js';
import {ContextMenu} from './components/contextMenu.js';
import {ListenerStore} from '../listener_store/index.js';

import './style/nested_list.less';

class NestedList {
  constructor(elRoot, opt) {
    const li = this;
    li._is_busy = false;
    li._is_mode_flat = false;
    li._is_mode_skip_save = false;
    li._is_mode_empty = false;
    li._is_mode_lock = false;
    li._is_mode_frozen = false;
    li._is_mode_animate = false;
    li.listenerStore = new ListenerStore();
    li.setOptions(opt);
    li.setStateOrig(opt.state);
    li.setModeLock(opt.locked);
    li.setId();
    li.elRoot = elRoot;
    li.history = [];
    li.meta = [];
    li.contextMenu = null;
    li.init();
    li.drag = {};
  }
  /**
   * Init/destroy
   */
  init() {
    const li = this;
    li.initCustomDictItem();
    li.initState();
    li.initHistory();
    li.startListening();
  }
  initState() {
    this.setState({render: true});
  }
  initHistory() {
    this.setHistory();
  }
  startListening() {
    const li = this;
    /**
     * Add base listeners
     */
    li.listenerStore.addListener({
      target: li.elRoot,
      bind: li,
      callback: handleContextClick,
      group: 'base',
      type: ['dblclick', 'contextmenu']
    });
    li.listenerStore.addListener({
      target: li.elRoot,
      bind: li,
      callback: handleMouseDown,
      group: 'base',
      type: 'mousedown'
    });
  }
  stopListening() {
    this.listenerStore.removeListenerByGroup('base');
  }
  destroy() {
    const li = this;
    li.listenerStore.destroy();
    li.clearHistory();
    li.clearAllItems();
    return li.fire('destroy');
  }
  /**
   * Get/set options
   */
  getOptions() {
    return this.opt;
  }
  setOptions(opt) {
    const li = this;
    li.opt = Object.assign({}, settings, opt);
    for (let k in li.opt) {
      let item = li.opt[k];
      if (item instanceof Function) {
        li.opt[k] = item.bind(li);
      }
    }
  }
  getOption(id) {
    return this.opt[id];
  }
  setId(id) {
    if (id) {
      this.opt.id = id;
    }
    this.id = this.opt.id;
  }
  setLanguage(l) {
    this.opt.language = l;
    this.refreshState();
  }
  getLanguage() {
    return this.opt.language;
  }
  getChildrenCount(el) {
    el = el || this.elRoot;
    return el.childElementCount;
  }
  getLanguageDefault() {
    return this.opt.languageDefault;
  }
  getDict() {
    return this.opt.dict;
  }

  /**
   * Events callback
   */
  fire(type, data) {
    const li = this;
    const onces = [];
    const results = [];
    const cb = [];

    li.opt.eventsCallback.forEach((e) => {
      if (e.id === type) {
        if (e.action instanceof Function) {
          cb.push(e.action);
        }
        if (e.once) {
          onces.push(e);
        }
      }
    });

    /**
     * Remove registered events that should be used once
     */
    while (onces.length) {
      const e = onces.pop();
      const pos = li.opt.eventsCallback.indexOf(e);
      li.opt.eventsCallback.splice(pos, 1);
    }

    /**
     * Apply callbacks
     */
    while (cb.length) {
      const res = cb[cb.length - 1].bind(li)(data);
      results.push(res);
      cb.pop();
    }
    return results;
  }

  on(id, action, once) {
    const li = this;
    li.opt.eventsCallback.push({
      id: id,
      action: action instanceof Function ? action : () => {},
      once: !!once
    });
  }

  once(id, action) {
    const li = this;
    li.on(id, action, true);
  }

  /**
   * Sorting and ordering
   */
  filterById(ids, opt) {
    opt = Object.assign({}, {flatMode: false}, opt);

    const li = this;
    if (li.isModeEmpty()) {
      return;
    }
    let elTargets = li.getChildrenTarget();
    let clHidden = li.opt.class.itemHidden;
    ids = li.isArray(ids) ? ids : [ids];

    /**
     * Handle options
     */
    li.setModeFlat(opt.flatMode);

    /**
     * Hide / show items
     */
    elTargets.forEach((el) => {
      if (li.isItem(el)) {
        let id = el.id;
        if (id === li.opt.idEmptyItem) {
          return;
        }
        if (ids.indexOf(id) > -1) {
          el.classList.remove(clHidden);
        } else {
          el.classList.add(clHidden);
        }
      }
    });
    li.fire('filter_end', ids);
  }

  getStateForSorting(elTarget, opt) {
    const li = this;
    const def = {mode: 'text', ids: [], recursive: true};
    opt = Object.assign({}, def, opt);
    let elGroup = li.isGroup(elTarget) ? elTarget : li.getGroup(elTarget);
    let els = li.getChildrenTarget(elGroup, true);
    let data = [];
    /**
     * Get values to sort on
     */
    els.forEach((el) => {
      let item = {
        id: el.id,
        el: el,
        value: 0,
        isGroup: li.isGroup(el)
      };
      if (item.isGroup && opt.recursive) {
        item.children = li.getStateForSorting(el, opt);
      }
      if (opt.mode === 'text') {
        item.value = item.isGroup ? li.getGroupTitle(el) : li.getItemText(el);
        item.value = item.value.toLowerCase().trim();
      }
      if (opt.mode === 'date') {
        item.value = item.isGroup ? li.getGroupDate(el) : li.getItemDate(el);
        if (Number.isFinite(item.value * 1)) {
          item.value = item.value * 1;
        }
        item.value = new Date(item.value || 0);
      }
      if (opt.mode === 'ids') {
        item.value = opt.ids.indexOf(item.id);
      }
      data.push(item);
    });

    return data;
  }

  /**
   * Sort items
   * @param {Element} elTarget Target group element
   * @param {Object} opt Options
   * @param {Boolean} opt.asc Ascendent
   * @param {String} opt.mode : text, date, ids
   * @param {Array} opt.ids : Array of ids
   * @param {Boolean} opt.recursive Sort nested group
   * @param {Boolean} opt.check Check if it's sorted
   * @return {Boolean} sorted
   */
  sortGroup(elTarget, opt) {
    const li = this;
    const def = {asc: true, mode: 'text', ids: [], recursive: true};
    opt = Object.assign({}, def, opt);
    const data = li.getStateForSorting(elTarget, opt);

    /**
     * Check order only
     */

    if (opt.check) {
      const sorted = isSorted(data);
      li.fire('state_order_check', sorted);
      return sorted;
    }
    /**
     * Sort
     */
    sort(data);
    /**
     * Move targets
     */
    li.setModeAnimate(false);
    move(data);
    li.setModeAnimate(true);
    li.fire('state_order');

    /**
     * Helpers
     */
    function move(arr) {
      let elPrevious;
      for (let item of arr) {
        if (item.children) {
          move(item.children);
        }
        if (!elPrevious) {
          li.moveTargetTop(item.el);
        } else {
          li.moveTargetAfter(item.el, elPrevious);
        }
        elPrevious = item.el;
      }
    }
    function isSorted(arr) {
      let res = true;
      let previous;
      for (let item of arr) {
        if (item.children) {
          res = res && isSorted(item.children);
        }
        if (previous) {
          if (opt.asc) {
            res = res && item.value > previous.value;
          } else {
            res = res && item.value <= previous.value;
          }
        }
          previous = item;
      }
      return res;
    }
    function sort(arr) {
      arr.sort((a, b) => {
        if (a.children) {
          sort(a.children);
        }
        if (lt(a.value, b.value)) {
          return -1;
        }
        if (gt(a.value, b.value)) {
          return 1;
        }
        return 0;
      });
      return arr;
    }
    function gt(a, b) {
      return opt.asc ? a > b : a < b;
    }
    function lt(a, b) {
      return opt.asc ? a < b : a > b;
    }
  }

  /**
   * Target management
   */
  getTarget(el) {
    const li = this;
    if (!el) {
      return;
    }
    if (typeof el === 'string') {
      el = li.elRoot.querySelector(`#${el}`);
    }
    if (li.isTarget(el)) {
      return el;
    }
    while (el && el.parentNode && !li.isTarget(el)) {
      el = el.parentNode;
    }
    return el || li.elRoot;
  }
  getChildrenTarget(el, direct) {
    const li = this;
    el = el || li.elRoot;
    if (!li.isGroup(el)) {
      el = li.getGroup(el);
    }
    let pref = direct ? ':scope > ' : '';
    let els = el.querySelectorAll(
      `${pref}.${li.opt.class.draggable}, ${pref}.${li.opt.class.group}`
    );

    return els;
  }
  hasChildrenTarget(el, direct) {
    let els = this.getChildrenTarget(el, direct);
    return els.length > 0;
  }
  getFirstTarget(el, direct) {
    let els = this.getChildrenTarget(el, direct);
    return els[0];
  }
  getLastTarget(el, direct) {
    let els = this.getChildrenTarget(el, direct);
    return els[els.length - 1];
  }
  isHidden(el) {
    let li = this;
    let clHidden = li.opt.class.itemHidden;
    return li.isElement(el) && el.classList.contains(clHidden);
  }
  getNextTarget(el) {
    let li = this;
    while (li.isHidden(el.nextElementSibling)) {
      el = el.nextElementSibling;
    }
    return el.nextElementSibling;
  }
  getPreviousTarget(el) {
    let li = this;
    while (li.isHidden(el.previousElementSibling)) {
      el = el.previousElementSibling;
    }
    return el.previousElementSibling;
  }
  getItemContent(el) {
    const li = this;
    if (li.isItem(el)) {
      return el.querySelector('.' + li.opt.class.itemContent);
    }
  }
  getItemText(el) {
    const li = this;
    return li.fire('get_item_text_by_id', el.id)[0] || el.innerText;
  }
  getItemDate(el) {
    const li = this;
    return li.fire('get_item_date_by_id', el.id)[0] || Date.now();
  }
  getGroup(el) {
    const li = this;
    while (el && (el = el.parentNode) && !li.isGroup(el)) {
      el = el.parentNode;
    }
    return el || li.elRoot;
  }
  getGroupById(id) {
    const li = this;
    return li.getItemById(id);
  }
  getItemById(id) {
    const li = this;
    return li.elRoot.querySelector(`#${id}`);
  }
  getGroupId(el) {
    const li = this;
    let elGrp = li.getGroup(el);
    if (elGrp === li.elRoot) {
      return 'root';
    } else {
      return elGrp.id;
    }
  }
  getGroupTitleObject(el) {
    const li = this;
    let titleObject = {};
    if (li.isGroup(el)) {
      titleObject = JSON.parse(el.dataset.li_title || '{}');
      titleObject = li.validateGroupTitleObject(titleObject);
    }
    return titleObject;
  }
  getGroupTitle(el) {
    const li = this;
    if (li.isGroup(el)) {
      return el.querySelector('.' + li.opt.class.groupTitle).innerText;
    }
  }
  getGroupDate(el) {
    const li = this;
    if (li.isGroup(el)) {
      return el.dataset.li_date;
    }
  }
  getGroupLabel(el) {
    const li = this;
    if (li.isGroup(el)) {
      return el.querySelector('.' + li.opt.class.groupLabel);
    }
  }
  getGroupColor(el) {
    const li = this;
    if (li.isGroup(el)) {
      return el.dataset.li_color || this.opt.colorDefault;
    }
  }
  moveTargetTop(el) {
    const li = this;
    el = li.getTarget(el);
    let elGroup = li.getGroup(el);
    let elFirst = li.getFirstTarget(elGroup, true);
    if (li.isTarget(elFirst)) {
      li.animateMove([el, elFirst], () => {
        elGroup.insertBefore(el, elFirst);
      });
    }
  }
  moveTargetBefore(el, elBefore) {
    const li = this;
    el = li.getTarget(el);
    elBefore = li.getTarget(elBefore) || li.getPreviousTarget(el);
    if (li.isTarget(elBefore)) {
      let elGroup = li.getGroup(el);
      li.animateMove([el, elBefore], () => {
        elGroup.insertBefore(el, elBefore);
      });
    }
  }
  moveTargetUp(el) {
    const li = this;
    el = li.getTarget(el);
    let elPrevious = li.getPreviousTarget(el);
    li.moveTargetBefore(el, elPrevious);
  }
  moveTargetAfter(el, elAfter) {
    const li = this;
    el = li.getTarget(el);
    elAfter = li.getTarget(elAfter) || li.getNextTarget(el);
    if (li.isTarget(elAfter)) {
      let elGroup = li.getGroup(el);
      let elAfterNext = li.getNextTarget(elAfter);
      if (elAfterNext) {
        li.animateMove([el, elAfterNext], () => {
          elGroup.insertBefore(el, elAfterNext);
        });
      } else {
        li.animateMove([el], () => {
          elGroup.appendChild(el);
        });
      }
    }
  }
  moveTargetDown(el) {
    const li = this;
    el = li.getTarget(el);
    let elNext = li.getNextTarget(el);
    li.moveTargetAfter(el, elNext);
  }
  moveTargetBottom(el) {
    const li = this;
    el = li.getTarget(el);
    let elGroup = li.getGroup(el);
    let elLast = li.getLastTarget(elGroup);
    if (li.isGroup(elGroup)) {
      li.moveTargetAfter(el, elLast);
    }
  }

  groupCollapse(el, collapse) {
    const li = this;
    collapse = collapse === true;
    if (li.isGroup(el)) {
      if (collapse) {
        el.classList.add(li.opt.class.groupCollapsed);
      } else {
        el.classList.remove(li.opt.class.groupCollapsed);
      }
    }
  }
  groupToggle(el) {
    const li = this;
    if (li.isGroup(el)) {
      let isCollapsed = li.isGroupCollapsed(el);
      li.groupCollapse(el, !isCollapsed);
    }
  }
  isGroupCollapsed(el) {
    return el.classList.contains(this.opt.class.groupCollapsed);
  }
  isGroupVisible(el) {
    const li = this;
    let isVisible = !el.classList.contains(li.opt.class.groupInvisible);
    return isVisible;
  }
  setGroupVisibility(el, visible) {
    const li = this;
    visible = visible === true;
    if (li.isGroup(el)) {
      if (visible) {
        el.classList.remove(li.opt.class.groupInvisible);
      } else {
        el.classList.add(li.opt.class.groupInvisible);
      }
    }
  }

  setGroupLabel(el, label) {
    const li = this;
    let elGroup = li.isGroup(el) ? el : li.getGroup(el);
    if (!elGroup) {
      return;
    }
    let elGroupLabel = li.getGroupLabel(elGroup);
    if (li.isElement(label)) {
      li.removeContent(elGroupLabel);
      elGroupLabel.appendChild(label);
    } else {
      elGroupLabel.innerText = label || '';
    }
  }
  setModeSkipSave(skip) {
    this._is_mode_skip_save = skip === true;
  }
  setModeAnimate(enable) {
    this._is_mode_animate = enable === true;
  }
  isModeAnimate() {
    return this._is_mode_animate === true;
  }
  isModeSkipSave() {
    return this._is_mode_skip_save === true;
  }

  setModeLock(enable) {
    this._is_mode_lock = !!enable;
  }
  isModeLock() {
    return !!this._is_mode_lock;
  }

  setModeFrozenForce(frozen) {
    this._is_mode_frozen = frozen === true;
  }

  isModeFrozen() {
    const li = this;
    return (
      li.isModeFlat() ||
      li.isModeSkipSave() ||
      li.isModeLock() ||
      this._is_mode_frozen === true
    );
  }

  setModeFlat(enable, opt) {
    opt = opt || {};
    const li = this;
    enable = enable === true;
    let el = li.elRoot;
    let els = li.getChildrenTarget(el);
    els.forEach((el) => {
      if (li.isGroup(el)) {
        li.setGroupVisibility(el, !enable);
      }
    });
    li._is_mode_flat = enable;
  }
  isModeFlat() {
    return this._is_mode_flat;
  }
  setGroupTitle(el, title) {
    const li = this;
    let lang = li.getLanguage();
    let isGroup = li.isGroup(el);
    if (!isGroup) {
      return;
    }
    let elTitle = el.querySelector('.' + li.opt.class.groupTitle);
    let titleObject = li.getGroupTitleObject(el);
    let oldTitle = titleObject[lang];
    title = title || oldTitle || li.d('group_new_title');
    titleObject[lang] = title;
    elTitle.innerText = title;
    el.dataset.li_title = JSON.stringify(titleObject);
  }
  setGroupColor(el, color) {
    const li = this;
    let isGroup = li.isGroup(el);
    if (!isGroup) {
      return;
    }
    el.dataset.li_color = color;
    el.style = `--group_color:${color}`;
  }

  /**
   *
   */

  /**
   * State management
   */
  getState(opt) {
    const li = this;
    opt = opt || {};
    let out = [];
    let elDrags = li.getChildrenTarget(li.elRoot);
    elDrags.forEach((el) => {
      let isGroup = li.isGroup(el);
      let isItem = li.isItem(el);
      let s = {
        id: el.id,
        group: li.getGroupId(el),
        type: isGroup ? 'group' : 'item'
      };
      if (isGroup) {
        s.title = JSON.parse(el.dataset.li_title) || {en: el.id};
        s.color = el.dataset.li_color || li.opt.colorDefault;
        s.date = el.dataset.li_date || Date.now();
        s.collapsed = li.isGroupCollapsed(el);
        s.invisible = !li.isGroupVisible(el);
      }
      if (isItem) {
        let elContent = li.getItemContent(el);
        if (opt.keepItemContent) {
          s.content = elContent;
        }
      }
      out.push(s);
    });
    return out;
  }
  getStateHash(i) {
    let hash = i
      .map((s) =>
        [s.id, s.group, s.type, s.title ? JSON.stringify(s.title) : ''].join(
          ':'
        )
      )
      .join(':');
    return hash;
  }
  areStateDifferent(a, b) {
    return this.getStateHash(a) !== this.getStateHash(b);
  }
  getPreviousState() {
    const li = this;
    if (li.hasHistory()) {
      return li.history[li.history.length - 1];
    }
  }

  saveStateStorage() {
    const li = this;
    let state = li.getState();
    let history = li.getHistory();
    if (li.isModeFrozen()) {
      return;
    }
    li.setStateStored(state);
    li.setHistoryStored(history);
  }
  setStateStored(state) {
    const li = this;
    if (li.isModeFrozen()) {
      return;
    }
    let key = li.getStorageKey('state');
    if (state && window.localStorage) {
      window.localStorage.setItem(key, JSON.stringify(state));
      li.fire('state_save_local', state);
    }
  }

  /**
   * Metadata management
   */
  setItemMeta(key, value) {
    return {key, value};
  }

  /**
   * History management
   */
  setHistoryStored(history) {
    const li = this;
    let key = li.getStorageKey('history');
    let isValid = li.isArray(history);
    if (isValid && window.localStorage) {
      let historyClone = li.cloneObject(history);
      historyClone.forEach((state) => {
        state.forEach((s) => {
          s.content = null;
          s.render = true;
        });
      });
      window.localStorage.setItem(key, JSON.stringify(historyClone));
    }
  }
  getStorageKey(type) {
    return this.id + '_' + this.opt.localStorageKeys[type || 'state'];
  }
  getHistory() {
    return this.history;
  }
  setHistory(history) {
    this.history = this.isArray(history) ? history : this.getHistoryStored();
  }
  getHistoryStored() {
    const li = this;
    let key = li.getStorageKey('history');
    let history = [];
    if (window.localStorage) {
      let historyStored = JSON.parse(window.localStorage.getItem(key));
      if (historyStored) {
        history = historyStored;
      }
    }
    return history;
  }
  getStateStored() {
    const li = this;
    let key = li.getStorageKey('state');
    if (window.localStorage) {
      return JSON.parse(window.localStorage.getItem(key));
    }
    return [];
  }
  addUndoStep() {
    const li = this;
    let hasDiff = true;
    let state = li.getState({keepItemContent: true});
    let lastState;
    if (li.hasHistory()) {
      lastState = li.getPreviousState();
      hasDiff = li.areStateDifferent(lastState, state);
    }
    if (hasDiff) {
      li.history.push(state);
    }
    if (li.history.length > li.opt.maxHistoryLength) {
      li.history.splice(0, 1);
    }
  }
  clearHistory() {
    this.history.length = 0;
    this.setHistoryStored([]);
  }
  clearMeta() {
    this.meta.length = 0;
  }
  hasHistory() {
    return this.history.length > 0;
  }
  undo() {
    const li = this;
    li.clearAllItems();
    let last = li.history.pop();
    li.setState({
      render: false,
      state: last,
      useStateStored: false,
      debug: true
    });
  }

  /**
   * Empty mode
   */
  setModeEmpty(enable) {
    const li = this;
    let idEmpty = li.opt.idEmptyItem;
    let ignore = (enable && li.isModeEmpty()) || (!enable && !li.isModeEmpty());
    let nItems = li.getChildrenCount();
    let elLabel = el('div', li.opt.emptyLabel);

    if (ignore) {
      return;
    }

    if (enable) {
      if (nItems > 0) {
        li.clearAllItems();
      }

      li.addItem({
        id: idEmpty,
        type: 'item',
        el: elLabel,
        empty: true
      });
    } else {
      li.removeItemById(idEmpty);
    }

    li._is_mode_empty = !!enable;
  }
  isModeEmpty() {
    return !!this._is_mode_empty;
  }

  /**
   * State management
   */
  refreshState() {
    const li = this;
    let state = li.getState({keepItemContent: true});
    li.setState({render: false, state: state, useStateStored: false});
  }
  resetState() {
    const li = this;
    let state = li.getStateOrig();
    if (li.isModeEmpty()) {
      return;
    }
    li.addUndoStep();
    li.clearAllItems();
    li.setStateStored([]);
    li.setState({render: true, state: state, useStateStored: false});
    li.fire('state_reset', state);
  }
  setState(opt) {
    const li = this;
    li.setModeAnimate(false);
    li.clearAllItems();
    opt = Object.assign({}, li.opt, opt);
    let stateOrig = opt.state || li.getStateOrig();
    let stateStored;
    if (opt.useStateStored) {
      stateStored = li.getStateStored();
    }
    /**
     * Sanitize
     */
    let state = li.fire('state_sanitize', {
      orig: stateOrig,
      stored: stateStored
    })[0];

    /*
     * If the state is empty,
     * add empty label
     */
    let emptyState = state.length === 0;
    if (emptyState) {
      /*
       * Render empty label
       */
      li.setModeEmpty(true);
    } else {
      /*
       * Render state item
       */
      state.forEach((s) => {
        if (s.type === 'group') {
          li.addGroup(s);
        } else {
          s.render = opt.render;
          s.initState = true;
          li.addItem(s);
        }
      });
    }
    li.fire('state_change', state);
    li.setModeAnimate(true);
  }
  getStateOrig() {
    return this._state_orig || [];
  }
  setStateOrig(state) {
    this._state_orig = this.cloneObject(state || this.getState() || []);
  }
  clearAllItems() {
    const li = this;
    let els = li.getChildrenTarget(li.elRoot);
    els.forEach((el) => {
      li.removeElement(el);
    });
  }

  updateItem(attr) {
    const li = this;
    var el = li.getItemById(attr.id);
    var elContent = li.getItemContent(el, li.opt.class.itemContent);
    li.fire('render_item_content', {el: elContent, data: attr});
  }
  addItem(attr) {
    const li = this;

    attr.render = attr.render || !attr.content || false;
    let isGroup = li.isGroup(attr.group);
    let isLocked = li.isModeLock();
    let elGroupParent = isGroup
      ? attr.group
      : li.getGroupById(attr.group) || li.elRoot;

    let item = new Item(attr, li);
    let elItem = item.el;
    let elContent = item.elContent;
    let isEmptyItem = !!attr.empty;
    let isModeEmpty = li.isModeEmpty();
    if (isLocked && !isEmptyItem) {
      return;
    }

    if (!isEmptyItem && isModeEmpty) {
      li.setModeEmpty(false);
    }

    elGroupParent.appendChild(elItem);

    if (attr.render) {
      li.fire('render_item_content', {el: elContent, data: attr});
    }
    if (attr.moveTop) {
      li.moveTargetTop(elItem);
    }

    return elItem;
  }

  addGroup(attr) {
    const li = this;
    let isGroup = li.isGroup(attr.group);
    let hasContent = li.isTarget(attr.content);
    let targetAfter = null;
    if (hasContent) {
      targetAfter = li.getNextTarget(attr.content);
    }
    var elGroupParent = isGroup
      ? attr.group
      : li.getGroupById(attr.group) || li.elRoot;
    let group = new Group(attr, li);
    let elGroup = group.el;
    if (targetAfter) {
      targetAfter.parentElement.insertBefore(elGroup, targetAfter);
    } else {
      elGroupParent.appendChild(elGroup);
    }
    return elGroup;
  }

  removeItemById(id) {
    const li = this;
    let elItem = li.elRoot.querySelector('#' + id);
    li.removeElement(elItem);
  }

  removeGroupById(id) {
    const li = this;
    let elGroup = li.elRoot.querySelector('#' + id);
    li.removeGroup(elGroup);
  }
  removeGroup(elGroup) {
    const li = this;
    let isValid = li.isGroup(elGroup) && elGroup !== li.elRoot;
    if (isValid) {
      let elParent = li.getGroup(elGroup);
      let els = li.getChildrenTarget(elGroup, true);
      els.forEach((el) => {
        li.animateMove([el, elGroup], () => {
          elParent.insertBefore(el, elGroup);
        });
      });
      li.removeElement(elGroup);
    }
  }
  /**
   * Helpers
   */
  setDragInit(elTarget) {
    const li = this;
    li.drag.el = elTarget;
    li.drag.el.setAttribute('draggable', true);
  }
  setDragStart() {
    const li = this;
    const hasDrag = li.isElement(li.drag.el);
    if (hasDrag) {
      /**
       * Set timeout to avoid 'dragend' being fired
       * immediatly after the upper view stack being collapsed.
       *
       * -------------------------------
       *  /---
       *  |    not collapsed
       *  \---
       *  /---
       *  |
       *  \--- * <-
       * --------------------------------
       *  /--- collapsed
       *  \---
       *  /---
       *  |
       *  \---
       *
       *      * <- pointer is immediatly out = draggend fired
       *
       */
      setTimeout(() => {
        if (li.drag.el) {
          /**
           * The drag element could already be removed if
           * dragend fired before the timeout
           */
          li.drag.el.classList.add(li.opt.class.dragged);
          document.body.classList.add(li.opt.class.globalDragging);
        }
      }, 200);
    }
  }
  setDragClean() {
    const li = this;
    const hasDrag = li.isElement(li.drag.el);

    if (hasDrag) {
      li.drag.el.classList.remove(li.opt.class.dragged);
      li.drag.el.setAttribute('draggable', false);
      li.drag = {};
    }
    document.body.classList.remove(li.opt.class.globalDragging);
    li.listenerStore.removeListenerByGroup('item_dragging');
  }

  setBusy(busy) {
    this._is_busy = busy === true;
  }
  isBusy() {
    return this._is_busy === true;
  }

  cloneObject(obj) {
    return JSON.parse(JSON.stringify(obj));
  }
  el(...opt) {
    return el(...opt);
  }
  log(...msg) {
    if (this.opt.mode.indexOf('debug') > -1) {
      console.log(...msg);
    }
  }
  removeElement(el) {
    const li = this;
    if (el instanceof Element) {
      if (el.remove) {
        el.remove();
      } else if (el) {
        el.parentElement.removeChild(el);
      }
    }
    let isEmpty = li.getChildrenCount() === 0;
    if (isEmpty) {
      li.setModeEmpty(true);
    }
  }
  removeContent(el) {
    while (el.firstElementChild) {
      el.removeChild(el.firstElementChild);
    }
  }
  d(id) {
    // translate based on id
    const li = this;
    let lang = li.getLanguage();
    let langDef = li.getLanguageDefault();
    let dict = li.getDict();
    let item = dict.find((t) => t.id === id) || {};
    let txt = item[lang] || item[langDef];
    let skipCap = item.capitalize === false;
    if (txt) {
      txt = li.parseTemplate(txt, dict);
      if (!skipCap) {
        txt = li.capitalizeFirst(txt);
      }
      return txt;
    }

    return id;
  }
  updateDictItems(items) {
    const li = this;
    let dict = li.getDict();
    items = li.isArray(items) ? items : [items];
    let keys = items.map((i) => i.id);
    dict.forEach((d, i) => {
      let pos = keys.indexOf(d.id);
      if (pos > -1) {
        dict[i] = items[pos];
      }
    });
  }
  initCustomDictItem() {
    let items = this.opt.customDictItems;
    if (items) {
      this.updateDictItems(items);
    }
  }

  parseTemplate(template, dict) {
    const li = this;
    let lang = li.getLanguage();
    return template.replace(/{{([^{}]+)}}/g, (m, k) => {
      let item = dict.filter((d) => d.id === k)[0];
      if (li.isObject(item)) {
        return item[lang] || key;
      }
      return key;
    });
  }
  capitalizeFirst(txt) {
    return txt.replace(/^\w/, (m) => m.toUpperCase());
  }

  asBoolean(item) {
    return typeof item !== 'undefined' && (item === 'true' || item === true);
  }
  isElement(el) {
    return el && el instanceof Element;
  }
  isHTMLCollection(el) {
    return el && el instanceof HTMLCollection;
  }
  isFunction(item) {
    return item && item instanceof Function;
  }
  randomId(prefix) {
    const li = this;
    return (
      (prefix || li.opt.prefix) +
      '_' +
      Math.random()
        .toString(32)
        .substr(2, 9)
    );
  }
  isArray(item) {
    return !!item && Array.isArray(item);
  }
  isObject(item) {
    return !!item && typeof item === 'object' && !Array.isArray(item);
  }
  isDraggable(el) {
    return (
      this.isElement(el) && el.classList.contains(this.opt.class.draggable)
    );
  }
  isDragHandle(el) {
    const li = this;
    const isValidHandle =
      li.isElement(el) &&
      (el.classList.contains(li.opt.class.dragHandle) ||
        el.classList.contains(li.opt.classDragHandle));
    return isValidHandle;
  }
  isItem(el) {
    return this.isElement(el) && el.classList.contains(this.opt.class.item);
  }
  isRoot(el) {
    return el === this.elRoot;
  }
  isGroup(el) {
    return (
      this.isElement(el) &&
      (el.classList.contains(this.opt.class.group) || this.isRoot(el))
    );
  }
  isTarget(el) {
    return this.isDraggable(el) || this.isGroup(el);
  }
  isChildOf(elTest, elOther) {
    return elOther.contains(elTest);
  }
  isParentOf(elTest, elOther) {
    return elTest.contains(elOther);
  }
  isSiblingOf(elTest, elOther) {
    return (
      elTest.nextElementSibling === elOther ||
      elTest.previousElementSibling === elOther
    );
  }
  getDistanceFromTo(elTest, elOther) {
    const li = this;
    if (!li.isElement(elTest) || !li.isElement(elOther)) {
      return {
        dY: Infinity,
        dX: Infinity
      };
    }
    let rA = elTest.getBoundingClientRect();
    let rB = elOther.getBoundingClientRect();
    return {
      dY: Math.abs(rA.top + rA.height / 2 - (rB.top + rB.height / 2)),
      dX: Math.abs(rA.left + rA.width / 2 - (rB.left + rB.width / 2))
    };
  }
  isSameElement(elTarget, elDrop) {
    return elTarget === elDrop;
  }
  validateColor(color) {
    return /^#[0-9A-F]{6}$/i.test(color) ? color : this.opt.colorDefault;
  }
  validateGroupTitleObject(title) {
    const li = this;
    title = li.isObject(title) ? title : {};
    let lang = li.getLanguage();
    let langDefault = li.getLanguageDefault();
    let hasTitle = title[lang];
    let hasTitleDefault = title[langDefault];
    if (!hasTitleDefault) {
      if (!hasTitle) {
        title[langDefault] = li.d('group_new_title');
      } else {
        title[langDefault] = title[lang];
      }
    }
    return title;
  }
  /**
   * Simple animation to move smoothly list item
   * @param {Element|Array} elements to move
   * @param {Function} Callback that move elements
   * @return {Promise|Boolean} moved
   */
  animateMove(elsMove, cbMove) {
    const li = this;
    const enable = li.isModeAnimate();
    const duration = li.getOption('animeDuration');
    const maxDist = li.getOption('animeMaxDist');
    const relaxDuration = li.getOption('animeDragRelaxDuration');
    const els = elsMove instanceof Array ? elsMove : [elsMove];
    if (els.length === 0) {
      return;
    }
    const done = [];
    if (enable) {
      li.setBusy(true);
      savePos();
    }
    move();
    if (enable) {
      start();
    }
    function savePos() {
      els.forEach((e, i) => {
        if (li.isElement(e)) {
          let rect = e.getBoundingClientRect();
          e.dataset.from_y = rect.top;
          e.dataset.from_x = rect.left;
        } else {
          els.splice(i, 1);
        }
      });
    }
    function move() {
      cbMove();
    }
    function start() {
      els.forEach((elItem) => {
        elItem.style.transition = 'transform 0ms';
        set(elItem);
      });
    }
    function set(elItem) {
      let rect = elItem.getBoundingClientRect();
      elItem.dataset.to_y = rect.top;
      elItem.dataset.to_x = rect.left;
      elItem.dataset.dist_y = elItem.dataset.to_y - elItem.dataset.from_y;
      elItem.dataset.dist_x = elItem.dataset.to_x - elItem.dataset.from_x;
      elItem.style.transform = `translateY( ${-elItem.dataset
        .dist_y}px ) translateX( ${-elItem.dataset.dist_x}px )`;
      setTimeout(() => {
        anim(elItem);
      }, 0);
    }
    function anim(elItem) {
      var durationFinal = elItem.dataset.dist > maxDist ? 0 : duration;
      elItem.style.transition = 'transform ' + durationFinal + 'ms ease-in-out';
      elItem.style.transform = 'translateY(0px)';
      setTimeout(() => {
        clean(elItem);
      }, durationFinal);
    }
    function clean(elItem) {
      elItem.style.transition = '';
      elItem.style.transform = '';
      done.push(elItem);
      end();
    }
    function end() {
      if (done.length === els.length) {
        setTimeout(() => {
          li.fire('state_order');
          li.setBusy(false);
        }, relaxDuration);
      }
    }
  }

  isDevMode() {
    return window.innerWidth < window.outerWidth;
  }
}

export {NestedList};

/**
 * Click in context menu event listener
 */
function handleContextClick(evt) {
  const li = this;
  evt.preventDefault();
  if (li.contextMenu instanceof ContextMenu) {
    li.contextMenu.destroy();
  }
  if (li.isModeEmpty()) {
    return;
  }
  evt.stopPropagation();
  evt.stopImmediatePropagation();
  li.contextMenu = new ContextMenu(evt, li);
}

/**
 * Mouse click
 */
function handleMouseClick(evt) {
  const li = this;
  const elTarget = li.getTarget(evt.target);
  const idAction = elTarget.dataset.li_id_action;
  const idType = elTarget.dataset.li_event_type;
  const isValid =
    !li.drag.el &&
    idType === 'click' &&
    idAction &&
    idAction === 'li_group_toggle' &&
    li.isTarget(elTarget);
  if (isValid) {
    evt.stopPropagation();
    evt.stopImmediatePropagation();
    li.groupToggle(elTarget, true);
  }
}
/**
 * Mouse down
 */
function handleMouseDown(evt) {
  const li = this;
  const elTarget = li.getTarget(evt.target);
  const isHandle = li.isDragHandle(evt.target);
  /**
   * Case when drag was not properly finished
   */
  li.setDragClean();

  if (!isHandle) {
    /**
     * It's not a valid handle, add listener
     * mouseup to continue to a full 'click'
     */
    li.listenerStore.addListenerOnce({
      target: evt.target,
      bind: li,
      callback: handleMouseClick,
      group: 'base',
      type: 'mouseup'
    });
  } else {
    /**
     * Prepare the UI for global change : style, cursore,
     * temporary register of drag item...
     */

    li.setDragInit(elTarget);

    /**
     * Draggable
     */
    li.listenerStore.addListenerOnce({
      target: elTarget,
      bind: li,
      callback: handleDragStart,
      group: 'item_dragging',
      type: ['dragstart']
    });

    li.listenerStore.addListenerOnce({
      target: window,
      bind: li,
      callback: handleDragEnd,
      group: 'item_dragging',
      type: ['dragend']
    });

    /*
     * Drop zones
     */
    li.listenerStore.addListener({
      target: li.elRoot,
      bind: li,
      callback: handleDragEnter,
      group: 'item_dragging',
      type: ['dragenter']
    });

    li.listenerStore.addListener({
      target: li.elRoot,
      bind: li,
      group: 'item_dragging',
      callback: handleDragOver,
      throttle: true,
      throttleTime: 200,
      type: ['dragover']
    });

    li.listenerStore.addListener({
      target: elTarget,
      bind: li,
      callback: handleDrop,
      group: 'item_dragging',
      type: ['drop']
    });
  }
}

/**
 * Start sort event listener
 */
function handleDragStart(evt) {
  const li = this;

  li.fire('sort_start', evt);
  /**
   * Build drag image, set ui dragging mode and set
   * datatransfer data
   */
  const elDragImage = li.fire('set_drag_image', li.drag.el)[0];
  const dragText = li.fire('set_drag_text', li.drag.el)[0];
  const rectImage = elDragImage.getBoundingClientRect();
  const dragOffsetTop = evt.clientY - rectImage.top;
  const dragOffsetLeft = evt.clientX - rectImage.left;

  li.setDragStart();
  li.addUndoStep();
  evt.dataTransfer.clearData();
  evt.dataTransfer.setDragImage(elDragImage, dragOffsetLeft, dragOffsetTop);
  /**
   * NOTE: text/plain make chrome very, very slow.
   */
  evt.dataTransfer.setData('application/json', dragText || li.drag.el.id);
  evt.dataTransfer.effectAllowed = 'all';
  li.elNext = li.drag.el.nextSibling;
}
/**
 * Handle drag enter
 */
function handleDragEnter(evt) {
  evt.dataTransfer.dropEffect = 'move';
  evt.preventDefault();
}

/**
 * Handle drop
 */
function handleDrop(evt) {
  const li = this;
  li.setDragClean();
  evt.preventDefault();
}

/**
 * Drag end event listener
 */
function handleDragEnd(evt) {
  const li = this;
  const elNoImg = el('img');
  evt.dataTransfer.setDragImage(elNoImg, 0, 0);

  if (!li.isModeEmpty()) {
    li.fire('sort_end', evt);
    if (li.elNext !== li.drag.el.nextSibling) {
      li.fire('sort_done', evt);
    }
    li.setDragClean();
  }
}

/**
 * Over event listener
 */
function handleDragOver(evt) {
  evt.preventDefault();
  const li = this;
  const elTarget = evt.target;
  const isGroup = li.isGroup(elTarget);
  const isGroupCollapsed = isGroup && li.isGroupCollapsed(elTarget);
  const elDrag = li.drag.el;
  const hasTarget = li.isTarget(elTarget);
  const hasDrag = li.isDraggable(elDrag);
  const isItself = hasDrag && hasTarget && li.isSameElement(elDrag, elTarget);
  const isParent = hasDrag && hasTarget && li.isParentOf(elDrag, elTarget);
  if (!hasTarget || isItself || isParent) {
    return;
  }
  /**
   * Stop propagation, we have to resolve this
   */
  evt.stopPropagation();
  evt.stopImmediatePropagation();

  let elGroup = null;
  let elInsert = null;
  let elFirst = null;
  let isValid = false;
  let groupHasItems = false;
  /**
   *    Position above target
   *
   *   /---------\
   *   |         | <- insert before
   *   |---------|
   *   |         | <- insert after
   *   \---------/
   */
  let rDest = elTarget.getBoundingClientRect();
  let insertAfter = evt.clientY > rDest.top + rDest.height / 2;
  let atGroupEdgeBottom =
    isGroup && evt.clientY > rDest.bottom - rDest.height / 10;
  let atGroupEdgeTop = isGroup && evt.clientY < rDest.top + rDest.height / 10;

  try {
    /**
     * Insert in list : if empty or if insert after, appendChild,
     * else insert before first
     */
    if (!isGroup || isGroupCollapsed || atGroupEdgeTop || atGroupEdgeBottom) {
      elGroup = li.getGroup(elTarget);
      elInsert =
        insertAfter || atGroupEdgeBottom
          ? li.getNextTarget(elTarget)
          : elTarget;
      isValid =
        li.isElement(elInsert) &&
        !li.isSameElement(elInsert, elDrag) &&
        !li.isSameElement(elInsert, elGroup);

      if (isValid) {
        /**
         * Move
         */
        li.animateMove([elDrag, elTarget], () => {
          elGroup.insertBefore(elDrag, elInsert);
        });
      }
      return;
    }
    /**
     * Insert in group : if empty or if insert after, appendChild,
     * else insert before first
     */
    if (isGroup) {
      elGroup = elTarget;
      groupHasItems = li.hasChildrenTarget(elGroup);
      if (!groupHasItems || insertAfter) {
        /**
         * Move
         */
        li.animateMove([elDrag], () => {
          elGroup.appendChild(elDrag);
        });
      } else {
        elFirst = li.getFirstTarget(elGroup);
        isValid =
          !li.isSameElement(elFirst, elDrag) &&
          !li.isSameElement(elFirst, elGroup);
        if (isValid) {
          /**
           * Move
           */
          li.animateMove([elFirst, elDrag], () => {
            elGroup.insertBefore(elDrag, elFirst);
          });
          li.drag.elTargetPrevious = elTarget;
        }
      }
      return;
    }
  } catch (e) {
    console.warn(e);
  }
}
