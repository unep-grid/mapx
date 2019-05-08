export {mapComposerModalAuto};

function mapComposerModalAuto() {
  var idComposer = 'mapcomposer';
  var oldComposer = document.getElementById(idComposer);

  if (oldComposer) {
    return;
  }

  var map = mx.helpers.getMap();

  var vVisible = mx.helpers.getLayerNamesByPrefix({
    id: map.id,
    prefix: 'MX-',
    base: true
  });

  var items = [];

  items.push({
    type: 'map',
    width:  100,
    height: 50,
    options: {}
  });

  vVisible.forEach((id) => {
    var title = mx.helpers.getViewTitle(id);
    var description = mx.helpers.getViewDescription(id);
    var elLegend = mx.helpers.getViewLegend(id, {clone: true, input: false});

    items.push({
      type: 'legend',
      element: elLegend,
      width: 50,
      height: 50
    });

    items.push({
      type: 'title',
      text: title,
      width: 50,
      height: 20
    });

    items.push({
      type: 'text',
      text: description,
      width: 50,
      height: 20
    });
  });

  var state = {items: items};

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
  return import('./map_composer/index.js').then((m) => {
    state.items.forEach((i) => {
      if (i.type === 'map') {
        Object.assign(i.options, {
          attributionControl: false,
          style: style,
          center: map.getCenter(),
          zoom: map.getZoom()
        });
      }
    });

    var elContainer = mx.helpers.el('div');

    mx.helpers.modal({
      title : 'Map Composer',
      id: idComposer,
      content: elContainer,
      addSelectize : false, 
      onClose: destroy,
      style: {
        position: 'absolute',
        width: '80%',
        height: '100%'
      }
    });

    var mc = new m.MapComposer(elContainer, state);

    function destroy() {
      mc.destroy();
    }

    window.mc = mc;
  });
}
