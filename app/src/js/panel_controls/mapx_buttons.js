import {Button} from './button.js';
import screenfull from 'screenfull';
import {
  path,
  storyControlMapPan,
  isStoryPlaying,
  mapComposerModalAuto,
  geolocateUser,
  toggleSpotlight,
  btnToggleLayer,
  getMap
} from './../mx_helpers.js';

export function generateButtons() {
  return [
    new Button({
      key: 'btn_story_close',
      display: false,
      classesIcon: ['fa', 'fa-arrow-left'],
      action: function() {
        const btn = this;
        const story = path(mx, 'data.story');
        if (story) {
          story.data.close(btn);
        }
      }
    }),
    new Button({
      key: 'btn_story_unlock_map',
      display: false,
      classesIcon: ['fa', 'fa-lock'],
      action: function() {
        const story = path(mx, 'data.story');
        if (story) {
          storyControlMapPan();
        }
      }
    }),
    new Button({
      key: 'btn_north_arrow',
      classesIcon: ['mx-north-arrow'],
      action: () => {
        const map = getMap();
        map.easeTo({bearing: 0, pitch:0});
      }
    }),
    new Button({
      key: 'btn_zoom_in',
      classesIcon: ['fa', 'fa-plus'],
      action: () => {
        const map = getMap();
        map.zoomIn();
      }
    }),
    new Button({
      key: 'btn_zoom_out',
      classesIcon: ['fa', 'fa-minus'],
      action: () => {
        const map = getMap();
        map.zoomOut();
      }
    }),
    new Button({
      key: 'btn_map_rotate_left',
      classesIcon: ['fa', 'fa-rotate-left'],
      action: () => {
        const map = getMap();
        const b = map.getBearing();
        map.flyTo({bearing: b + 30});
      }
    }),
    new Button({
      key: 'btn_map_rotate_right',
      classesIcon: ['fa', 'fa-rotate-right'],
      action: () => {
        const map = getMap();
        const b = map.getBearing();
        map.flyTo({bearing: b - 30});
      }
    }),
    new Button({
      key: 'btn_geolocate_user',
      classesIcon: ['fa', 'fa-map-marker'],
      action: geolocateUser
    }),
    new Button({
      key: 'btn_fullscreen',
      classesIcon: ['fa', 'fa-expand'],
      classesButton: ['btn-ctrl--item-no-mobile'],
      action: toggleFullScreen
    }),
    new Button({
      key: 'btn_theme_switch',
      classesIcon: ['fa', 'fa-adjust', 'fa-transition-generic'],
      action: toggleTheme
    }),
    new Button({
      key: 'btn_3d_terrain',
      classesIcon: ['mx-mountain'],
      // ()=> = this does not work;
      action: function(cmd) {
        const btn = this;
        const map = getMap();
        cmd = typeof cmd === 'string' ? cmd : 'toggle';
        const enabled = btnToggleLayer({
          id: 'map_main',
          idLayer: 'terrain_sky',
          elButton: btn.elButton,
          action: cmd
        });
        const storyPlaying = isStoryPlaying();
        if (!storyPlaying) {
          map.flyTo({pitch: enabled ? 60 : 0});
        }
      }
    }),
    new Button({
      key: 'btn_theme_sat',
      classesIcon: ['fa', 'fa-plane'],
      // ()=> = this does not work;
      action: function(cmd) {
        const btn = this;
        cmd = typeof cmd === 'string' ? cmd : 'toggle';
        btnToggleLayer({
          id: 'map_main',
          idLayer: 'mapbox_satellite',
          elButton: btn.elButton,
          action: cmd
        });
      }
    }),
    new Button({
      key: 'btn_overlap_spotlight',
      classesIcon: ['fa', 'fa-bullseye'],
      action: toggleSpotlight
    }),
    new Button({
      key: 'btn_map_composer',
      classesIcon: ['fa', 'fa-map-o'],
      classesButton: ['btn-ctrl--item-no-mobile'],
      action: mapComposerModalAuto
    }),
    new Button({
      key: 'btn_about',
      classesIcon: ['fa', 'fa-info'],
      ignore: () => mx.settings.mode.static === true,
      action: () => {
        Shiny.onInputChange('btn_control', {
          time: new Date(),
          value: 'showAbout'
        });
      }
    })
  ];
}

/**
 * Helpers
 * NOTE: If use 'this', function must be named. Anonymous,
 * even 'bound', do not have 'this' in event callback;
 */

function toggleFullScreen() {
  const btn = this;
  const enabled = !!btn._fullscreen;
  const cl = btn.elButton.classList;
  if (enabled) {
    cl.add('fa-expend');
    cl.remove('fa-compress');
    screenfull.exit();
    btn._fullscreen = false;
  } else {
    cl.remove('fa-expend');
    cl.add('fa-compress');
    screenfull.request();
    btn._fullscreen = true;
  }
}

function toggleTheme() {
  const elIcon = this.elButton.querySelector('.fa');
  elIcon.classList.toggle('fa-rotate-180');
  mx.theme.toggleDarkMode();
}
