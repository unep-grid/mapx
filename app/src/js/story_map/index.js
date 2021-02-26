import {initEditing} from './edit.js';
import {ButtonPanel} from './../button_panel/index.js';
import './style.less';
/**
 * Store local and views
 */
const viewsAdditional = [];

/**
 * Default settings
 */
const settings = {
  ctrl_btn_disable: [
    'btn_overlap_spotlight',
    'btn_map_composer',
    'btn_map_rotate_left',
    'btn_map_rotate_right',
    'btn_geolocate_user',
    'btn_overlap_spotlight',
    'btn_map_composer'
  ],
  ctrl_btn_enable: ['btn_story_close', 'btn_story_unlock_map'],
  ctrl_btn_enable_update_mode: ['btn_story_unlock_map'],
  panel_enable: [],
  panel_disable: ['main_panel', 'notif_center'],
  id_story: ['#story']
};

class StoryMapPlayer {
  constructor() {}
  init() {}
  start() {}
  pause() {}
  autoPlay(){}
  set() {}
  get() {}
  build() {}
  show() {}
  hide() {}
  playNext() {}
  playPrevious() {}
  destroy() {}
  _el_container() {}
  _el_bullet() {}
  _el_bullets() {}
  _el_slide() {}
  _el_step() {}
}

export {StoryMapPlayer};
