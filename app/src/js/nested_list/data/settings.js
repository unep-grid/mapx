import {state} from './state.js';
import {dict} from './dictionary.js';

let settings = {
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
  onRenderItemContent: function() {},
  onChange : function() {},
  onSortInit: function() {},
  onSortStart: function() {},
  onSortDone: function() {},
  onSortOver: function() {},
  onSortEnter: function() {},
  onSortEnd: function() {},
  onGetStateEl: function() {},
  onFilterText: function() {
    return [];
  },
  setTextData: function(el) {
    return el.textContent;
  },
  setDragImage: null,
  customClassDragIgnore : [],
  customDictItem : [],
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
    contextMenuInput: 'li-context-menu-input',
    contextMenuInputLabel: 'li-context-menu-input-label',
    contextMenuInputGroup: 'li-context-menu-input-group'
  },
  contextMenuItems: [
    {
      forType: ['group'],
      action: 'cm_group_rename',
      label: 'cm_group_name',
      ui: 'input_text'
    },
    {
      forType: ['group'],
      action: 'cm_group_color',
      label: 'cm_group_color',
      ui: 'input_color'
    },
    {
      forType: ['group','root'],
      action: 'cm_group_add',
      label: 'cm_group_add',
      ui: 'button',
      shortCut: ''
    },
    {
      forType: ['group'],
      action: 'cm_group_remove',
      label: 'cm_group_remove',
      ui: 'button'
    },
    {
      forType: ['item'],
      action: 'cm_item_add_group',
      label: 'cm_item_add_group',
      ui: 'button'
    },
    {
      forType: ['group','item'],
      action: 'cm_target_move_top',
      label: 'cm_target_move_top',
      ui: 'button'
    },
    {
      forType: ['group','item'],
      action: 'cm_target_move_up',
      label: 'cm_target_move_up',
      ui: 'button'
    },
    {
      forType: ['group','item'],
      action: 'cm_target_move_down',
      label: 'cm_target_move_dow',
      ui: 'button'
    },
    {
      forType: ['group','item'],
      action: 'cm_target_move_bottom',
      label: 'cm_target_move_bottom',
      ui: 'button'
    },
    {
      forType: ['root','group','item'],
      action: 'cm_global_reset_state',
      label: 'cm_global_reset_state',
      ui: 'button'
    },
    {
      forType: ['root','group','item'],
      action: 'cm_global_undo_last',
      label: 'cm_global_undo_last',
      ui: 'button',
      condition: function() {
        return this.hasHistory();
      }
    },
    {
      forType: ['root','group','item'],
      action: 'cm_btn_close',
      label: 'cm_btn_close',
      ui: 'button'
    }
  ]
};

export {settings};
