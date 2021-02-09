/**
 * Control for live coordinate
 */

export function mapControlLiveCoord() {}
mapControlLiveCoord.prototype.onAdd = function(map) {
  const helper = mx.helpers;
  var coord = document.createElement('div');
  map.on('mousemove', function(e) {
    var pos = e.lngLat;
    var lat = helper.formatZeros(pos.lat, 3);
    var lng = helper.formatZeros(pos.lng, 3);
    coord.innerText = ' Lat: ' + lat + ' - Lng: ' + lng;
  });
  this._map = map;
  this._container = document.createElement('div');
  this._container.className = 'mapboxgl-ctrl mapboxgl-ctrl-attrib';
  this._container.appendChild(coord);
  return this._container;
};

mapControlLiveCoord.prototype.onRemove = function() {
  this._container.parentNode.removeChild(this._container);
  this._map = undefined;
};

export function mapxLogo() {}
mapxLogo.prototype.onAdd = function() {
  const h = mx.helpers;
  var elLogo = h.el(
    'a',
    {
      href: h.path(mx, 'settings.links.mainProjectPage'),
      class: 'mx-logo',
      target: '_blank',
      rel: 'noreferrer',
      style: {
        backgroundImage: `url(${require('../svg/map-x-logo-full.svg')})`,
        fontSize: '0em'
      }
    },
    'Main project page'
  );
  this._container = h.el('div');
  this._container.className = 'mapboxgl-ctrl';
  this._container.style.display = 'inline-block';
  this._container.style.float = 'none';
  this._container.appendChild(elLogo);
  return this._container;
};

mapxLogo.prototype.onRemove = function() {
  this._container.parentNode.removeChild(this._container);
  this._map = undefined;
};

export function showSelectProject() {
  var val = {
    time: new Date(),
    value: 'showProject'
  };
  Shiny.onInputChange('btn_control', val);
}

export function showSelectLanguage() {
  var val = {
    time: new Date(),
    value: 'showLanguage'
  };
  Shiny.onInputChange('btn_control', val);
}

export function showLogin() {
  var val = {
    time: new Date(),
    value: 'showLogin'
  };
  Shiny.onInputChange('btn_control', val);
}

export function createControlBtns(btns) {
  const h = mx.helpers;

  let keys = Object.keys(btns);
  let items = Object.values(btns);

  const elControls = h.el(
    'ul',
    {
      class: ['mx-controls-ul']
    },
    items.map((btn, i) => {
      if (!btn.remove) {
        btn.elBtn = h.el(
          'li',
          {
            id: keys[i],
            on: {click: btn.action},
            class: [
              'btn',
              'btn-circle',
              'btn-circle-medium',
              'hint--left',
              'shadow'
            ].concat(btn.liClasses),
            dataset: Object.assign(
              {},
              {lang_key: btn.key, lang_type: 'tooltip'},
              btn.liData
            )
          },
          h.el('div', {
            class: btn.classes
          })
        );
        return btn.elBtn;
      }
    })
  );

  mx.helpers.updateLanguageElements({selector: elControls});
  return elControls;
}

/**
 * Create the prototype containing additional control / button.
 * Some of the actions are related to shiny framework
 */
export function mapControlApp() {}
mapControlApp.prototype.onAdd = function(map) {
  //var idMap = map._container.id;
  const h = mx.helpers;
  const modeStatic = mx.settings.mode.static === true;

  /**
   * Build buttons list
   */
  var btns = {
    btnStoryClose: {
      classes: ['fa', 'fa-arrow-left'],
      liClasses: 'mx-display-none',
      key: 'btn_story_close'
    },
    btnStoryUnlockMap: {
      classes: ['fa', 'fa-lock'],
      liClasses: 'mx-display-none',
      key: 'btn_story_unlock_map',
      action: h.storyControlMapPan
    },
    btnSetNorth: {
      classes: ['mx-north-arrow'],
      key: 'btn_north_arrow',
      action: function() {
        var map = h.getMap();
        if (map) {
          map.easeTo({bearing: 0, pitch: 0});
        }
      }
    },
    btnZoomIn: {
      classes: ['fa', 'fa-plus'],
      key: 'btn_zoom_in',
      action: function() {
        map.zoomIn();
      }
    },
    btnZoomOut: {
      classes: ['fa', 'fa-minus'],
      key: 'btn_zoom_out',
      action: function() {
        map.zoomOut();
      }
    },
    btnFullScreen: {
      classes: ['fa', 'fa-expand'],
      key: 'btn_fullscreen',
      action: function() {
        h.toggleFullScreen('btnFullScreen');
      }
    },
    btnThemeSwitch: {
      classes: ['fa', 'fa-adjust', 'fa-transition-generic'],
      key: 'btn_theme_switch',
      action: function() {
        const elIcon = this.querySelector('.fa');
        elIcon.classList.toggle('fa-rotate-180');
        mx.theme.toggleDarkMode();
      }
    },
    btn3dTerrain: {
      classes: ['mx-mountain'],
      key: 'btn_3d_terrain',
      action: ()=>{
        h.btnToggleLayer({
          id: 'map_main',
          idLayer: 'terrain_sky',
          idSwitch: 'btn3dTerrain',
          action: 'toggle'
        });
      }
    },
    btnThemeAerial: {
      classes: ['fa', 'fa-plane'],
      key: 'btn_theme_sat',
      action: ()=>{
        h.btnToggleLayer({
          id: 'map_main',
          idLayer: 'mapbox_satellite',
          idSwitch: 'btnThemeAerial',
          action: 'toggle'
        });
      }
    },

    btnOverlapSpotlight: {
      classes: ['fa', 'fa-bullseye'],
      key: 'btn_overlap_spotlight',
      //remove: modeStatic,
      action: function(e) {
        //var el = e.target;
        h.toggleSpotlight(e.target);
      }
    },
    btnToggleBtns: {
      classes: ['fa', 'fa-desktop'],
      classeActive: 'active',
      key: 'btn_toggle_all',
      hidden: false,
      position: 'top-left',
      action: h.setImmersiveMode
    },

    btnGeolocateUser: {
      classes: ['fa', 'fa-map-marker'],
      key: 'btn_geolocate_user',
      hidden: false,
      action: h.geolocateUser
    },
    btnPrint: {
      classes: ['fa', 'fa-map-o'],
      key: 'btn_map_composer',
      action: function() {
        h.mapComposerModalAuto();
      }
    },
    btnDrawMode: {
      classes: 'mx-edit-vector',
      remove: modeStatic,
      key: 'btn_draw_mode',
      action: function(e) {
        h.drawModeToggle(e);
      }
    },
    btnShowAbout: {
      classes: ['fa', 'fa-info'],
      key: 'btn_about',
      remove: modeStatic,
      action: function() {
        var val = {
          time: new Date(),
          value: 'showAbout'
        };
        Shiny.onInputChange('btn_control', val);
      }
    }
  };

  var btnList = createControlBtns(btns);

  this._map = map;
  this._container = document.createElement('div');
  this._container.className = 'mapboxgl-ctrl mx-controls-top';
  this._container.appendChild(btnList);
  return this._container;
};

mapControlApp.prototype.onRemove = function() {
  this._container.parentNode.removeChild(this._container);
  this._map = undefined;
};

/**
 * Create the prototype containing additional control / button.
 * Some of the actions are related to shiny framework
 */
export function mapControlNav() {}
mapControlNav.prototype.onAdd = function(map) {
  //var idMap = map._container.id;
  const h = mx.helpers;

  /**
   * Build buttons list
   */
  var btns = {
    btnGeolocateUser: {
      classes: ['fa', 'fa-map-marker'],
      key: 'btn_geolocate_user',
      hidden: false,
      action: h.geolocateUser
    },
    btnThemeAerial: {
      classes: ['fa', 'fa-plane'],
      key: 'btn_theme_sat',
      action: function() {
        h.btnToggleLayer({
          id: 'map_main',
          idLayer: 'mapbox_satellite',
          idSwitch: 'btnThemeAerial',
          action: 'toggle'
        });
      }
    },
    btnZoomIn: {
      classes: ['fa', 'fa-plus'],
      key: 'btn_zoom_in',
      action: function() {
        map.zoomIn();
      }
    },
    btnZoomOut: {
      classes: ['fa', 'fa-minus'],
      key: 'btn_zoom_out',
      action: function() {
        map.zoomOut();
      }
    },
    btnSetNorth: {
      classes: ['mx-north-arrow'],
      key: 'btn_north_arrow',
      action: function() {
        var map = h.path(mx, 'maps.map_main.map');
        if (map) {
          map.easeTo({bearing: 0, pitch: 0});
        }
      }
    }
  };

  var btnList = createControlBtns(btns);

  this._map = map;
  this._container = document.createElement('div');
  this._container.className = 'mapboxgl-ctrl mx-controls-top';
  this._container.appendChild(btnList);
  return this._container;
};
mapControlNav.prototype.onRemove = function() {
  this._container.parentNode.removeChild(this._container);
  this._map = undefined;
};

/**
 * Create a nested scale indicator : text,box and container. Not possible by the original method.
 * This is a hack based on mapbox-gl-js/src/ui/control/scale_control.js
 */
export function mapControlScale() {}

mapControlScale.prototype.onAdd = function(map) {
  var container = document.createElement('div');
  var text = document.createElement('div');
  var scale = document.createElement('div');
  container.className = 'mapboxgl-ctrl mapboxgl-ctrl-attrib';
  text.className = 'mx-scale-text';
  scale.className = 'mx-scale-box';
  scale.appendChild(text);
  container.appendChild(scale);

  map.on('mousemove', function(e) {
    const y = e.point.y;
    render(100, y);
  });

  map.once('moveend', function() {
    render(100, 0);
  });

  function render(x, y) {
    let unit = 'm';
    const maxWidth = 100;
    //const y = map._container.clientHeight / 2;
    const maxMeters = getDistance(
      map.unproject([0, y]),
      map.unproject([maxWidth, y])
    );
    let distance = getRoundNum(maxMeters);
    const ratio = distance / maxMeters;
    if (distance >= 1000) {
      distance = distance / 1000;
      unit = 'km';
    }

    scale.style.width = maxWidth * ratio + 'px';
    text.innerHTML = distance + unit;
  }

  this._container = container;

  return this._container;
};

mapControlScale.prototype.onRemove = function() {
  this._container.parentNode.removeChild(this._container);
  this._map = undefined;
};

function getDistance(latlng1, latlng2) {
  // Uses spherical law of cosines approximation.
  const R = 6371000;

  const rad = Math.PI / 180,
    lat1 = latlng1.lat * rad,
    lat2 = latlng2.lat * rad,
    a =
      Math.sin(lat1) * Math.sin(lat2) +
      Math.cos(lat1) *
        Math.cos(lat2) *
        Math.cos((latlng2.lng - latlng1.lng) * rad);

  const maxMeters = R * Math.acos(Math.min(a, 1));
  return maxMeters;
}

function getRoundNum(num) {
  const pow10 = Math.pow(10, `${Math.floor(num)}`.length - 1);
  let d = num / pow10;

  d = d >= 10 ? 10 : d >= 5 ? 5 : d >= 3 ? 3 : d >= 2 ? 2 : 1;

  return pow10 * d;
}
