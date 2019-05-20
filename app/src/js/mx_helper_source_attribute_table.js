export function getSourceTableAttribute(opt) {
  var h = mx.helpers;
  var host = h.getApiUrl('getSourceTableAttribute');

  var url =
    host +
    '?' +
    h.objToParams({
      id: opt.idSource,
      attributes: opt.attributes
    });

  return h
    .fetchProgress(url, {
      onProgress: onProgressData,
      onError: onProgressError,
      onComplete: onProgressDataComplete
    })
    .then((data) => {
      return data.json();
    });
}

export function showSourceTableAttributeModal(opt) {
  var h = mx.helpers;
  var el = h.el;
  var hot;
  var mutationObserver;
  var labels = opt.labels || null;
  var settings = {
    idSource: opt.idSource,
    attributes: opt.attributes,
    view: opt.view
  };

  onProgressStart();

  return Promise.all([
    h.moduleLoad('handsontable'),
    getSourceTableAttribute(settings)
  ]).then((m) => {
    var handsontable = m[0];
    var data = m[1];
    var hasData = h.isArray(data) && data.length > 0;
    var license = 'non-commercial-and-evaluation';
    var elTable = el('div', {
      style: {
        width: '100%',
        height: '100%',
        minHeight: '350px',
        minWidth: '100px',
        overflow: 'hidden',
        backgroundColor: 'var(--mx_ui_shadow)'
      }
    });
    var elButtonDownload = el(
      'button',
      {
        class: 'btn btn-default',
        on: {
          click: handleDownload
        }
      },
      'Export CSV'
    );
    var elButtonClearFilter = el(
      'button',
      {
        class: 'btn btn-default',
        on: {
          click: handleClearFilter
        }
      },
      'Clear filter'
    );
    var elTitle = el('div');

    if (!hasData) {
      elTable = el('span', 'no data');
    }

    var elModal = h.modal({
      title: elTitle,
      content: elTable,
      onClose: destroy,
      buttons: [elButtonDownload, elButtonClearFilter]
    });

    mutationObserver = listenMutationAttribute(elModal, tableRender);

    if (!hasData) {
      return;
    }

    /*
     * NOTE: get this from postgres
     */
    var columns = opt.attributes.map((a) => {
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
      afterFilter: handleViewFilter
    });

    addTitle();
    onProgressEnd();

    /**
     * Helpers
     */

    function handleDownload() {
      var exportPlugin = hot.getPlugin('exportFile');

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
      var filterPlugin = hot.getPlugin('filters');
      filterPlugin.clearConditions();
      filterPlugin.filter();
      hot.render();
    }

    function addTitle() {
      var view = settings.view;
      if (!h.isView(view)) {
        return;
      }
      var title = h.getViewTitle(view);
      h.getDictItem('tbl_attr_modal_title')
        .then((t) => {
          elTitle.innerText = t + ' – ' + title;
        })
        .catch((e) => consol.warn(e));
    }

    function tableRender() {
      if (hot && hot.render) {
        hot.render();
      }
    }

    function destroy() {
      hot.destroy();
      if (mutationObserver) {
        mutationObserver.disconnect();
      }
      var view = settings.view;
      if (!h.isView(view)) {
        return;
      }
      view._setFilter({
        type: 'attribute_table',
        filter: []
      });
    }

    function handleViewFilter() {
      var idCol = 'gid';
      var view = settings.view;
      if (!h.isView(view)) {
        return;
      }
      var data = hot.getData();
      var attr = settings.attributes;
      var posGid = attr.indexOf(idCol);
      if (posGid > -1) {
        var ids = data.map((d) => d[posGid]);

        view._setFilter({
          type: 'attribute_table',
          filter: ['in', 'gid'].concat(ids)
        });
      }
    }
  });
}

export function viewToTableAttributeModal(idView) {
  var h = mx.helpers;
  var view = h.getViews({
    id: mx.settings.idMapDefault,
    idView: idView
  });
  var opt = getTableAttributeConfigFromView(view);
  return showSourceTableAttributeModal(opt);
}

function getTableAttributeConfigFromView(view) {
  var h = mx.helpers;
  var language = mx.settings.language;

  if (view.type !== 'vt' || !view._meta) {
    console.warn('Only vt view with ._meta are supported');
    return null;
  }
  var idSource = h.path(view, 'data.source.layerInfo.name');
  var attributes = h.path(view, 'data.attribute.names') || [];
  var attribute = h.path(view, 'data.attribute.name');
  attributes = h.isArray(attributes) ? attributes : [attributes];
  attributes = attributes.concat(attribute);
  attributes = attributes.concat(['gid']);
  attributes = h.getArrayStat({arr: attributes, stat: 'distinct'});
  var labelsDict = h.path(view, '_meta.text.attributes_alias') || {};
  var labels = attributes.map((a) => {
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
  var lang = mx.settings.language;
  var languages = {
    de: 'de-DE',
    es: 'es-MX',
    fr: 'fr-FR',
    ru: 'ru-RU',
    zh: 'zh-CN'
  };
  return languages[lang] || 'en-US';
}

function listenMutationAttribute(el, cb) {
  var h = mx.helpers;
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
  var h = mx.helpers;
  h.progressScreen({
    percent: 1,
    id: 'fetch_data',
    text: 'Init, please wait',
    enable: true
  });
}
function onProgressData(data) {
  var h = mx.helpers;
  h.progressScreen({
    percent: (data.loaded / data.total) * 100 - 1,
    id: 'fetch_data',
    text: 'Fetching Data',
    enable: true
  });
}
function onProgressDataComplete(data) {
  var h = mx.helpers;
  if (data.loaded !== data.total) {
    console.log('FetchProgress : data seems incomplete', data);
  }
  h.progressScreen({
    text: 'Data downloaded, build table',
    enable: true,
    percent: 99,
    id: 'fetch_data'
  });
}
function onProgressEnd() {
  var h = mx.helpers;
  h.progressScreen({
    enable: false,
    percent: 100,
    id: 'fetch_data'
  });
}
function onProgressError(data) {
  onEnd();
  alert(data.message);
}
