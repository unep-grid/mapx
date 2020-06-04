import {Spotlight} from './pixop/spotlight.js';

export function toggleSpotlight(opt) {
  const elSelectNum = document.getElementById('selectNLayersOverlap');
  const elTextArea = document.getElementById('txtAreaOverlap');
  const elTextResol = document.getElementById('txtResolOverlap');
  const elEnableCalcArea = document.getElementById('checkEnableOverlapArea');
  const clActive = 'active';
  const elToggleMain = document.getElementById('btnOverlapSpotlight');

  opt = Object.assign(
    {},
    {
      enable: undefined,
      elToggle: undefined,
      calcArea: undefined,
      nLayers: undefined
    },
    opt
  );
  const h = mx.helpers;
  const map = h.getMap();
  const elToggle = h.isElement(opt.elToggle) ? opt.elToggle : elToggleMain;

  const enable =
    typeof opt.enable !== 'undefined'
      ? opt.enable
      : !elToggle.classList.contains(clActive);

  const config = {
    map: map,
    enabled: () => {
      return enable;
    },
    nLayersOverlap: function() {
      let n = 1;

      if (opt.nLayers === 'all' || (opt.nLayers > 0 && opt.nLayers < 5)) {
        elSelectNum.value = opt.nLayers;
      }

      n = elSelectNum.value === 'all' ? 0 : elSelectNum.value * 1;
      return n;
    },
    calcArea: () => {
      let calc = false;
      if (opt.calcArea) {
        elEnableCalcArea.checked = true;
      }
      calc = !!elEnableCalcArea.checked;
      return calc;
    },
    onCalcArea: (area) => {
      let resol = mx.spotlight.getResolution();
      if (h.isElement(elTextArea) && h.isElement(elTextResol)) {
        elTextArea.innerText = '~ ' + Math.round(area * 1e-6) + ' km2';
        elTextResol.innerText =
          ' ~ ' + formatDist(resol.lat) + ' x ' + formatDist(resol.lng);
      }
    },
    onRendered: (px) => {
      document.body.classList.remove('mx-busy');
      px.setOpacity(0.5);
    },
    onRender: (px) => {
      document.body.classList.add('mx-busy');
      px.setOpacity(0.1);
    }
  };

  if (!enable) {
    /**
     * Remove active class
     */
    elToggle.classList.remove(clActive);
    destroy();
  } else {
    /**
     * Remove active class
     */
    elToggle.classList.add(clActive);

    /**
     * Create if needed
     */
    if (!mx.spotlight || mx.spotlight.isDestroyed()) {
      mx.spotlight = new Spotlight(config);
    }

    /**
     * Render if non spatial change
     */
    render();
    mx.listeners.addListener({
      target: elEnableCalcArea,
      type: 'change',
      idGroup: 'spotlight_pixop_ui',
      callback: render
    });
    mx.listeners.addListener({
      target: elSelectNum,
      type: 'change',
      idGroup: 'spotlight_pixop_ui',
      callback: render
    });

    /**
     * Destroy if other changes
     */

    map.on('movestart', hide);
    map.on('moveend', render);
    window.rr = render;
    mx.events.on({
      type: ['view_added', 'view_removed', 'view_filtered'],
      idGroup: 'spotlight_pixop_view_events',
      callback: render
    });
  }
}

function formatDist(v, squared) {
  v = v || 0;
  squared = squared || false;
  const suffix = squared ? '2' : '';
  const factor = squared ? 1e-6 : 1e-3;

  if (v > 1000) {
    return Math.round(v * factor * 1000) / 1000 + ' km' + suffix;
  } else {
    return Math.round(v * 1000) / 1000 + ' m' + suffix;
  }
}

function hide() {
  mx.spotlight.pixop.setOpacity(0);
}

function render() {
  mx.helpers.onNextFrame(() => {
    setTimeout(()=>{
      mx.spotlight.render();
    },1);
  });
}

function destroy() {
  if (mx.spotlight instanceof Spotlight) {
    mx.spotlight.destroy();
  }
  const map = mx.spotlight.pixop.map;
  map.off('moveend', render);
  map.off('movestart', hide);

  mx.events.off({
    type: ['view_added', 'view_removed', 'view_filtered'],
    idGroup: 'spotlight_pixop_view_events'
  });

  mx.listeners.removeListenerByGroup('spotlight_pixop_ui');
}
