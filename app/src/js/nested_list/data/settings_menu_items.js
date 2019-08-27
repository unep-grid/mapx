const contextMenuItems = [
   {
    forType: ['group'],
    label: 'cm_group_settings_header',
    ui: 'header'
  },
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
    forType: ['group', 'root'],
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
    forType: ['group','item'],
    label: 'cm_target_sorting_header',
    ui: 'header'
  },
  {
    forType: ['item'],
    action: 'cm_item_add_group',
    label: 'cm_item_add_group',
    ui: 'button'
  },
  {
    forType: ['group', 'item'],
    action: 'cm_target_move_top',
    label: 'cm_target_move_top',
    ui: 'button'
  },
  {
    forType: ['group', 'item'],
    action: 'cm_target_move_up',
    label: 'cm_target_move_up',
    ui: 'button'
  },
  {
    forType: ['group', 'item'],
    action: 'cm_target_move_down',
    label: 'cm_target_move_down',
    ui: 'button'
  },
  {
    forType: ['group', 'item'],
    action: 'cm_target_move_bottom',
    label: 'cm_target_move_bottom',
    ui: 'button'
  },
   {
    forType: ['group', 'item', 'root'],
    label: 'cm_group_sort_header',
    ui: 'header'
  },
  {
    forType: ['group', 'item', 'root'],
    action: 'cm_group_sort_text_asc',
    label: 'cm_group_sort_text_asc',
    ui: 'button'
  },
  {
    forType: ['group', 'item', 'root'],
    action: 'cm_group_sort_text_desc',
    label: 'cm_group_sort_text_desc',
    ui: 'button'
  },
  {
    forType: ['group', 'item', 'root'],
    action: 'cm_group_sort_date_asc',
    label: 'cm_group_sort_date_asc',
    ui: 'button'
  },
  {
    forType: ['group', 'item', 'root'],
    action: 'cm_group_sort_date_desc',
    label: 'cm_group_sort_date_desc',
    ui: 'button'
  },
   {
    forType: ['group', 'item', 'root'],
    label: 'cm_global_header',
    ui: 'header'
  },
  {
    forType: ['root', 'group', 'item'],
    action: 'cm_global_reset_state',
    label: 'cm_global_reset_state',
    ui: 'button'
  },
  {
    forType: ['root', 'group', 'item'],
    action: 'cm_global_undo_last',
    label: 'cm_global_undo_last',
    ui: 'button',
    condition: function() {
      return this.hasHistory();
    }
  },
  {
    forType: ['root', 'group', 'item'],
    action: 'cm_btn_close',
    label: 'cm_btn_close',
    ui: 'button'
  }
];

export {contextMenuItems};
