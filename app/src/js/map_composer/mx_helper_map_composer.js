export {mapComposerModalAuto};

function mapComposerModalAuto() {
  var map = mx.helpers.getMap();

  var vVisible = mx.helpers.getLayerNamesByPrefix({
    id: map.id,
    prefix: 'MX-',
    base: true
  });

  var items = [];

  items.push({
    type: 'map',
    width: 20,
    height: 20,
    options: {}
  });

  vVisible.forEach((id) => {
    var title = mx.helpers.getViewTitle(id);
    var description = mx.helpers.getViewDescription(id);
    var elLegend = mx.helpers.getViewLegend(id, true);

    items.push({
      type: 'legend',
      element: elLegend,
      width: 4,
      height: 6
    });

    items.push({
      type: 'title',
      text: title,
      width: 40,
      height: 4
    });

    items.push({
      type: 'text',
      text: description,
      width: 20,
      height: 8
    });
  });

  var config = {items: items};

  /**
   * Remove canvas source and layers
   */
  var style = map.getStyle();

  var canvasSrc = mx.helpers
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
  return import('./index.js').then((m) => {
    config.items.forEach((i) => {
      if (i.type === 'map') {
        Object.assign(i.options, {
          attributionControl: false,
          style: style,
          center: map.getCenter(),
          zoom: map.getZoom()
        });
      }
    });

    var elContainer = mx.helpers.el('div', {
      style: {
        width: '100%',
        height: '100%',
        minHeight: '400px'
      }
    });


    mx.helpers.modal({
      id: 'mapcomposer',
      content: elContainer,
      onClose : removeMc
    });

    var mc = new m.MapComposer(elContainer, config);

    function removeMc(){
      mc.destroy();
    }

    window.mc = mc;
  });
}
