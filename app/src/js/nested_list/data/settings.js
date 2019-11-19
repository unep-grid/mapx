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
  addDictItems : [],
  state: state,
  useStateStored: false,
  autoMergeState: false,
  emptyLabel: '<h3>Empty list</h3>',
  language: 'en',
  languageDefault: 'en',
  languages: ['en', 'fr', 'es'],
  mode: ['debug'],
  animeDuration: 200,
  animeMaxDist : 200,
  animeDragRelaxDuration: 200,
  localStorageKeys: {
    state: 'li-state',
    history: 'li-history'
  },
  colorDefault: '#474747',
  maxHistoryLength: 100,
  /*
   * Events
   */
  eventsCallback: [],
  eventsKeys: [
    'set_drag_image',
    'sort_end',
    'sort_done',
    'render_item_content',
    'get_item_text_by_id',
    'get_item_date_by_id',
    'filter_end',
    'state_reset',
    'state_change',
    'state_save_local',
    'state_sanitize',
    'state_order'
  ],
  /**
  * Custom classes
  */
  classDragHandle : '',
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
    dragHandle : 'li-drag-handle',
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
