
/**
 * Get view's source metadata
 * @param {String} id Name/Id of the source layer
 */
export function getSourceMetadata(id, force) {
  var url,
    urlSourceMeta = mx.helpers.getApiUrl('sourceMetadata');

  return new Promise((resolve, reject) => {

    if (!id) {
      return reject('missing id');
    }

    force = force || false;
    url = urlSourceMeta + id + '?date=' + performance.now();

    resolve(url);
  })
    .then(fetch)
    .then((meta) => meta.json())
    .then((meta) => {
      return meta;
    });
}

/**
 * Get view metadata
 * @param {String} id Name/Id of the view
 */
export function getViewMetadata(id, force) {
  var url,
    urlViewMeta = mx.helpers.getApiUrl('viewMetadata');

  return new Promise((resolve, reject) => {
    if (!id) {
      return reject('missing id');
    }

    force = force || false;
    url = urlViewMeta + id + '?date=' + performance.now();

    resolve(url);
  })
    .then(fetch)
    .then((meta) => meta.json())
    .then((meta) => {
      return meta;
    });
}

/**
 * Add source meta object to given view
 * @param {Obejct} view object
 * @param {Boolean} force force / replace meta object
 */
export function addSourceMetadataToView(opt) {
  opt = opt || {};
  var view = opt.view || {};
  var force = opt.forceUpdateMeta || false;
  var idSourceLayer = mx.helpers.path(view, 'data.source.layerInfo.name', '');
  var empty = {};

  if (!idSourceLayer) {
    return Promise.resolve(empty);
  }

  if (view._meta && !force) {
    return Promise.resolve(view._meta);
  }

  return mx.helpers.getSourceMetadata(idSourceLayer, force).then((meta) => {
    /**
     * Save meta in view
     */
    if (meta && meta.text) {
      view._meta = meta;
      return meta;
    } else {
      return empty;
    }
  });
}

export function viewToMetaModal(view) {
  const h = mx.helpers;
  const el = h.el;
  var id = h.isView(view) ? view.id : view;
  view = mx.helpers.getView(id);
  var meta = {};

  getViewMetadata(id, true).then((data) => {
    var elContent = el('div');

    if (data.meta) {
      meta = data.meta;
    }
    meta.id = id;

    var elViewMeta = metaViewToUi(meta);

    if (elViewMeta) {
      elContent.appendChild(elViewMeta);
    }

    if (view._meta) {
      var sourceMeta = view._meta;
      var elSourceMeta = metaSourceToUi(sourceMeta);
      var elDiafTable = metaSourceToDiafUi(sourceMeta);
      
      if (elSourceMeta) {
        elContent.appendChild(elSourceMeta);
      }

      if (elDiafTable) {
        elContent.appendChild(elDiafTable);
      }
    }

    var elTitleModal = el('span', {
      dataset: {
        lang_key: 'meta_view_modal_title'
      }
    });

    var elModal = h.modal({
      title: elTitleModal,
      content: elContent
    });

    h.updateLanguageElements({
      el: elModal
    });
  });
}


export function metaSourceToDiafUi(meta) {
  var h = mx.helpers;
  var el = h.el;
  var elOut = el('div');

  if (!h.isObject(meta) || !h.isObject(meta.integrity)){
    return elOut;
  }

  var diaf = meta.integrity;
  var idsDiaf = Object.keys(diaf);
  var di;

  var ans = {
    '0': 'dont_know',
    '1': 'no',
    '2': 'partial',
    '3': 'yes'
  };
  var desc = function(id) {
    return id + '_desc';
  };

  var elDescBlock = el('span', {
    dataset: {
      lang_key: 'data_integrity_desc'
    }
  });

  var elTableDiaf = el(
    'table',
    {
      class: 'table'
    },
    el(
      'thead',
      el(
        'tr',
        el('th', {
          scope: 'col',
          dataset: {
            lang_key: 'data_integrity_table_key'
          }
        }),
        el('th', {
          scope: 'col',
          class: 'col-md-3',
          dataset: {
            lang_key: 'data_integrity_table_value'
          }
        })
      )
    ),
    el(
      'tbody',
      {
        class: 'table-striped'
      },
      idsDiaf.map((id) => {
        di = diaf[id];
        return el(
          'tr',
          el(
            'td',
            el(
              'div',
              el('bold', {
                dataset: {
                  lang_key: id
                }
              }),
              el('p', {
                class: 'text-muted',
                dataset: {
                  lang_key: desc(id)
                }
              })
            )
          ),
          el('td', {
            class: 'col-33',
            dataset: {
              lang_key: ans[di]
            }
          })
        );
      })
    )
  );

  elOut = el(
    'div',
    {
      class: ['panel', 'panel-default']
    },
    el(
      'div',
      {
        class: ['panel-heading']
      },
      elDescBlock
    ),
    elTableDiaf
  );



  return elOut;
}


function metaViewToUi(meta) {
  const h = mx.helpers;
  const el = h.el;
  const elAuto = h.elAuto;
  const prefixKey = 'meta_view_';

  var tblSummary = h.objectToArray(meta, true);
  var keys = [
    'project_title',
    'projects_titles',
    'classes',
    'collections',
    'readers',
    'editors',
    'stat_n_add',
    'stat_n_distinct_user',
    'date_modified',
    'date_created',
    'id'
  ];

  tblSummary = tblSummary
    .filter((row) => keys.indexOf(row.key) > -1)
    .sort((a,b) => {
      return keys.indexOf(a.key) - keys.indexOf(b.key);
    })
    .map((row) => {
      row.key = prefixKey + row.key; // to match dict labels
      return row;
    });

  return el(
    'div',
    elAuto('array_table', tblSummary, {
      render: 'array_table',
      tableHeadersSkip: true,
      tableTitle: 'meta_view_table_summary_title',
      tableTitleAsLanguageKey: true,
      stringAsLanguageKey: true
    }),
    elAuto('array_table', meta.table_editors, {
      booleanValues: ['✓', ''],
      tableHeadersClasses: ['col-sm-6', 'col-sm-3', 'col-sm-3'],
      tableTitleAsLanguageKey: true,
      tableHeadersLabels: [
        'meta_view_table_editors_email',
        'meta_view_table_editors_changes',
        'meta_view_table_editors_current'
      ],
      tableTitle: 'meta_view_table_editors_title'
    })
  );
}


/**
* Vector source meta data to UI
*/
export function metaSourceToUi(meta) {
  const h = mx.helpers;
  const el = h.el;
  const elAuto = h.elAuto;
  const glfo = h.getLabelFromObjectPath;
  const oToA = h.objectToArray;

  /**
  * Local shortcut
  */
  const p = function(p, d) {
    return h.path(meta, p, d);
  };
  const lfo = function(o, d, p) {
    return glfo({
      obj: o,
      path: p,
      default: d
    });
  };
  const l = function(p, d) {
    return lfo(meta, d, p);
  };

  /**
   * Attributes table
   */
  var tblAttributesRaw = oToA(p('text.attributes', {}), true);
  var attrAlias = p('text.attributes_alias', {});
  var tblAttributes = tblAttributesRaw.map((r) => {
    r.key = el(
      'div',
      el('h5', lfo(attrAlias[r.key], r.key)),
      el('span', {class: ['text-muted']}, r.key)
    );
    r.value = lfo(r.value);
    return r;
  });
  var elTblAttributes = elAuto('array_table', tblAttributes, {
    tableHeadersSkip: true,
    tableTitleAsLanguageKey: true,
    tableTitle: 'attributes_desc_title'
  });

  /**
   * Summary table
   */
  var tblSummary = oToA(
    {
      /**
       * Title with link to the homepage
       */
      title: el(
        'a',
        {
          href: p('origin.homepage.url', null),
          target: '_blank'
        },
        l('text.title')
      ),
      /**
       * Abstract, notes, keywords, languages of the data
       */
      abstract: el('p', l('text.abstract', '-')),
      notes: el('p', l('text.notes', '-')),
      keywords: elAuto('array_string', p('text.keywords.keys', ['-'])),
      languages: elAuto(
        'array_string',
        p('text.language.codes', []).map((l) => l.code),
        {
          stringAsLanguageKey: true
        }
      ),
      /**
       * Contact list with mailto set email
       */
      contacts: el(
        'ul',
        p('contact.contacts', []).map((c) => {
          return el(
            'li',
            el(
              'a',
              {
                href: 'mailto:' + c.email
              },
              el('div', el('span', c.name + ' (' + c.function + ') '))
            ),
            el(
              'span',
              {
                class: 'text-muted'
              },
              c.address
            )
          );
        })
      ),
      /**
       * Temporal meta data
       */
      periodicity: elAuto('string', p('temporal.issuance.periodicity'), {
        stringAsLanguageKey: true
      }),
      released_at: elAuto('date', p('temporal.issuance.released_at', null)),
      modified_at: elAuto('date', p('temporal.issuance.modified_at', null)),
      is_timeless: elAuto('boolean', p('temporal.range.is_timeless', null), {
        booleanValues: ['yes', 'no'],
        stringAsLanguageKey: true
      }),
      start_at: elAuto('date', p('temporal.range.start_at', null)),
      end_at: elAuto('date', p('temporal.range.end_at', null)),
      /**
      * Id 
      */
      id: el('span',p('_idSource'))
    },
    // make an array of object
    true
  );

  var elTblSummary = elAuto('array_table', tblSummary, {
    tableHeadersSkip: true,
    tableTitleAsLanguageKey: true,
    tableTitle: 'table_summary_title', // will be prefixed
    langKeyPrefix: 'meta_source_',
    stringAsLanguageKey: true
  });

  var elMeta = el('div', elTblSummary, elTblAttributes);

  return elMeta;
}


