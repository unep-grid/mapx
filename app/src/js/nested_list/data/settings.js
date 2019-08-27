import {state} from './state.js';
import {dict} from './dictionary.js';
import {contextMenuItems} from './settings_menu_items.js';

let settings = {
  /**
  * General options
  */
  id: 'li-default',
  prefix: 'li',
  dict: dict,
  state: state,
  useStateStored: false,
  autoMergeState: false,
  emptyLabel: '<h3>Empty list</h3>',
  language: 'en',
  languageDefault: 'en',
  languages: ['en', 'fr', 'es'],
  mode: ['debug'],
  localStorageKeys: {
    state: 'li-state',
    history: 'li-history'
  },
  colorDefault: '#474747',
  maxHistoryLength: 100,
  /*
  * Hooks
  */
  onRenderItemContent: function() {},
  onChange: function() {},
  onSortInit: function() {},
  onSortStart: function() {},
  onSortDone: function() {},
  onSortOver: function() {},
  onSortEnter: function() {},
  onSortEnd: function() {},
  onGetStateEl: function() {},
  onGetItemTextById: function(id) {
    return id;
  },
  onGetItemDateById: function(id) {
    id = id;
    return new Date().getTime();
  },
  onFilterText: function() {
    return [];
  },
  onSetTextData: function(el) {
    return el.textContent;
  },
  onSetDragImage: null,
  /**
  * Dictionnary
  */
  customDictItem: [],
  /**
  * Drag classes
  */
  customClassDragIgnore: [],
  /**
  * Global classes names
  */
  class: {
    base: 'li',
    item: 'li-item',
    group: 'li-group',
    itemContent: 'li-item-content',
    itemHidden: 'li-item-hidden',
    groupTitle: 'li-group-title',
    groupHeader: 'li-group-header',
    groupCollapsed: 'li-group-collapsed',
    groupCaret: 'li-group-caret',
    groupLabel: 'li-group-label',
    groupInvisible: 'li-group-invisible',
    dragged: 'li-dragged',
    draggable: 'li-draggable',
    arrowBottom: 'li-arrow-bottom',
    globalDragging: 'li-global-dragging',
    contextMenu: 'li-context-menu',
    contextMenuTargetFocus: 'li-context-menu-target-focus',
    contextMenuGroup: 'li-context-menu-group',
    contextMenuButton: 'li-context-menu-button',
    contextMenuHeader: 'li-context-menu-header',
    contextMenuInput: 'li-context-menu-input',
    contextMenuInputLabel: 'li-context-menu-input-label',
    contextMenuInputGroup: 'li-context-menu-input-group'
  },
  /**
  * Context menu items
  */
  contextMenuItems: contextMenuItems
};

export {settings};
