import {getGemetConcept, getGemetConceptLink} from './gemet_util/index.js';
import {el, elAuto} from './el_mapx';


/**
* Given a list of gemet concept id, produce an array of '<li>', with a link to the
* gemet oncept
* @param {Array} ids Array of concept id
* @return {Array} Array of '<li>'
*/ 
async function gemetLi(ids) {
  if(ids.length === 0){
     return null;
  }
  const concepts = await getGemetConcept(ids);
  const lis = concepts.map((k) => {
   return el(
      'li',
      el(
        'a',
        {
          target: '_blank',
          href: getGemetConceptLink(k.concept)
        },
        k.label
      )
    );
  });
  return lis;
}

/**
 * Get view's source metadata
 * @param {String} id Name/Id of the source layer
 */
export async function getSourceMetadata(id, force) {
  const urlSourceMeta = mx.helpers.getApiUrl('getSourceMetadata');
  if (!id) {
    return console.warn('getSourceMetadata : missing id');
  }
  force = force || false;
  const url = urlSourceMeta + id + '?date=' + performance.now();
  const r = await fetch(url);
  const meta = await r.json();
  return meta;
}

/**
 * Get view metadata
 * @param {String} id Name/Id of the view
 */
export async function getViewMetadata(id, force) {
  const urlViewMeta = mx.helpers.getApiUrl('getViewMetadata');
  if (!id) {
    return console.warn('getSourceMetadata : missing id');
  }
  force = force || false;
  const url = urlViewMeta + id + '?date=' + performance.now();
  const r = await fetch(url);
  const meta = await r.json();
  return meta;
}

/**
 * Add source meta object to given view
 * @param {Obejct} view object
 * @param {Boolean} force force / replace meta object
 */
export async function addSourceMetadataToView(opt) {
  opt = opt || {};
  const view = opt.view || {};
  const force = opt.forceUpdateMeta || false;
  const idSourceLayer = mx.helpers.path(view, 'data.source.layerInfo.name', '');
  const empty = {};

  if (!idSourceLayer) {
    return empty;
  }

  if (view._meta && !force) {
    view._meta;
  }
  const meta = await getSourceMetadata(idSourceLayer, force);
  /**
   * Save meta in view
   */
  if (meta && meta.text) {
    view._meta = meta;
    return meta;
  } else {
    return empty;
  }
}

export async function viewToMetaModal(view) {
  const h = mx.helpers;
  const id = h.isView(view) ? view.id : view;
  view = h.getView(id) || (await h.getViewRemote(id));
  const meta = {};
  const metaRasterLink = h.path(view, 'data.source.urlMetadata');
  const hasSourceMeta =
    ['rt', 'vt', 'cc'].indexOf(view.type) > -1 &&
    (view._meta || h.path(view, 'data.source.meta'));

  const data = await getViewMetadata(id, true);

  const elContent = el('div');

  if (data.meta) {
    Object.assign(meta, data.meta);
  }

  meta.id = id;

  const elViewMeta = metaViewToUi(meta);

  if (elViewMeta) {
    elContent.appendChild(elViewMeta);
  }

  if (metaRasterLink) {
    const elRasterMetaLink = metaSourceRasterToUi({
      url: metaRasterLink
    });
    if (elRasterMetaLink) {
      elContent.appendChild(elRasterMetaLink);
    }
  }

  if (hasSourceMeta) {
    const sourceMeta = view._meta || view.data.source.meta;
    const elSourceMeta = await metaSourceToUi(sourceMeta);
    if (elSourceMeta) {
      elContent.appendChild(elSourceMeta);
    }
  }

  const elTitleModal = el('span', {
    dataset: {
      lang_key: 'meta_view_modal_title'
    }
  });

  const elModal = h.modal({
    title: elTitleModal,
    content: elContent,
    addBackground: true
  });

  h.updateLanguageElements({
    el: elModal
  });
}

export function metaSourceRasterToUi(rasterMeta) {
  const h = mx.helpers;

  rasterMeta = rasterMeta || {};

  if (!h.isUrl(rasterMeta.url)) {
    return el('div');
  }

  rasterMeta = h.objectToArray(
    {
      meta_view_raster_meta: rasterMeta.url
    },
    true
  );

  return elAuto('array_table', rasterMeta, {
    render: 'array_table',
    tableHeadersSkip: true,
    tableTitle: 'meta_view_raster_meta',
    tableTitleAsLanguageKey: true,
    stringAsLanguageKey: true,
    urlDefaultLabel: 'Link'
  });
}

function metaViewToUi(meta) {
  const h = mx.helpers;
  const prefixKey = 'meta_view_';
  const keys = [
    'project_title',
    'projects_titles',
    'collections',
    'readers',
    'editors',
    'stat_n_add',
    'stat_n_distinct_user',
    'date_modified',
    'date_created',
    'id'
  ];

  let tblSummary = h.objectToArray(meta, true);

  tblSummary = tblSummary
    .filter((row) => keys.indexOf(row.key) > -1)
    .sort((a, b) => {
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
export async function metaSourceToUi(meta) {
  const h = mx.helpers;
  const glfo = h.getLabelFromObjectPath;
  const oToA = h.objectToArray;

  /**
   * Path to meta object
   */
  const p = function(p, d) {
    return h.path(meta, p, d);
  };
  /**
   * Label from object path
   */
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
  const tblAttributesRaw = oToA(p('text.attributes', {}), true);
  const attrAlias = p('text.attributes_alias', {});
  const tblAttributes = tblAttributesRaw.map((r) => {
    r.key = el(
      'div',
      el('h5', lfo(attrAlias[r.key], r.key)),
      el('span', {class: ['text-muted']}, r.key)
    );
    r.value = lfo(r.value);
    return r;
  });
  const elTblAttributes = elAuto('array_table', tblAttributes, {
    tableHeadersSkip: true,
    tableTitleAsLanguageKey: true,
    tableTitle: 'attributes_desc_title'
  });

  const urlHomepage = p('origin.homepage.url', '');
  const urlSources = p('origin.source.urls', []).map((d) => d.url);
  const urlAnnexes = p('annex.references', []).map((d) => d.url);
  const hasHomepage = h.isUrl(urlHomepage);

  const elHomepage = hasHomepage
    ? el(
        'a',
        {
          target: '_blank',
          href: urlHomepage
        },
        'Link'
      )
    : el('span');

  const elSourceUrl = el(
    'ul',
    urlSources.map((url) => {
      if (!h.isUrl(url)) {
        return;
      }
      let hostname = new URL(url).hostname;
      return el(
        'li',
        el(
          'a',
          {
            target: '_blank',
            href: url
          },
          hostname
        )
      );
    })
  );
  const elAnnexesUrl = el(
    'ul',
    urlAnnexes.map((url) => {
      if (!h.isUrl(url)) {
        return;
      }
      let hostname = new URL(url).hostname;
      return el(
        'li',
        el(
          'a',
          {
            target: '_blank',
            href: url
          },
          hostname
        )
      );
    })
  );

  const elTitle = el('span', l('text.title'));

  const elAbstract = el('p', l('text.abstract', '-'));
  const elNotes = el('p', l('text.notes', '-'));
  const elKeywords = elAuto('array_string', p('text.keywords.keys', ['-']));

  const elKeywordsM49 = el(
    'ul',
    p('text.keywords.keys_m49', []).map((k) => el('li', h.getDictItem(k)))
  );

  const elKeywordsGemet = el(
    'ul',
     await gemetLi(p('text.keywords.keys_gemet', []))
  );

  const elLanguages = elAuto(
    'array_string',
    p('text.language.codes', []).map((l) => l.code),
    {
      stringAsLanguageKey: true
    }
  );

  const elContacts = el(
    'ul',
    p('contact.contacts', []).map((c) => {
      return el(
        'li',
        el(
          'a',
          {
            href: 'mailto:' + c.email
          },
          el(
            'div',
            el('span', c.name + (c.function ? ' ( ' + c.function + ' ) ' : ''))
          )
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
  );
  const elPeriodicity = elAuto('string', p('temporal.issuance.periodicity'), {
    stringAsLanguageKey: true
  });
  const elReleasedAt = elAuto('date', p('temporal.issuance.released_at', null));
  const elModifiedAt = elAuto('date', p('temporal.issuance.modified_at', null));
  const elIsTimeless = elAuto(
    'boolean',
    p('temporal.range.is_timeless', null),
    {
      booleanValues: ['yes', 'no'],
      stringAsLanguageKey: true
    }
  );
  const elStartAt = elAuto('date', p('temporal.range.start_at', null));

  const elEndAt = elAuto('date', p('temporal.range.end_at', null));
  const elId = el('span', p('_id_source'));
  /**
   * Summary table
   */
  const tblSummary = oToA(
    {
      title: elTitle,
      abstract: elAbstract,
      notes: elNotes,
      keywords: elKeywords,
      keywords_m49: elKeywordsM49,
      keywords_gemet: elKeywordsGemet,
      languages: elLanguages,
      contacts: elContacts,
      homepage: elHomepage,
      url_download: elSourceUrl,
      url_annexes: elAnnexesUrl,
      periodicity: elPeriodicity,
      released_at: elReleasedAt,
      modified_at: elModifiedAt,
      is_timeless: elIsTimeless,
      start_at: elStartAt,
      end_at: elEndAt,
      id: elId
    },
    // make an array of object
    true
  );

  const elTblSummary = elAuto('array_table', tblSummary, {
    tableHeadersSkip: true,
    tableTitleAsLanguageKey: true,
    tableTitle: 'table_summary_title', // will be prefixed
    langKeyPrefix: 'meta_source_',
    stringAsLanguageKey: true
  });

  const elMeta = el('div', elTblSummary, elTblAttributes);

  return elMeta;
}
