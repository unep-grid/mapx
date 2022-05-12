import {getDictItem} from './language';
import {modalMarkdown} from './modal_markdown/index.js';
import {modal} from './mx_helper_modal.js';
import {el} from './el/src/index.js';
import {
  getMap,
  getLayerNamesByPrefix,
  getViewDescription,
  getViewLegend,
  getViewTitle
} from './map_helpers/index.js';

export async function mapComposerModalAuto() {
  const h = mx.helpers;
  const idComposer = 'mapcomposer';
  const oldComposer = document.getElementById(idComposer);

  if (oldComposer) {
    return false;
  }

  const map = getMap();

  const vVisible = getLayerNamesByPrefix({
    id: map.id,
    prefix: 'MX-',
    base: true
  });

  const items = [];

  items.push({
    type: 'map',
    width: 600,
    height: 400,
    options: {}
  });

  vVisible.forEach((id) => {
    const title = getViewTitle(id);
    const description = getViewDescription(id);
    const elLegend = getViewLegend(id, {
      clone: true,
      input: false,
      class: true,
      style: false
    });

    items.push({
      type: 'legend',
      element: elLegend,
      width: 300,
      height: 400,
      editable: true
    });

    items.push({
      type: 'title',
      text: title,
      width: 300,
      height: 100,
      editable: true
    });

    items.push({
      type: 'text',
      text: description,
      width: 300,
      height: 100,
      editable: true
    });
  });

  const state = {items: items};

  /**
   * Remove canvas source and layers
   */
  const style = map.getStyle();

  const canvasSrc = h
    .objectToArray(style.sources, true)
    .map((r) => (r.value.type === 'canvas' ? r.key : null));

  canvasSrc.forEach((id) => {
    if (id) {
      delete style.sources[id];
      style.layers.forEach((l, i) => {
        if (l.source === id) {
          style.layers.splice(i, 1);
        }
      });
    }
  });

  /**
   * Run map composer
   */
  const module = await import('./map_composer/index.js');
  const MapComposer = module.MapComposer;

  const elContainer = el('div');

  state.items.forEach((i) => {
    if (i.type === 'map') {
      Object.assign(i.options, {
        attributionControl: false,
        style: style,
        center: map.getCenter(),
        zoom: map.getZoom(),
        pitch: map.getPitch(),
        bearing: map.getBearing()
      });
    }
  });

  const elBtnHelp = el(
    'div',
    {
      class: 'btn btn-default',
      on: {
        click: () => {
          return modalMarkdown({
            title: getDictItem('btn_help'),
            wiki: 'Map-composer'
          });
        }
      }
    },
    getDictItem('btn_help')
  );

  const mc = new MapComposer(elContainer, state, {
    onDestroy: () => {
      map.resize();
    }
  });

  modal({
    title: 'Map Composer',
    id: idComposer,
    buttons: [elBtnHelp],
    content: elContainer,
    addSelectize: false,
    onClose: destroy,
    addBackground: true,
    style: {
      position: 'absolute',
      width: '80%',
      height: '100%'
    },
    styleContent: {
      padding: '0px'
    }
  });

  function destroy() {
    mc.destroy();
  }

  window.mc = mc;
  return true;
}
