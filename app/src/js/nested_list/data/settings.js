import {state} from './state.js';
import {dict} from './dictionary.js';
import {contextMenuItems} from './settings_menu_items.js';

let settings = {
  /**
   * General options
   */
  id: 'li-default',
  idEmptyItem: 'liEmptyItem',
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
  animeDuration : 100,
  animeDragRelaxDuration : 1,
  localStorageKeys: {
    state: 'li-state',
    history: 'li-history'
  },
  colorDefault: '#474747',
  maxHistoryLength: 100,
  /*
   * Hooks
   */
  onRenderItemContent: null,
  onChange: null,
  onSortStart: null,
  onSortDone: null,
  onSortOver: null,
  onSortEnd: null,
  onSaveLocal: null,
  onGetItemTextById: null,
  onGetItemDateById: null,
  onSetTextData: null,
  onSetDragImage: null,
  onFilterEnd : null,
  onResetState : null,
  onSanitizeState : null,
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
