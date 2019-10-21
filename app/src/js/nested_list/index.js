import {settings} from './data/settings.js';
import {el} from '@fxi/el';
import {Item} from './components/item.js';
import {Group} from './components/group.js';
import {ContextMenu} from './components/contextMenu.js';
import {ListenerStore} from '../listener_store/index.js';

import './style/nested_list.css';

class NestedList {
  constructor(elRoot, opt) {
    const li = this;
    li._is_busy = false;
    li._is_mode_flat = false;
    li._is_mode_skip_save = false;
    li._is_mode_empty = false;
    li._is_mode_lock = false;
    li._is_mode_frozen = false;
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
  }
  /**
   * Init/destroy
   */
  init() {
    let li = this;
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
    let li = this;
    /**
     * Add base listeners
     */
    li.listenerStore.addListener({
      target: li.elRoot,
      bind: li,
      callback: handleSortStart,
      group: 'base',
      type: 'dragstart'
    });
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
      callback: handleClick,
      group: 'base',
      type: 'click'
    });
  }
  stopListening() {
    this.listenerStore.removeListenerByGroup('base');
  }
  destroy() {
    let li = this;
    li.listenerStore.destroy();
    li.clearHistory();
    li.clearAllItems();
  }
  /**
   * Get/set options
   */
  getOptions() {
    return this.opt;
  }
  setOptions(opt) {
    let li = this;
    li.opt = Object.assign({}, settings, opt);
    for (let k in li.opt) {
      let item = li.opt[k];
      if (item instanceof Function) {
        li.opt[k] = item.bind(li);
      }
    }
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
   * Sorting and ordering
   */
  filterById(ids, opt) {
    opt = Object.assign({}, {flatMode: false}, opt);

    let li = this;
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
    if (li.opt.onFilterEnd) {
      li.opt.onFilterEnd();
    }
  }

  sortGroup(elTarget, opt) {
    let def = {asc: true, mode: 'text'};
    opt = Object.assign({}, def, opt);
    let li = this;
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
      data.push(item);
    });

    /**
     * Sort
     */
    data = data.sort((a, b) => {
      if (lt(a.value, b.value)) {
        return -1;
      }
      if (gt(a.value, b.value)) {
        return 1;
      }
      return 0;
    });

    /**
     * Move targets
     */
    var elPrevious;
    data.forEach((d, i) => {
      if (i === 0) {
        li.moveTargetTop(d.el);
      } else {
        li.moveTargetAfter(d.el, elPrevious);
      }
      elPrevious = d.el;
    });

    /**
     * Helpers
     */
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
    let li = this;
    if (li.isTarget(el)) {
      return el;
    }
    while (el && el.parentNode && !li.isTarget(el)) {
      el = el.parentNode;
    }
    return el || li.elRoot;
  }
  getChildrenTarget(el, direct) {
    let li = this;
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
  getNextTarget(el) {
    return el.nextElementSibling;
  }
  getPreviousTarget(el) {
    return el.previousElementSibling;
  }
  getItemContent(el) {
    let li = this;
    if (li.isItem(el)) {
      return el.querySelector('.' + li.opt.class.itemContent);
    }
  }
  getItemText(el) {
    return this.opt.onGetItemTextById
      ? this.opt.onGetItemTextById(el.id)
      : el.innerText;
  }
  getItemDate(el) {
    return this.opt.onGetItemTextById
      ? this.opt.onGetItemDateById(el.id)
      : Date.now();
  }
  getGroup(el) {
    let li = this;
    while (el && (el = el.parentNode) && !li.isGroup(el)) {
      el = el.parentNode;
    }
    return el || li.elRoot;
  }
  getGroupById(id) {
    let li = this;
    return li.elRoot.querySelector(`#${id}`);
  }
  getGroupId(el) {
    let li = this;
    let elGrp = li.getGroup(el);
    if (elGrp === li.elRoot) {
      return 'root';
    } else {
      return elGrp.id;
    }
  }
  getGroupTitleObject(el) {
    let li = this;
    let titleObject = {};
    if (li.isGroup(el)) {
      titleObject = JSON.parse(el.dataset.li_title || '{}');
      titleObject = li.validateGroupTitleObject(titleObject);
    }
    return titleObject;
  }
  getGroupTitle(el) {
    let li = this;
    if (li.isGroup(el)) {
      return el.querySelector('.' + li.opt.class.groupTitle).innerText;
    }
  }
  getGroupDate(el) {
    let li = this;
    if (li.isGroup(el)) {
      return el.dataset.li_date;
    }
  }
  getGroupLabel(el) {
    let li = this;
    if (li.isGroup(el)) {
      return el.querySelector('.' + li.opt.class.groupLabel);
    }
  }
  getGroupColor(el) {
    let li = this;
    if (li.isGroup(el)) {
      return el.dataset.li_color || this.opt.colorDefault;
    }
  }
  moveTargetTop(el) {
    let li = this;
    let elGroup = li.getGroup(el);
    let elFirst = li.getFirstTarget(elGroup, true);
    if (li.isTarget(elFirst)) {
      elGroup.insertBefore(el, elFirst);
    }
  }
  moveTargetBefore(el, elBefore) {
    let li = this;
    elBefore = elBefore || li.getPreviousTarget(el);
    if (li.isTarget(elBefore)) {
      let elGroup = li.getGroup(el);
      elGroup.insertBefore(el, elBefore);
    }
  }
  moveTargetUp(el) {
    let li = this;
    let elPrevious = li.getPreviousTarget(el);
    li.moveTargetBefore(el, elPrevious);
  }
  moveTargetAfter(el, elAfter) {
    let li = this;
    elAfter = elAfter || li.getNextTarget(el);
    if (li.isTarget(elAfter)) {
      let elGroup = li.getGroup(el);
      let elAfterNext = li.getNextTarget(elAfter);
      if (elAfterNext) {
        elGroup.insertBefore(el, elAfterNext);
      } else {
        elGroup.appendChild(el);
      }
    }
  }
  moveTargetDown(el) {
    let li = this;
    let elNext = li.getNextTarget(el);
    li.moveTargetAfter(el, elNext);
  }
  moveTargetBottom(el) {
    let li = this;
    let elGroup = li.getGroup(el);
    if (li.isGroup(elGroup)) {
      elGroup.appendChild(el);
    }
  }
  groupCollapse(el, collapse) {
    let li = this;
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
    let li = this;
    if (li.isGroup(el)) {
      let isCollapsed = li.isGroupCollapsed(el);
      li.groupCollapse(el, !isCollapsed);
    }
  }
  isGroupCollapsed(el) {
    return el.classList.contains(this.opt.class.groupCollapsed);
  }
  isGroupVisible(el) {
    let li = this;
    let isVisible = !el.classList.contains(li.opt.class.groupInvisible);
    return isVisible;
  }
  setGroupVisibility(el, visible) {
    let li = this;
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
    let li = this;
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
    let li = this;
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
    let li = this;
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
    let li = this;
    let isGroup = li.isGroup(el);
    if (!isGroup) {
      return;
    }
    el.style.borderColor = color;
    el.dataset.li_color = color;
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
    let li = this;
    if (li.hasHistory()) {
      return li.history[li.history.length - 1];
    }
  }
  saveStateStorage() {
    let li = this;
    let state = li.getState();
    let history = li.getHistory();

    if (li.isModeFrozen()) {
      return;
    }
    if (li.opt.onChange) {
      li.opt.onChange();
    }
    li.setStateStored(state);
    li.setHistoryStored(history);
  }
  setStateStored(state) {
    let li = this;
    if (li.isModeFrozen()) {
      return;
    }
    let key = li.getStorageKey('state');
    if (state && window.localStorage) {
      window.localStorage.setItem(key, JSON.stringify(state));
      if (li.opt.onSaveLocal) {
        li.opt.onSaveLocal();
      } else {
        alert('Saved');
      }
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
    let li = this;
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
    let li = this;
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
    let li = this;
    let key = li.getStorageKey('state');
    if (window.localStorage) {
      return JSON.parse(window.localStorage.getItem(key));
    }
    return [];
  }
  addUndoStep() {
    let li = this;
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
    let li = this;
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
    let li = this;
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
    let li = this;
    let state = li.getState({keepItemContent: true});
    li.setState({render: false, state: state, useStateStored: false});
  }
  resetState() {
    let li = this;
    let state = li.getStateOrig();
    if (li.isModeEmpty()) {
      return;
    }
    li.addUndoStep();
    li.clearAllItems();
    li.setState({render: true, state: state, useStateStored: false});
    if (li.opt.onResetState) {
      li.opt.onResetState();
    }
  }
  setState(opt) {
    let li = this;
    li.clearAllItems();
    opt = opt || {};
    opt = Object.assign({}, li.opt, opt);
    let state = opt.state || li.getStateOrig();
    if (opt.useStateStored) {
      state = li.getStateStored();
      let isValid = li.isArray(state) && state.length > 0;
      if (isValid && opt.autoMergeState) {
        let stateOrig = li.getStateOrig();
        let allStoredIds = state.map((i) => i.id);
        let allOrigIds = stateOrig.map((i) => i.id);
        stateOrig.forEach((s) => {
          if (allStoredIds.indexOf(s.id) === -1) {
            state.push(s);
          }
        });
        state = state.filter((s) => {
          return s.type === 'group' || allOrigIds.indexOf(s.id) > -1;
        });
      }
    }
    state = state || li.getStateOrig();
    /**
     * Sanitize
     */
    if (li.opt.onSanitizeState) {
      state = li.opt.onSanitizeState(state);
    }

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
    if (li.opt.onChange) {
      li.opt.onChange();
    }
  }
  getStateOrig() {
    return this._state_orig || [];
  }
  setStateOrig(state) {
    this._state_orig = this.cloneObject(state || this.getState() || []);
  }
  clearAllItems() {
    let li = this;
    let els = li.getChildrenTarget(li.elRoot);
    els.forEach((el) => {
      li.removeElement(el);
    });
  }
  addItem(attr) {
    let li = this;
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

    if (attr.render && li.opt.onRenderItemContent) {
      li.opt.onRenderItemContent(elContent, attr);
    }
    if (attr.moveTop) {
      li.moveTargetTop(elItem);
    }
    li.makeIgnoredClassesDraggable(elItem);

    return elItem;
  }

  addGroup(attr) {
    let li = this;
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
    let li = this;
    let elItem = li.elRoot.querySelector('#' + id);
    li.removeElement(elItem);
  }

  removeGroupById(id) {
    let li = this;
    let elGroup = li.elRoot.querySelector('#' + id);
    li.removeGroup(elGroup);
  }
  removeGroup(elGroup) {
    let li = this;
    let isValid = li.isGroup(elGroup) && elGroup !== li.elRoot;
    if (isValid) {
      let elParent = li.getGroup(elGroup);
      let els = li.getChildrenTarget(elGroup, true);
      els.forEach((el) => {
        elParent.appendChild(el);
      });
      li.removeElement(elGroup);
    }
  }
  /**
   * Helpers
   */
  setUiDraggingStart() {
    let li = this;
    setTimeout(() => {
      document.body.classList.add(li.opt.class.globalDragging);
    }, 100);
  }
  setUiDraggingEnd() {
    let li = this;
    setTimeout(() => {
      document.body.classList.remove(li.opt.class.globalDragging);
    }, 10);
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
    let li = this;
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
    let li = this;
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
    let li = this;
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
    let li = this;
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
  randomId() {
    let li = this;
    return (
      li.opt.prefix +
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
    let li = this;
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
    let li = this;
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
   * The only way found to avoid non-draggable children
   * to be dragged is to set the draggable attribute to true
   * and when the dragstart begin, prevent default and return
   * see https://jsfiddle.net/fxi/tyw0zn7h/;
   */
  makeIgnoredClassesDraggable(el) {
    let li = this;
    let cl = '.' + li.opt.customClassDragIgnore.join(',.');
    el.querySelectorAll(cl).forEach((el) => {
      el.setAttribute('draggable', true);
    });
  }
  isIgnoredElement(el) {
    let li = this;
    return li.opt.customClassDragIgnore.reduce((a, c) => {
      return a || (li.isElement(el) && el.classList.contains(c));
    }, false);
  }
}

export {NestedList};

/**
 * Start sort event listener
 */
function handleSortStart(evt) {
  let li = this;

  li.elDrag = evt.target;
  /**
   * prevent if event comes from ignored see comment
   * for makeIgnoredClassesDraggable
   **/
  if (li.isIgnoredElement(li.elDrag)) {
    evt.preventDefault();
    return;
  }

  if (li.opt.onSortStart) {
    li.opt.onSortStart(evt);
  }
  li.setUiDraggingStart();

  li.elDrag.classList.add(li.opt.class.dragged);
  evt.dataTransfer.effectAllowed = 'move';
  // keep this version in history;
  li.addUndoStep();
  if (li.opt.onSetDragImage) {
    let elDragImage = li.opt.onSetDragImage(li.elDrag);
    if (!elDragImage) {
      elDragImage = li.elDrag;
    }
    let rectImage = elDragImage.getBoundingClientRect();
    let dragOffsetTop = evt.clientY - rectImage.top;
    let dragOffsetLeft = evt.clientX - rectImage.left;
    evt.dataTransfer.setDragImage(elDragImage, dragOffsetLeft, dragOffsetTop);
  }
  if (li.opt.onSetTextData) {
    evt.dataTransfer.setData('Text', li.opt.onSetTextData(li.elDrag));
  }
  li.elNext = li.elDrag.nextSibling;
  li.listenerStore.addListener({
    target: li.elRoot,
    bind: li,
    type: 'dragover',
    group: 'dragevent',
    callback: handleSortOver,
    throttle: true,
    throttleTime: 100
  });
  li.listenerStore.addListener({
    target: li.elRoot,
    bind: li,
    type: 'dragend',
    group: 'dragevent',
    callback: handleSortEnd
  });
}
/**
 * Enter event listener
 */

/**
 * Over event listener
 */
function handleSortOver(evt) {
  let li = this;
  if (li.isBusy()) {
    console.log('sort over : is busy');
    return;
  }
  if (li.opt.onSortOver) {
    li.opt.onSortOver(evt);
  }
  evt.preventDefault();
  evt.dataTransfer.dropEffect = 'move';
  let elTarget = li.getTarget(evt.target);
  /**
   * Target evaluation
   */
  let areElements = li.isElement(elTarget) && li.isElement(li.elDrag);
  if (!areElements) {
    return;
  }
  let isNotTarget = !li.isTarget(elTarget);
  let isChildren = li.isChildOf(elTarget, li.elDrag);
  let isItself = li.isSameElement(elTarget, li.elDrag);
  if (isNotTarget || isItself || isChildren) {
    return;
  }
  evt.stopPropagation();
  evt.stopImmediatePropagation();
  let isGroup = li.isGroup(elTarget);
  let isGroupCollapsed = isGroup && li.isGroupCollapsed(elTarget);
  let elDrag = li.elDrag;
  let elGroup = null;
  let elInsert = null;
  let elFirst = null;
  let isValid = false;
  let groupHasItems = false;
  /**
   *   Curlir position above target
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
        !li.isSameElement(elInsert, elDrag) &&
        !li.isSameElement(elInsert, elGroup);
      if (isValid) {
        /**
         * Move
         */
        li.setBusy(true);
        animateMove(elDrag, elInsert).then(() => {
          elGroup.insertBefore(elDrag, elInsert);
          li.setBusy(false);
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
        elGroup.appendChild(elDrag);
      } else {
        elFirst = li.getFirstTarget(elGroup);
        isValid =
          !li.isSameElement(elFirst, elDrag) &&
          !li.isSameElement(elFirst, elGroup);
        if (isValid) {
          /**
           * Move
           */
          li.setBusy(true);
          animateMove(elDrag, elFirst).then(() => {
            elGroup.insertBefore(elDrag, elFirst);
            li.setBusy(false);
          });
        }
      }
      return;
    }
  } catch (e) {
    console.warn(e);
  }
}


/**
* Simple animation to move smoothly list item
*/
function animateMove(elDrag, elDest, duration) {
  duration = duration || 200;
  return new Promise((resolve) => {
    if(!elDrag || !elDest){
      resolve(false);
    }
    var rDrag = elDrag.getBoundingClientRect();
    var rDest = elDest.getBoundingClientRect();
    var dY = rDrag.top - rDest.top;

    elDrag.classList.add('li-animate-move');
    elDest.classList.add('li-animate-move');

    elDrag.style.transform = 'translateY(' + (-dY) + 'px)';
    elDest.style.transform = 'translateY(' + (dY) + 'px)';

    setTimeout(() => {
      elDrag.classList.remove('li-animate-move');
      elDest.classList.remove('li-animate-move');
      elDrag.style.transform = '';
      elDest.style.transform = '';
      resolve(true);
    }, duration);
  });
}
/**
 * Sort end event listener
 */
function handleSortEnd(evt) {
  evt.preventDefault();
  let li = this;
  li.elDrag.classList.remove(li.opt.class.dragged);
  li.listenerStore.removeListenerByGroup('dragevent');
  li.setUiDraggingEnd();

  if (li.isModeEmpty()) {
    return;
  }
  if (li.opt.onSortEnd) {
    li.opt.onSortEnd(evt);
  }
  if (li.elNext !== li.elDrag.nextSibling && li.opt.onSortDone) {
    li.opt.onSortDone(li.elDrag);
  }
  li.elDrag = null;
}
/**
 * Click in context menu event listener
 */
function handleContextClick(evt) {
  evt.preventDefault();
  let li = this;
  if (li.contextMenu instanceof ContextMenu) {
    li.contextMenu.destroy();
  }
  if (li.isModeEmpty()) {
    return;
  }
  li.contextMenu = new ContextMenu(evt, li);
}
/**
 * Click general listener
 */
function handleClick(evt) {
  let li = this;
  let elTarget = li.getTarget(evt.target);
  let idAction = elTarget.dataset.li_id_action;
  let idType = elTarget.dataset.li_event_type;
  let isValidEvent = idType === 'click' && idAction && li.isTarget(elTarget);
  if (isValidEvent) {
    if (isValidEvent && idAction === 'li_group_toggle') {
      li.groupToggle(elTarget, true);
    }
  }
}
