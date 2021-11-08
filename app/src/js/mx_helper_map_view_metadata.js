import {getGemetConcept, getGemetConceptLink} from './gemet_util/index.js';
import {el, elAuto} from './el_mapx';

/**
 * Get view's source metadata
 * @param {String} id Name/Id of the source layer
 */
export async function fetchSourceMetadata(id) {
  if (!id) {
    return console.warn('getSourceMetaDataRemote : missing id');
  }
  const urlSourceMeta = mx.helpers.getApiUrl('getSourceMetadata');
  const date = performance.now();
  const url = `${urlSourceMeta}${id}?date=${date}`;
  const r = await fetch(url);
  const meta = await r.json();
  return meta;
}

/**
 * Get view metadata
 * @param {String} id Name/Id of the view
 */
export async function fetchViewMetadata(id) {
  const h = mx.helpers;
  if (!id) {
    return console.warn('fetchViewMetadata : missing id');
  }
  const urlViewMeta = h.getApiUrl('getViewMetadata');
  const date = performance.now();
  const url = `${urlViewMeta}${id}?date=${date}`;
  const r = await fetch(url);
  const meta = await r.json();
  return meta;
}

export async function viewToMetaModal(view) {
  const h = mx.helpers;
  const id = h.isView(view) ? view.id : view;
  view = (await h.getView(id)) || (await h.getViewRemote(id));

  if (!h.isView(view)) {
    return h.modal({
      content: 'View not found'
    });
  }

  const meta = {};
  const metaRasterLink = h.path(view, 'data.source.urlMetadata');
  const hasSourceMeta =
    ['rt', 'vt', 'cc'].includes(view.type) &&
    (view._meta || h.path(view, 'data.source.meta', false));

  const elContent = el('div');
  const elTitleModal = el('span', {
    dataset: {lang_key: 'meta_view_modal_title'}
  });

  const elModal = h.modal({
    title: elTitleModal,
    content: elContent,
    addBackground: true,
    style: {
      width: '640px'
    }
  });

  const data = await fetchViewMetadata(id);

  if (data.meta) {
    Object.assign(meta, data.meta);
  }
  meta.id = id;

  const elViewMeta = await metaViewToUi(meta, elModal);

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
    const sourceMeta = view._meta || h.path(view, 'data.source.meta');
    sourceMeta._id_source = view._id_source;
    const elSourceMeta = await metaSourceToUi(sourceMeta);
    if (elSourceMeta) {
      elContent.appendChild(elSourceMeta);
    }
  }
  /**
   * Build menu
   */

  const elFirst = elContent.firstElementChild;
  const elsHeader = elContent.querySelectorAll('.panel-heading');
  const idMenu = h.makeId();
  const elMenu = h.el('div', {class: 'list-group', id: idMenu});
  elContent.insertBefore(elMenu, elFirst);
  for (const elHeader of elsHeader) {
    const idItem = h.makeId();
    elHeader.id = idItem;
    const elBack = h.el('a', {
      class: ['fa', 'fa-chevron-up'],
      href: `#${idMenu}`
    });
    const elText = elHeader.querySelector('span');
    const elItem = h.el('a', {
      class: 'list-group-item',
      href: `#${idItem}`,
      dataset: elText.dataset
    });
    elHeader.appendChild(elBack);
    elMenu.appendChild(elItem);
  }

  /**
   * Update language element
   */

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

async function metaViewToUi(meta, elModal) {
  const h = mx.helpers;
  const prefixKey = 'meta_view_';
  const keys = [
    'title',
    'id',
    'abstract',
    'date_modified',
    'date_created',
    'project_title',
    'projects_titles',
    'collections',
    'readers',
    'editors',
    'stat_n_add',
    'stat_n_add_by_guests',
    'stat_n_add_by_users'
  ];
  const txtDistinct = await h.getDictItem(
    'meta_view_stat_n_add_by_users_distinct'
  );
  const tblSummaryFull = h.objectToArray(meta, true);
  const tblSummary = tblSummaryFull
    .filter((row) => keys.includes(row.key))
    .sort((a, b) => {
      return keys.indexOf(a.key) - keys.indexOf(b.key);
    })
    .map((row) => {
      /**
       * Add distinct user in by_user
       */
      if (row.key === 'stat_n_add_by_users') {
        const rowDistinct = tblSummaryFull.find(
          (row) => row.key === 'stat_n_add_by_distinct_users'
        );
        const valueDistinct = rowDistinct.value;
        row.value = `${row.value} ( ${valueDistinct} ${txtDistinct} )`;
      }
      /**
       * Match sql table with dict labels
       * e.g. "meta_view_"+ "stat_n_add_by_users"
       */

      row.key = prefixKey + row.key; // to match dict labels
      return row;
    });

  /**
   * highcharts needs the container to be rendered
   * to find the size.. Create the container now,
   * render later :
   */
  const elPlot = h.el('div', {
    class: ['panel', 'panel-default'],
    style: {
      width: '100%',
      maxWidth: '100%',
      display: 'flex',
      justifyContent: 'center'
    }
  });
  const elPlotPanel = h.elPanel({
    title: h.elSpanTranslate('meta_view_stat_n_add_by_country'),
    content: elPlot
  });
  setTimeout(() => {
    metaCountByCountryToPlot(meta.stat_n_add_by_country, elPlot, elModal);
  }, 100);

  /*elAuto('array_table', meta.stat_n_add_by_country, {*/
  /*tableHeadersClasses: ['col-sm-9', 'col-sm-3'],*/
  /*tableTitleAsLanguageKey: true,*/
  /*tableHeadersLabels: [*/
  /*'meta_view_stat_n_add_by_country_col_code',*/
  /*'meta_view_stat_n_add_by_country_col_name',*/
  /*'meta_view_stat_n_add_by_country_col_count'*/
  /*],*/
  /*tableTitle: 'meta_view_table_n_add_by_country'*/
  /*}),*/

  return el(
    'div',
    elAuto('array_table', tblSummary, {
      render: 'array_table',
      tableHeadersSkip: true,
      tableTitle: 'meta_view_table_summary_title',
      tableTitleAsLanguageKey: true,
      stringAsLanguageKey: true,
      numberStyle: {marginRight: '5px'}
    }),
    elPlotPanel,
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

function randomTable(n) {
  const ctries = ['CHE', 'COD', 'USA', 'FRE', 'ITA', 'GER', 'COL', 'AFG'];
  const s = [];
  for (let i = 0; i < n; i++) {
    s.push(ctries[Math.floor(Math.random() * ctries.length)]);
  }

  const data = s.map((c, i) => {
    return {
      country: c,
      country_name: c,
      count: Math.floor(Math.random() * 100 * (1 / (i + 1)))
    };
  });
  data.sort((a, b) => b.count - a.count);
  return data;
}

/**
 * Build plot
 * @param {Array} table Array of value [{country:<2 leter code>,contry_name:<string>,count:<integer>},<...>]
 * @param {Element} elPlot Target element
 * @param {Element} elModal Modal element
 * @param {Boolean} useRandom Use rando data ( for dev)
 * @return {Object} Highcharts instance
 */
async function metaCountByCountryToPlot(table, elPlot, elModal, useRandom) {
  const h = mx.helpers;
  try {
    if (h.isEmpty(table)) {
      return;
    }

    const highcharts = await h.moduleLoad('highcharts');
    /**
     * Reads per country, first 20
     */
    if (useRandom) {
      table = randomTable(100);
    }

    const nCountryMap = new Map();
    for (let i = 0, iL = table.length; i < iL; i++) {
      const t = table[i];
      if (!t.country) {
        t.country = '?';
      }
      nCountryMap.set(t.country, t.country_name || t.country || 'Unknown');
    }

    const data = table.map((r) => {
      return {
        name: r.country,
        y: r.count
      };
    });
    if (data.length > 20) {
      const merged = data.splice(20, data.length);
      const sum = merged.reduce((a, d) => a + d.y, 0);
      data.push({
        name: await h.getDictItem('meta_view_stat_others_countries'),
        y: sum
      });
    }

    const txtReads = await h.getDictItem('meta_view_stat_activations');
    const colors = mx.theme.getTheme().colors;

    const chart = highcharts.chart(elPlot, {
      chart: {
        type: 'column',
        height: chartHeight(),
        inverted: true,
        styledMode: false,
        backgroundColor: colors.mx_ui_background,
        plotBackgroundColor: colors.mx_ui_background.color,
        plotBorderWidth: 0,
        plotShadow: false
      },
      title: {
        text: await h.getDictItem('meta_view_stat_n_add_by_country_last_year')
      },
      xAxis: {
        categories: data.map((d) => d.name),
        title: {
          text: null
        }
      },
      yAxis: {
        type: 'logarithmic',
        title: {
          text: await h.getDictItem('meta_view_stat_n_add_by_country_axis')
        }
      },
      legend: {
        enabled: false
      },
      tooltip: {
        formatter: function() {
          return ` ${nCountryMap.get(this.x)} : ${this.y} ${txtReads}`;
        }
      },
      series: [
        {
          name: await h.getDictItem('meta_view_stat_n_add_by_country'),
          data: data
        }
      ],
      credits: {
        enabled: false
      },
      exporting: {
        buttons: {
          contextButton: {
            menuItems: [
              'printChart',
              'separator',
              'downloadPNG',
              'downloadJPEG',
              'downloadSVG',
              'separator',
              'downloadCSV',
              'downloadXLS'
            ]
          }
        }
      }
    });
    if (elModal) {
      let idT = 0;
      elModal.addMutationObserver(() => {
        clearTimeout(idT);
        idT = setTimeout(() => {
          const w = elPlot.getBoundingClientRect().width;
          chart.setSize(w);
        }, 50);
      });
    }

    function chartHeight() {
      return data.length * 20 + 100;
    }
  } catch (e) {
    console.warn(e);
  }
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
  const elLicenses = el(
    'ul',
    p('license.licenses', []).map((lic) =>
      el('li', [el('i', lic.name), el('p', lic.text)])
    )
  );

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
      licenses: elLicenses,
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

/**
 * Given a list of gemet concept id, produce an array of '<li>', with a link to the
 * gemet oncept
 * @param {Array} ids Array of concept id
 * @return {Promise<Array>} Array of '<li>'
 */

async function gemetLi(ids) {
  if (ids.length === 0) {
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
