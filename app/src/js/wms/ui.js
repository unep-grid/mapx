import {isUrl} from './../is_test/index.js';
import {modal} from './../mx_helper_modal.js';
import {moduleLoad} from './../mx_helper_module_loader.js';
import {setBusy} from './../mx_helper_misc.js';
import {el, elSpanTranslate} from './../el_mapx/index.js';
import {wmsGetLayers, urlTile, urlLegend} from './index.js';
import {errorFormater} from '../error_handler/index.js';

export async function wmsBuildQueryUi(opt) {
  opt = Object.assign(
    {},
    {useMirror: false, useCache: false, timestamp: null},
    opt
  );

  await moduleLoad('selectize');
  const elInputTiles = document.querySelector(opt.selectorTileInput);
  const elInputLegend = document.querySelector(opt.selectorLegendInput);
  const elInputAddMirror = document.querySelector(opt.selectorUseMirror);
  const elInputTileSize = document.querySelector(opt.selectorTileSizeInput);

  const elParent =
    document.querySelector(opt.selectorParent) || elInputTile.parentElement;
  const services = opt.services;

  var selectLayer, selectServices;

  if (!elInputTiles || !elInputLegend) {
    return;
  }

  /**
   * Build
   */

  const elSelectServices = el('select', {
    class: 'form-control'
  });
  const elSelectLayer = el('select', {
    class: 'form-control'
  });

  const elSelectServicesGroup = el(
    'div',
    {class: ['form-group']},
    el('label', elSpanTranslate('wms_select_reviewed_service')),
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

  const elButtonGetLayers = el(
    'button',
    {
      class: ['btn', 'btn-default'],
      on: {
        click: getLayers
      }
    },
    elSpanTranslate('wms_btn_get_layers')
  );

  const elInputServiceGroup = el(
    'div',
    {class: ['form-group']},
    el('label', elSpanTranslate('wms_input_service_url')),
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

  const elButtonUpdate = el('button', elSpanTranslate('wms_btn_generate_url'), {
    class: ['btn', 'btn-default'],
    on: {
      click: updateInput
    }
  });

  const elInputLayerGroup = el(
    'div',
    {class: ['form-group']},
    el('label', elSpanTranslate('wms_select_layer')),
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
  function useMirror() {
    return opt.useMirror || elInputAddMirror.checked;
  }

  async function getLayers() {
    busy(true);
    const url = elInputService.value;
    try {
      if (!isUrl(url)) {
        throw new Error('Not a valid url');
      }

      const layers = await wmsGetLayers(url, {
        optGetCapabilities: {
          searchParams: {
            timestamp: opt.timestamp
          },
          useMirror: useMirror(),
          useCache: opt.useCache
        }
      });
      if (layers.length === 0) {
        modal({
          title: 'No layer found',
          content: el('p', `No layer found`),
          addBackground: true
        });
      } else {
        initSelectLayer(layers);
      }
      busy(false);
    } catch (e) {
      busy(false);
      e = errorFormater(e);

      modal({
        title: 'Issue when fetching layers',
        content: el(
          'div',
          el('p', `Issue when fetching layers`),
          el('pre', `${e.message}`)
        ),
        addBackground: true
      });
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
      searchField: ['Name', 'Title', 'Abstract'],
      render: {
        item: function(item, escape) {
          const content = [];
          if (item.Title) {
            content.push(el('span', {class: 'item-label'}, escape(item.Title)));
          }
          if (item.Name) {
            content.push(el('span', {class: 'item-desc'}, escape(item.Name)));
          }
          return el(
            'div',
            {
              class: ['item-desc'],
              title: escape(item.Abstract)
            },
            content
          );
        },
        option: function(item, escape) {
          const content = [];
          if (item.Title) {
            content.push(el('span', {class: 'item-label'}, escape(item.Title)));
          }
          if (item.Name) {
            content.push(el('span', {class: 'item-desc'}, escape(item.Name)));
          }
          return el(
            'div',
            {
              class: ['item-desc'],
              title: escape(item.Abstract)
            },
            content
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
    const layer = $(elSelectLayer).val();
    if (!layer) {
      modal({
        title: 'No layer set',
        content: el('p', 'No layer set: ignoring request'),
        addBackground: true
      });
      return;
    }
    elInputTiles.value = urlTile({
      layer: layer,
      url: elInputService.value,
      width: elInputTileSize.value || 512,
      height: elInputTileSize.value || 512
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
    const valid = isUrl(url);
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

  function busy(busy) {
    if (busy) {
      setBusy(true);
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
      setBusy(false);
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
