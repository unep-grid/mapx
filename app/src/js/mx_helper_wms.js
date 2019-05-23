/* jshint esversion:6 */

export {wmsBuildQueryUi, wmsGetCapabilities, wmsGetLayers};

/**
 * Build the WMS helper component
 *
 * @param {Object} opt Options
 * @param {Sting} opt.selectorParent Id of the parent where to insert the component
 * @param {Array} opt.services Array of default services
 * @param {Sting} opt.selectorTileInput Id of the tile input
 * @param {Sting} opt.selectorLegendInput Id of the legend input
 * @param {Sting} opt.selectorMetaInput Id of the metadata input
 *
 *
 *TODO: event delegation, destroy method
 */
function wmsBuildQueryUi(opt) {
  return mx.helpers.moduleLoad('selectize').then(() => {
    var el = mx.helpers.el;
    var elInputTiles = document.querySelector(opt.selectorTileInput);
    var elInputLegend = document.querySelector(opt.selectorLegendInput);
    var elInputMeta = document.querySelector(opt.selectorMetaInput);
    var elParent =
      document.querySelector(opt.selectorParent) || elInputTile.parentElement;
    var services = opt.services;
    var tt = mx.helpers.getTranslationTag;

    if (!elInputTiles || !elInputLegend || !elInputMeta) {
      return;
    }

    var elSelectServices = el('select', {
      class: 'form-control'
    });
    var elSelectLayer = el('select', {
      class: 'form-control'
    });

    var elSelectServicesGroup = el(
      'div',
      {class: ['form-group']},
      el('label', tt('wms_select_reviewed_service')),
      el('div', elSelectServices)
    );

    var elInputService = el('input', {
      type: 'text',
      class: ['form-control'],
      on: {
        change: initSelectLayer,
        input: checkDisableBtnUpdateLayerList
      }
    });

    var elButtonGetLayers = el('button', tt('wms_btn_get_layers'), {
      class: ['btn', 'btn-default'],
      on: {
        click: getLayers
      }
    });

    var elInputServiceGroup = el(
      'div',
      {class: ['form-group']},
      el('label', tt('wms_input_service_url')),
      el(
        'div',
        {
          class: 'input-group'
        },
        elInputService,
        el(
          'span',
          {
            class: 'input-group-btn'
          },
          elButtonGetLayers
        )
      )
    );

    var elButtonUpdate = el('button', tt('wms_btn_generate_url'), {
      class: ['btn', 'btn-default'],
      on: {
        click: updateInput
      }
    });

    var elInputLayerGroup = el(
      'div',
      {class: ['form-group']},
      el('label', tt('wms_select_layer')),
      elSelectLayer,
      elButtonUpdate
    );

    elParent.appendChild(elSelectServicesGroup);
    elParent.appendChild(elInputServiceGroup);
    elParent.appendChild(elInputLayerGroup);

    /*
     * Add selectize
     */
    var selectLayer;
    var selectServices;

    initSelectServices();
    initSelectLayer();

    /**
     * Local helpers
     */
    function getLayers() {
      setBusy(true);
      wmsGetLayers(elInputService.value)
        .then((layers) => {
          initSelectLayer(layers);
          setBusy(false);
        })
        .catch((e) => {
          setBusy(false);
          throw new Error(e);
        });
    }

    function initSelectLayer(data) {
      data = data || [];
      var def = data[0] && data[0].Name ? data[0].Name : data[0];
      if (typeof selectLayer != 'undefined' && selectLayer.destroy)
        selectLayer.destroy();
      var $elSelectLayer = $(elSelectLayer).selectize({
        options: data,
        onChange: checkDisableBtnUpdate,
        valueField: 'Name',
        labelField: 'Title',
        searchField: ['Name', 'Title'],
        render: {
          item: function(item, escape) {
            return (
              '<div class="item">' +
              (item.Title
                ? '<span class="item-label">' + escape(item.Title) + '</span>'
                : '') +
              (item.Name
                ? '<span class="item-desc">' + escape(item.Name) + '</span>'
                : '') +
              '</div>'
            );
          },
          option: function(item, escape) {
            return (
              '<div class="item">' +
              (item.Title
                ? '<span class="item-label">' + escape(item.Title) + '</span>'
                : '') +
              (item.Name
                ? '<span class="item-desc">' + escape(item.Name) + '</span>'
                : '') +
              '</div>'
            );
          }
        }
      });
      selectLayer = $elSelectLayer[0].selectize;
      selectLayer.setValue(def);
      checkDisableBtnUpdateLayerList();
      checkDisableBtnUpdate();
    }

    function initSelectServices() {
      var $elSelectServices = $(elSelectServices).selectize({
        options: services,
        labelField: 'label',
        valueField: 'value',
        onChange: updateServiceValue
      });
      selectServices = $elSelectServices[0].selectize;
      selectServices.setValue(services[0].value);
      selectServices.refreshOptions();
    }

    function setUrl() {
      var service = $(elSelectServices).val();
      elInputService.value = service;
    }

    function updateInput() {
      elInputTiles.value = urlTile({
        layer: $(elSelectLayer).val(),
        url: elInputService.value,
        width: 512,
        height: 512
      });
      elInputLegend.value = urlLegend({
        url: elInputService.value,
        layer: $(elSelectLayer).val()
      });
      elInputTiles.dispatchEvent(new Event('change'));
      elInputLegend.dispatchEvent(new Event('change'));
    }

    function updateServiceValue(value) {
      elInputService.value = value;
      checkDisableBtnUpdateLayerList();
      initSelectLayer();
    }

    function checkDisableBtnUpdateLayerList() {
      var url = elInputService.value;
      var valid = mx.helpers.isUrl(url);
      if (valid) {
        elButtonGetLayers.removeAttribute('disabled');
      } else {
        elButtonGetLayers.setAttribute('disabled', true);
      }
    }
    function checkDisableBtnUpdate() {
      var layer = $(elSelectLayer).val();
      if (layer) {
        elButtonUpdate.removeAttribute('disabled', false);
      } else {
        elButtonUpdate.setAttribute('disabled', true);
      }
    }

    function setBusy(busy) {
      if (busy) {
        elInputService.setAttribute('disabled', true);
        elButtonGetLayers.setAttribute('disabled', true);
        elButtonUpdate.setAttribute('disabled', true);
        if (selectServices && selectServices.disable) selectServices.disable();
        if (selectLayer && selectLayer.disable) selectLayer.disable();
      } else {
        elInputService.removeAttribute('disabled');
        elButtonGetLayers.removeAttribute('disabled', true);
        elButtonUpdate.removeAttribute('disabled', true);
        if (selectServices && selectServices.enable) selectServices.enable();
        if (selectLayer && selectLayer.enable) selectLayer.enable();
      }
    }
  });
}

function wmsGetCapabilities(baseUrl) {
  var data = {};
  var xmlString = '';
  var url = baseUrl + '?service=WMS&request=GetCapabilities';
  if (!mx.helpers.isUrl(url)) return Promise.resolve(data);

  return fetch(url)
    .then((res) => res.text())
    .then((str) => {
      xmlString = str;
      return mx.helpers.moduleLoad('wms-capabilities');
    })
    .then((WMSCapabilities) => {
      return new WMSCapabilities(xmlString).toJSON();
    })
    .then((data) => {
      return data.Capability;
    });
}

function wmsGetLayers(baseUrl) {
  var layers = [];
  return wmsGetCapabilities(baseUrl).then((Capability) => {
    if (!Capability || !Capability.Layer || !Capability.Layer.Layer)
      return layers;
    var layers = [];
    layerFinder(Capability.Layer, layers);
    return layers;
  });
}

function layerFinder(layer, arr) {
  if (isWmsLayer(layer)) {
    arr.push(layer);
  }
  if (isArray(layer.Layer)) {
    layer.Layer.forEach((layer) => layerFinder(layer, arr));
  }
}

function isWmsLayer(layer) {
  return (
    mx.helpers.isObject(layer) &&
    mx.helpers.isStringRange(layer.Name, 1) &&
    mx.helpers.isStringRange(layer.Title, 1) &&
    mx.helpers.isArray(layer.BoundingBox) &&
    layer.BoundingBox.length > 0
  );
}

function isArray(layer) {
  return mx.helpers.isArray(layer);
}

function urlTile(opt) {
  var query = mx.helpers.objToParams({
    bbox: 'bbx_mapbox',
    service: 'WMS',
    version: '1.1.1',
    styles: '',
    request: 'getMap',
    ZINDEX: 10,
    srs: 'EPSG:3857',
    layers: opt.layer,
    format: 'image/png',
    transparent: true,
    height: opt.height || 512,
    width: opt.width || 512
  });

  // objToParam replace { and }. workaround here
  query = query.replace('bbx_mapbox', '{bbox-epsg-3857}');

  return opt.url + '?' + query;
}

function urlLegend(opt) {
  var query = mx.helpers.objToParams({
    service: 'WMS',
    version: '1.1.1',
    style: '',
    request: 'getLegendGraphic',
    layer: opt.layer,
    format: 'image/png',
    tranparent: true
  });

  return opt.url + '?' + query;
}
/**
 * Query wms layer using mapbox point, layer list and service URL
 * @param {Object} opt Options
 * @param {Object} opt.map Mapbox gl map. Empty, use default
 * @param {Boolean} opt.asObject Return an object of array `{a:[2,1]}` instead of an array of object `[{a:2},{a:1}]`.
 * @param {Object} opt.point Mapbox gl point object
 * @param {Array} opt.layers layer list
 * @param {Array} opt.styles style list
 * @param {String} opt.url Service url
 */
export function queryWms(opt) {
  var h = mx.helpers;
  var map = opt.map || h.getMap();
  var point = opt.point;
  var url = opt.url;
  var modeObject = opt.asObject == true || false;
  var ignoreBbox = true;
  /*
   * Build a bounding box
   */
  var xMax = point.x + 1;
  var xMin = point.x - 1;
  var yMax = point.y + 1;
  var yMin = point.y - 1;
  var sw = map.unproject([xMax, yMin]);
  var ne = map.unproject([xMin, yMax]);
  var minLat = Math.min(sw.lat, ne.lat);
  var minLng = Math.min(sw.lng, ne.lng);
  var maxLat = Math.max(sw.lat, ne.lat);
  var maxLng = Math.max(sw.lng, ne.lng);
  /*
   * Build query string
   */
  var layers = opt.layers;
  var styles = opt.styles;
  var paramsInfo = {
    service: 'WMS',
    request: 'GetFeatureInfo',
    format: 'image/png',
    transparent: true,
    query_layers: layers,
    layers: layers,
    styles: styles,
    info_format: 'application/json',
    exceptions: 'application/json',
    feature_count: 10,
    x: 5,
    y: 5,
    width: 9,
    height: 9,
    src: 'EPSG:4326',
    bbox: minLng + ',' + minLat + ',' + maxLng + ',' + maxLat
  };
  var request = url + '?' + h.objToParams(paramsInfo);

  /**
   * Return fetch promise
   */

  return fetch(request)
    .then((data) => data.json())
    .then((res) => {
      var props = modeObject ? {} : [];

      if (res.exceptions) {
        console.warn(res.exceptions);
        return props;
      }

      res.features.forEach((f) => {
        if (modeObject) {
          for (var p in f.properties) {
            /*
             * Aggregate by attribute
             */
            if (ignoreBbox && p != 'bbox') {
              var value = f.properties[p];
              var values = props[p] || [];
              values = values.concat(value);
              props[p] = values;
            }
          }
        } else {
          /*
           * Raw result
           */
          props.push(f.properties);
        }
      });

      return props;
    });
}
