export function getSourceTableAttribute(opt) {
  let h = mx.helpers;
  let host = h.getApiUrl('getSourceTableAttribute');

  let url =
    host +
    '?' +
    h.objToParams({
      id: opt.idSource,
      attributes: opt.attributes
    });

  return h.fetchJsonProgress(url, {
    onProgress: onProgressData,
    onError: onProgressError,
    onComplete: onProgressDataComplete
  });
}

export function showSourceTableAttributeModal(opt) {
    if(!opt || !opt.idSource ){
    return Promise.resolve(false);
  }
  let h = mx.helpers;
  let el = h.el;
  let hot;
  let mutationObserver;

  let labels = opt.labels || null;
  let settings = {
    idSource: opt.idSource,
    attributes: opt.attributes,
    view: opt.view
  };

  onProgressStart();

  return Promise.all([
    h.moduleLoad('handsontable'),
    h.getSourceMetadata(settings.idSource),
    h.getSourceTableAttribute(settings),
  ]).then((m) => {
    let handsontable = m[0];
    let meta = m[1] || {};
    let data = m[2] || {};
    let services = meta._services || [];
    let hasData = h.isArray(data) && data.length > 0;
    let license = 'non-commercial-and-evaluation';
    let elTable = el('div', {
      style: {
        width: '100%',
        height: '350px',
        minHeight: '350px',
        minWidth: '100px',
        overflow: 'hidden',
        backgroundColor: 'var(--mx_ui_shadow)'
      }
    });
    let allowDownload = services.indexOf('mx_download') > -1;
    let elButtonDownload = el(
      'button',
      {
        class: 'btn btn-default',
        on: {
          click: handleDownload
        },
        title : allowDownload ? 'Download' : "Download disabled"
      },
      'Export CSV'
    );
    if(!allowDownload){
      elButtonDownload.setAttribute('disabled',true);
    }
    let elButtonClearFilter = el(
      'button',
      {
        class: 'btn btn-default',
        disabled : true,
        on: {
          click: handleClearFilter
        }
      },
      'Clear filter'
    );
    let elTitle = el('div');
    let buttons = [elButtonClearFilter, elButtonDownload];
    if (!hasData) {
      elTable = el('span', 'no data');
      buttons = null;
    }

    let elModal = h.modal({
      title: elTitle,
      content: elTable,
      onClose: destroy,
      buttons: buttons
    });

    mutationObserver = listenMutationAttribute(elModal, tableRender);

    if (!hasData) {
      onProgressEnd();
      return;
    }

    /*
     * NOTE: get this from postgres
     */
    let columns = opt.attributes.map((a) => {
      return {
        type: typeof data[0][a] === 'number' ? 'numeric' : 'text',
        data: a,
        readOnly: true
      };
    });

    hot = new handsontable(elTable, {
      columns: columns,
      data: data,
      rowHeaders: true,
      columnSorting: true,
      colHeaders: labels,
      licenseKey: license,
      dropdownMenu: [
        'filter_by_condition',
        'filter_operators',
        'filter_by_condition2',
        'filter_action_bar'
      ],
      filters: true,
      language: getHandsonLanguageCode(),
      afterFilter: handleViewFilter,
      renderAllRows: false,
      height: function() {
        let r = elTable.getBoundingClientRect();
        return r.height - 30;
      },
      disableVisualSelection: !allowDownload
    });

    addTitle();
    onProgressEnd();

    /**
     * Helpers
     */

    function handleDownload() {
      if(!allowDownload){
        return;
      }
      let exportPlugin = hot.getPlugin('exportFile');

      exportPlugin.downloadFile('csv', {
        bom: false,
        columnDelimiter: ',',
        columnHeaders: true,
        exportHiddenColumns: false,
        exportHiddenRows: false,
        fileExtension: 'csv',
        filename: 'mx_attribute_table',
        mimeType: 'text/csv',
        rowDelimiter: '\r\n',
        rowHeaders: false
      });
    }

    function handleClearFilter() {
      let filterPlugin = hot.getPlugin('filters');
      filterPlugin.clearConditions();
      filterPlugin.filter();
      hot.render();
      elButtonClearFilter.setAttribute('disabled',true);
    }

    function addTitle() {
      let view = settings.view;
      if (!h.isView(view)) {
        return;
      }
      let title = h.getViewTitle(view);
      h.getDictItem('tbl_attr_modal_title')
        .then((t) => {
          elTitle.innerText = t + ' – ' + title;
        })
        .catch((e) => consol.warn(e));
    }

    function tableRender() {
      if (hot && hot.render) {
        let elParent = elTable.parentElement;
        let pStyle = getComputedStyle(elParent);
        let pad = parseFloat(pStyle.paddingTop) + parseFloat(pStyle.paddingBottom);
        let height = elParent.getBoundingClientRect().height;
        if (height > 350) {
          elTable.style.height = height - pad + 'px';
          hot.render();
        }
      }
    }

    function destroy() {
      if (hot) {
        hot.destroy();
      }
      if (mutationObserver) {
        mutationObserver.disconnect();
      }
      let view = settings.view;
      if (!h.isView(view)) {
        return;
      }
      view._setFilter({
        type: 'attribute_table',
        filter: []
      });
    }

    function handleViewFilter() {
      let idCol = 'gid';
      let view = settings.view;
      if (!h.isView(view)) {
        return;
      }
      let data = hot.getData();
      let attr = settings.attributes;
      let posGid = attr.indexOf(idCol);
      if (posGid > -1) {
        let ids = data.map((d) => d[posGid]);
        elButtonClearFilter.removeAttribute('disabled');
        view._setFilter({
          type: 'attribute_table',
          filter: ['in', 'gid'].concat(ids)
        });
      }
    }
  });
}

export function viewToTableAttributeModal(idView) {
  let h = mx.helpers;
  let view = h.getView(idView);
  let opt = getTableAttributeConfigFromView(view);
  return showSourceTableAttributeModal(opt);
}

export function getTableAttributeConfigFromView(view) {
  let h = mx.helpers;
  let language = mx.settings.language;

  if (view.type !== 'vt' || !view._meta) {
    console.warn('Only vt view with ._meta are supported');
    return null;
  }
  let idSource = h.path(view, 'data.source.layerInfo.name');
  let attributes = h.path(view, 'data.attribute.names') || [];
  let attribute = h.path(view, 'data.attribute.name');
  attributes = h.isArray(attributes) ? attributes : [attributes];
  attributes = attributes.concat(attribute);
  attributes = attributes.concat(['gid']);
  attributes = h.getArrayStat({arr: attributes, stat: 'distinct'});
  let labelsDict = h.path(view, '_meta.text.attributes_alias') || {};
  let labels = attributes.map((a) => {
    return labelsDict[a] ? labelsDict[a][language] || labelsDict[a].en || a : a;
  });

  return {
    view: view,
    idSource: idSource,
    labels: labels,
    attributes: attributes
  };
}

function getHandsonLanguageCode() {
  let lang = mx.settings.language;
  let languages = {
    de: 'de-DE',
    es: 'es-MX',
    fr: 'fr-FR',
    ru: 'ru-RU',
    zh: 'zh-CN'
  };
  return languages[lang] || 'en-US';
}

function listenMutationAttribute(el, cb) {
  let h = mx.helpers;
  cb = h.isFunction(cb) ? h.debounce(cb, 100) : console.log;

  let observer = new MutationObserver((m) => {
    cb(m);
  });

  observer.observe(el, {
    attributes: true
  });
  return observer;
}
function onProgressStart() {
  let h = mx.helpers;
  h.progressScreen({
    percent: 1,
    id: 'fetch_data',
    text: 'Init, please wait',
    enable: true
  });
}
function onProgressData(data) {
  let h = mx.helpers;
  h.progressScreen({
    percent: (data.loaded / data.total) * 100 - 1,
    id: 'fetch_data',
    text: 'Fetching Data',
    enable: true
  });
}
function onProgressDataComplete() {
  let h = mx.helpers;
  h.progressScreen({
    text: 'Data downloaded. Build table',
    enable: true,
    percent: 99,
    id: 'fetch_data'
  });
}
function onProgressEnd() {
  let h = mx.helpers;
  h.progressScreen({
    enable: false,
    percent: 100,
    id: 'fetch_data'
  });
}
function onProgressError(data) {
  onProgressEnd();
  alert(data.message);
}
