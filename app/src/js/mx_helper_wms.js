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
async function wmsBuildQueryUi(opt) {
  var selectLayer, selectServices;
  const h = mx.helpers;
  await h.moduleLoad('selectize');
  const el = h.el;
  const elInputTiles = document.querySelector(opt.selectorTileInput);
  const elInputLegend = document.querySelector(opt.selectorLegendInput);
  const elInputMeta = document.querySelector(opt.selectorMetaInput);
  const elParent =
    document.querySelector(opt.selectorParent) || elInputTile.parentElement;
  const services = opt.services;
  const tt = h.getTranslationTag;

  if (!elInputTiles || !elInputLegend || !elInputMeta) {
    return;
  }

  const elSelectServices = el('select', {
    class: 'form-control'
  });
  const elSelectLayer = el('select', {
    class: 'form-control'
  });

  const elSelectServicesGroup = el(
    'div',
    {class: ['form-group']},
    el('label', tt('wms_select_reviewed_service')),
    el('div', elSelectServices)
  );

  const elInputService = el('input', {
    type: 'text',
    class: ['form-control'],
    on: {
      change: initSelectLayer,
      input: checkDisableBtnUpdateLayerList
    }
  });

  const elButtonGetLayers = el('button', tt('wms_btn_get_layers'), {
    class: ['btn', 'btn-default'],
    on: {
      click: getLayers
    }
  });

  const elInputServiceGroup = el(
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

  const elButtonUpdate = el('button', tt('wms_btn_generate_url'), {
    class: ['btn', 'btn-default'],
    on: {
      click: updateInput
    }
  });

  const elInputLayerGroup = el(
    'div',
    {class: ['form-group']},
    el('label', tt('wms_select_layer')),
    elSelectLayer,
    elButtonUpdate
  );

  elParent.appendChild(elSelectServicesGroup);
  elParent.appendChild(elInputServiceGroup);
  elParent.appendChild(elInputLayerGroup);

  initSelectServices();
  initSelectLayer();

  /**
   * Local helpers
   */
  async function getLayers() {
    setBusy(true);
    try {
      const layers = await wmsGetLayers(elInputService.value);
      initSelectLayer(layers);
      setBusy(false);
    } catch (e) {
      setBusy(false);
      throw new Error(e);
    }
  }

  function initSelectLayer(data) {
    data = data || [];
    const def = data[0] && data[0].Name ? data[0].Name : data[0];
    if (typeof selectLayer !== 'undefined' && selectLayer.destroy) {
      selectLayer.destroy();
    }
    const $elSelectLayer = $(elSelectLayer).selectize({
      options: data,
      onChange: checkDisableBtnUpdate,
      valueField: 'Name',
      labelField: 'Title',
      searchField: ['Name', 'Title','Abstract'],
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
           (item.Abstract
              ? '<span class="item-desc">' + escape(item.Abstract) + '</span>'
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
            (item.Abstract
              ? '<span class="item-desc">' + escape(item.Abstract) + '</span>'
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
    const $elSelectServices = $(elSelectServices).selectize({
      options: services,
      labelField: 'label',
      valueField: 'value',
      onChange: updateServiceValue
    });
    selectServices = $elSelectServices[0].selectize;
    selectServices.setValue(services[0].value);
    selectServices.refreshOptions();
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
    const url = elInputService.value;
    const valid = h.isUrl(url);
    if (valid) {
      elButtonGetLayers.removeAttribute('disabled');
    } else {
      elButtonGetLayers.setAttribute('disabled', true);
    }
  }
  function checkDisableBtnUpdate() {
    const layer = $(elSelectLayer).val();
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
      if (selectServices && selectServices.disable) {
        selectServices.disable();
      }
      if (selectLayer && selectLayer.disable) {
        selectLayer.disable();
      }
    } else {
      elInputService.removeAttribute('disabled');
      elButtonGetLayers.removeAttribute('disabled', true);
      elButtonUpdate.removeAttribute('disabled', true);
      if (selectServices && selectServices.enable) {
        selectServices.enable();
      }
      if (selectLayer && selectLayer.enable) {
        selectLayer.enable();
      }
    }
  }
}

async function wmsGetCapabilities(baseUrl) {
  const h = mx.helpers;
  const def = {};
  const url = baseUrl + '?service=WMS&request=GetCapabilities';

  if (!h.isUrlValidWms(url)) {
    return def;
  }

  const WMSCapabilities = await h.moduleLoad('wms-capabilities');
  const xmlString = await h.fetchProgress_xhr(url, {
    maxSize: mx.settings.maxByteFetch
  });
  const data = new WMSCapabilities(xmlString).toJSON();

  return h.path(data, 'Capability', {});
}

async function wmsGetLayers(baseUrl) {
  const layers = [];
  const capability = await wmsGetCapabilities(baseUrl);

  if (!capability || !capability.Layer || !capability.Layer.Layer) {
    return layers;
  }

  layerFinder(capability.Layer, layers);
  return layers;
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
  const h = mx.helpers;
  return (
    h.isObject(layer) &&
    h.isStringRange(layer.Name, 1) &&
    h.isStringRange(layer.Title, 1) &&
    h.isArray(layer.BoundingBox) &&
    layer.BoundingBox.length > 0
  );
}

function isArray(layer) {
  return mx.helpers.isArray(layer);
}

function urlTile(opt) {
  let query = mx.helpers.objToParams({
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
  const query = mx.helpers.objToParams({
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
export async function queryWms(opt) {
  const h = mx.helpers;
  const map = opt.map || h.getMap();
  const point = opt.point;
  const url = opt.url;
  const modeObject = opt.asObject === true || false;
  const ignoreBbox = true;
  /*
   * Build a bounding box
   */
  const xMax = point.x + 5;
  const xMin = point.x - 5;
  const yMax = point.y + 5;
  const yMin = point.y - 5;
  const sw = map.unproject([xMax, yMin]);
  const ne = map.unproject([xMin, yMax]);
  const minLat = Math.min(sw.lat, ne.lat);
  const minLng = Math.min(sw.lng, ne.lng);
  const maxLat = Math.max(sw.lat, ne.lat);
  const maxLng = Math.max(sw.lng, ne.lng);
  /*
   * Build query string
   */
  const layers = opt.layers;
  const styles = opt.styles;
  const props = modeObject ? {} : [];
  const paramsInfo = {
    version: '1.1.1',
    service: 'WMS',
    request: 'GetFeatureInfo',
    query_layers: layers,
    layers: layers,
    styles: styles,
    info_format: 'application/json',
    exceptions: 'application/vnd.ogc.se_xml',
    feature_count: 10,
    x: 5,
    y: 5,
    width: 9,
    height: 9,
    srs: 'EPSG:4326',
    bbox: minLng + ',' + minLat + ',' + maxLng + ',' + maxLat
  };
  /**
   * Return fetch promise
   */
  const cap = await wmsGetCapabilities(url);

  /**
   * Update formats using capabilities
   */
  const allowedFormatsInfo = ['application/json', 'application/geojson'];
  const formatsInfo = h.path(cap, 'Request.GetFeatureInfo.Format', []);
  const layersAll = h.path(cap, 'Layer.Layer', []);
  paramsInfo.info_format = allowedFormatsInfo.reduce((a, f) => {
    return !a ? (formatsInfo.indexOf(f) > -1 ? f : a) : a;
  }, null);
  paramsInfo.exception = h.path(cap, 'Exception', [])[1];

  /**
   * Test if layer is queryable
   */
  const layersQueryable = layersAll.reduce((a, l) => {
    const isQueryable =
      (layers.indexOf(l.Name) > -1 && l.queryable === true) ||
      h.isArray(l.Layer)
        ? l.Layer.reduce((a, ll) => {
            return a ? a : ll.queryable;
          }, false)
        : false;

    if (isQueryable) {
      a.push(l);
    }
    return a;
  }, []);

  /**
   * Validate
   */
  const validLayer = layersQueryable.length > 0;
  const validInfo = h.isString(paramsInfo.info_format);
  const validException = h.isString(paramsInfo.exception);

  /**
   * Fetch or stop here
   */
  const request = `${url}?${h.objToParams(paramsInfo)}`;

  if (!validException || !validLayer || !validInfo) {
    console.warn({
      'Request not fetched': request,
      'Valid exception format': validException,
      'Valid (queryable) layer': validLayer,
      'Valid info format': validInfo
    });
    throw new Error(
      `Operation not permited by the requested server or layer, check console for details`
    );
  }

  const response = await fetch(request);

  if (response.exceptions) {
    console.warn(res.exceptions);
    return props;
  }

  const data = await response.json();

  data.features.forEach((f) => {
    if (modeObject) {
      for (let p in f.properties) {
        /*
         * Aggregate by attribute
         */
        if (ignoreBbox && p !== 'bbox') {
          let value = f.properties[p];
          let values = props[p] || [];
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
}
