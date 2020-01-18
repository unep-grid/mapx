import {Spotlight} from './pixop/spotlight.js';

export function activateSpotlight(enable, elToggle) {
  const h = mx.helpers;
  const map = h.getMap();
  const elSelectNum = document.getElementById('selectNLayersOverlap');
  const elTextArea = document.getElementById('txtAreaOverlap');
  const elTextResol = document.getElementById('txtResolOverlap');
  const elEnableCalcArea = document.getElementById('checkEnableOverlapArea');

  const config = {
    map: map,
    enabled: () => {
      return enable;
    },
    nLayersOverlap: function() {
      let n = 1;
      if (h.isElement(elSelectNum)) {
        n = elSelectNum.value === 'all' ? 0 : elSelectNum.value * 1;
      }
      return n;
    },
    calcArea: () => {
      let calc = false;
      if (h.isElement(elEnableCalcArea)) {
        calc = !!elEnableCalcArea.checked;
      }
      return calc;
    },
    onCalcArea: (area) => {
      let resol = mx.spotlight.getResolution();
      if (h.isElement(elTextArea) && h.isElement(elTestResol)) {
        elTextArea.innerText = '~ ' + Math.round(area * 1e-6) + ' km2';
        elTextResol.innerText =
          ' ~ ' + formatDist(resol.lat) + ' x ' + formatDist(resol.lng);
      }
    },
    onRendered: () => {
      console.log('Spotlight rendered');
    }
  };

  if (!enable) {
    /*
     * Clear old stuff
     */
    map.off('move', destroy);
    destroy();
    mx.listeners.removeListenerByGroup('spotlight_pixop');
  } else {
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
      idGroup: 'spotlight_pixop',
      callback: render
    });
    mx.listeners.addListener({
      target: elSelectNum,
      type: 'change',
      idGroup: 'spotlight_pixop',
      callback: render
    });

    /**
     * Destroy if other changes
     */
    map.on('move', destroy);
    mx.events.on({
      type: ['view_added', 'view_removed', 'view_filtered'],
      idGroup: 'spotlight_pixop',
      callback: destroy
    });
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
  function render() {
    mx.spotlight.render();
  }

  function destroy() {
    if (mx.spotlight instanceof Spotlight) {
      mx.spotlight.destroy();
    }
    elToggle.classList.remove('active');
  }
}
