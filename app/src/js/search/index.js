import {el, elSpanTranslate, elButtonIcon} from '../el_mapx/index.js';
import {viewsListAddSingle} from './../mx_helper_map_view_ui.js';
import {ButtonCircle} from './../icon_flash';
import {modalConfirm} from './../mx_helper_modal.js';
import {
  zoomToViewId,
  getView,
  getViewRemote,
  viewAdd,
  viewRemove,
  getViewsOpen
} from './../mx_helper_map.js';

import {storyRead} from './../mx_helper_story.js';

import {viewToMetaModal} from './../mx_helper_map_view_metadata.js';
import {getDictItem} from './../mx_helper_language.js';
import {EventSimple} from './../listener_store';
import {
  isStory,
  isView,
  isArray,
  isStringRange,
  isBoolean,
  isUndefined
} from './../is_test/index.js';

import {def} from './default.js';
class Search extends EventSimple {
  constructor(opt) {
    super();
    const s = this;
    s.setOpt(opt);
    return s;
  }

  async initCheck() {
    const s = this;
    if (s._init) {
      return;
    }
    s._init = true;

    /**
     * Dynamic import
     */
    import('./style.less');
    import('./style_flatpickr.less');

    s._MeiliSearch = (await import('meilisearch')).MeiliSearch;
    s._flatpickr = (await import('flatpickr')).default;
    s._flatpickr_langs = await import('./flatpickr_locales');
    s._elContainer = document.querySelector(s.opt('container'));
    s._meili = new s._MeiliSearch({
      host: `${s.opt('protocol')}${s.opt('host')}:${s.opt('port')}`,
      apiKey: s.opt('key') || null
    });

    /**
     * Build ui
     */
    await s.setLanguage();
    await s.build();

    /*
     * Autocomplete (mhé)
     */
    if (s.opt('autocomplete')) {
      s.Tribute = (await import('tributejs')).default;
      import('./style_tribute.less');
      s._init_tribute(s._elInput, s._elInputContainer);
    }

    s.fire('ready');
    return s;
  }

  opt(k) {
    return this._opt[k];
  }

  setOpt(opt) {
    const s = this;
    if (!s._opt) {
      s._opt = def;
    }
    Object.assign(s._opt, opt);
    s.fire('options_update', opt);
  }

  get isReady() {
    return !!this._init;
  }

  async setLanguage(lang) {
    const s = this;
    if (lang) {
      s.setOpt({language: lang});
    }
    await s.setIndex();
    await s.setLocaleFlatpickr();
  }

  async setLocaleFlatpickr(lang) {
    const s = this;
    if (!lang) {
      lang = s.opt('language');
    }
    if (!s._flatpickr_langs) {
      return;
    }

    /**
     * The module returns key with full language name.. e.g. "Russian".
     * instead of language code.
     * -> `locs.default[lang]` as workaround ?
     */

    const locs = await s._flatpickr_langs[lang]();
    let loc = s._flatpickr.l10ns.default;

    if (locs) {
      const locLang = locs.default[lang];
      if (locLang) {
        loc = locLang;
      }
    }
    if (loc) {
      s._flatpickr.localize(loc);
    }
    if (s._flatpickr_filters) {
      for (let f of s._flatpickr_filters) {
        f.set('locale', lang);
      }
    }
  }

  async setIndex(id) {
    const s = this;
    if (!id) {
      id = s.template(s.opt('index_template'));
    }
    s.setOpt({index: id});
    if (!s._meili) {
      return;
    }
    s._index = await s._meili.getIndex(id);
  }

  async build() {
    const s = this;
    if (s._built) {
      return;
    }
    s._built = true;

    /**
     * Result and pagination
     */

    s._elResults = el('div', {class: ['search--results']});
    s._elPagination = el('div', {class: ['search--pagination']});

    /**
     * Filters and facet
     */
    s._elFiltersFacets = el('div', {class: 'search--filter-facets'});
    s._elFiltersDate = el('div', {class: 'search--filter-dates'});
    s._elFilters = el(
      'div',
      {
        class: ['search--filters', 'search--hidden']
      },
      s._elFiltersFacets,
      s._elFiltersDate
    );

    /**
     * Stats
     */
    s._elStatHits = el('span', {
      class: ['search--stats-item']
    });
    s._elStats = el(
      'div',
      {
        class: ['search--stats']
      },
      s._elStatHits
    );

    /**
     * Search header
     */

    s._elHeader = el(
      'div',
      {
        class: 'search--header'
      },
      await s._build_input({
        key_label: 'search_title',
        key_placeholder: 'search_placeholder'
      }),
      s._elFilters
    );

    /**
     * Search complete
     */

    s._elSearch = el(
      'div',
      {
        class: ['search--container'],
        on: ['click', s._handle_click.bind(s)]
      },
      s._elHeader,
      s._elResults,
      s._elPagination,
      s._elStats
    );

    s._elContainer.appendChild(s._elSearch);

    /**
     * Filters
     */
    s._filters = {};
    await s._build_filter_date();
  }

  _update_facets(distrib) {
    const s = this;
    const attrKeys = s.opt('keywords').map((k) => k.type);

    for (let attr of attrKeys) {
      /**
       * source_keyword, source_keywords_m49, view_type
       */
      const tags = distrib[attr];
      for (let tag in tags) {
        if (tag) {
          const k = `${attr}:${tag}`;
          /**
           * Label or key, e.g. vt, environment, global
           */
          const count = tags[tag];
          const facet = s._facets[k];
          facet.count = count;
        }
      }
    }
    /**
     * Scroll facet container: update change the order, with most frequent
     * at top.
     */

    for (let elItems of s._facets_containers) {
      elItems.scrollTo = 0;
    }
  }

  _build_facets(distrib) {
    if (!distrib) {
      console.warn('No facet distribution');
      return el('span', '');
    }
    const s = this;
    s._facets = {};
    s._facets_containers = [];
    const attrKeys = s.opt('keywords').map((k) => k.type);
    const frag = new DocumentFragment();

    for (let attr of attrKeys) {
      /**
       * source_keyword, source_keywords_m49, view_type
       */
      let elFacetItems;
      const elFacetGroup = el(
        'div',
        {
          class: 'search--filter-facets-group'
        },
        [
          el(
            'label',
            {
              class: 'search--filter-facets-title'
            },
            elSpanTranslate(`search_${attr}`)
          ),
          (elFacetItems = el('div', {
            class: 'search--filter-facets-items'
          }))
        ]
      );
      s._facets_containers.push(elFacetItems);
      frag.appendChild(elFacetGroup);
      const values = distrib[attr];
      for (let value in values) {
        /**
         * Label or key, e.g. vt, environment, global
         */
        if (value) {
          const k = `${attr}:${value}`;
          const fc = new Facet({
            count: values[value],
            label: value,
            group: attr,
            checked: false,
            id: k
          });
          elFacetItems.appendChild(fc.el);
          s._facets[k] = fc;
        }
      }
    }
    return frag;
  }

  /**
   * Init tribute autocomplete
   * NOTE: to be removed
   */
  _init_tribute(elTarget, elContainer) {
    const s = this;

    const tributeAttributes = {
      menuContainer: elContainer,
      autocompleteMode: true,
      positionMenu: true,
      values: async (text, cb) => {
        /**
         * Query index on keyword attributes only
         * and transform hits to distinct list of keywords,
         * with translation of available
         */
        const attrKeys = s.opt('keywords').map((k) => k.type);
        const results = await s.search({
          q: text,
          attributesToRetrieve: attrKeys,
          facetsDistribution: attrKeys
        });
        const v = [];
        const seen = {};

        for (let hit of results.hits) {
          //{source_keyword:[]}
          for (let type in hit) {
            let keywords = hit[type];
            // ["COD","CHE"]
            if (!isArray(keywords)) {
              keywords = [keywords];
            }
            for (let keyword of keywords) {
              let hash = type + keyword;
              if (!seen[hash]) {
                seen[hash] = true;
                v.push({
                  type: type,
                  key: keyword,
                  value: await getDictItem(keyword)
                });
              }
            }
          }
        }
        cb(v);
      },
      noMatchTemplate: () => {
        return null;
      },
      selectTemplate: (item) => {
        if (isUndefined(item)) {
          return null;
        }
        return item.original.value;
      },
      menuItemTemplate: function(item) {
        return item.original.value;
      }
    };
    /**
     * Create new Tribute instance
     */
    s._tribute = new s.Tribute(tributeAttributes);
    s._tribute.attach(elTarget);
  }

  /**
   * Build filter date for each item in options > attributes > date
   * connect flatpickr and add to UI
   */
  async _build_filter_date() {
    const s = this;
    s._flatpickr_filters = [];
    const attrDate = s.opt('attributes').date;
    const txtPlaceholder = await getDictItem('search_filter_date_placeholder');

    for (let attr of attrDate) {
      /**
       * Layout
       */
      const elFilterDate = el('input', {
        type: 'text',
        class: 'search--filter-date-input',
        dataset: {
          lang_key: 'source_filter_date_placeholder',
          lang_type: 'placeholder'
        },
        placeholder: txtPlaceholder,
        id: Math.random().toString(32)
      });

      const elFilterDateLabel = el(
        'label',
        {
          class: 'search--filter-date-label',
          for: elFilterDate.id
        },
        elSpanTranslate(`search_filter_${attr}`)
      );
      const elFilterContainer = el(
        'div',
        {class: 'search--filter-date-item'},

        [elFilterDateLabel, elFilterDate]
      );
      s._elFiltersDate.appendChild(elFilterContainer);

      /**
       * Date picker
       */
      const fpickr = s._flatpickr(elFilterDate, {
        mode: 'range',
        allowInput: true,
        onChange: (e) => {
          let strFilter = '';
          if (e[0]) {
            strFilter = strFilter + `${attr}>=${(e[0] * 1) / 1000} `;
          }
          if (e[1]) {
            strFilter = strFilter + `AND ${attr}<=${(e[1] * 1) / 1000}`;
          }
          s._filters[attr] = strFilter;
          s.update();
        }
      });

      s._flatpickr_filters.push(fpickr);
    }
  }

  /**
   * Input builder
   * @param {Options} opt Options
   * @param {String} opt.key_label translation key for the label
   * @param {String} opt.key_placeholder translation key for the placeholder
   */
  async _build_input(opt) {
    const s = this;
    const id = Math.random().toString(32);
    opt = Object.assign(
      {},
      {key_label: null, key_placeholder: null, key_action: null},
      opt
    );

    s._elInput = el('input', {
      class: 'search--input',
      id: id,
      type: 'text',
      lang_key: opt.key_placeholder,
      placeholder: await getDictItem(opt.key_placeholder),
      on: {
        input: () => {
          s.update();
        }
      }
    });

    s._elInputContainer = el(
      'div',
      {
        class: 'search--input-container'
      },
      s._elInput,
      elButtonIcon('search_clear_query', {
        icon: 'fa-times',
        mode: 'icon',
        classes: [],
        dataset: {action: 'search_clear'}
      }),
      elButtonIcon('search_filters', {
        icon: 'fa-filter',
        mode: 'icon',
        classes: [],
        dataset: {action: 'toggle_filters'},
        content: s._elFilterFlag = el('span', {
          class: ['search--flag']
        })
      })
    );

    return el(
      'div',
      el('label', {for: id}, elSpanTranslate(opt.key_label)),
      s._elInputContainer
    );
  }

  getFacetsArray() {
    const s = this;
    const out = [];
    if (!s._facets) {
      return out;
    }
    const ids = Object.keys(s._facets);
    for (let id of ids) {
      out.push(s._facets[id]);
    }
    return out;
  }

  clear() {
    const s = this;
    s._elInput.value = '';
    const facets = s.getFacetsArray();
    for (let facet of facets) {
      if (facet.checked) {
        facet.checked = false;
      }
    }
    const dates = s._flatpickr_filters;
    for (let date of dates) {
      date.clear();
    }
    s.update();
  }

  async _handle_click(e) {
    const s = this;
    const ds = e.target?.dataset || {};
    const action = ds.action;
    try {
      switch (action) {
        case 'toggle_filters':
          {
            s._elFilters.classList.toggle('search--hidden');
            s.vFeedback(e);
          }
          break;
        case 'update_facet_filter':
          s.update();
          break;
        case 'search_clear':
          {
            s._elInput.value = '';
            s.vFeedback(e);
            s.clear();
          }
          break;
        case 'search_set_page':
          {
            s.vFeedback(e);
            s.update(ds.page);
          }
          break;
        case 'search_keyword_toggle':
          {
            const keyword = ds.keyword;
            const type = ds.type;
            const facet = s._facets[`${type}:${keyword}`];
            if (facet) {
              facet.checked = !facet.checked;
              s.update();
            }
          }

          break;
        case 'search_view_toggle':
          {
            s.vFeedback(e);
            const idView = ds.id_view;
            let view = getView(idView);
            const isValid = isView(view);
            const viewIsOpen = getViewsOpen().includes(idView);

            if (!isValid) {
              view = await getViewRemote(idView);
              if (isView(view)) {
                await viewsListAddSingle(view);
              }
            }
            if (!isView(view)) {
              console.warn(
                `Search action 'view toggle' require valid view. Data provided:`,
                view
              );
              return;
            }

            if (viewIsOpen) {
              await viewRemove(view);
            } else {
              await viewAdd(view);

              /**
               * All views exept story : zoom
               */

              if (!isStory(view)) {
                await zoomToViewId(idView);
                return;
              }
              /**
               * Story handling
               */

              const confirmed = await modalConfirm({
                title: elSpanTranslate('search_story_auto_play_title'),
                content: elSpanTranslate('search_story_auto_play_confirm')
              });
              if (!confirmed) {
                return;
              }
              storyRead({
                view: view
              });
            }
          }
          break;
        case 'search_show_view_meta':
          {
            const idView = ds.id_view;
            viewToMetaModal(idView);
            s.vFeedback(e);
          }
          break;
        default:
          null;
      }
    } catch (e) {
      console.warn('Search action handler failed ', e);
    }
  }

  vFeedback(event) {
    new ButtonCircle({
      x: event.clientX,
      y: event.clientY
    });
  }

  _build_result_list(hits) {
    const s = this;
    const frag = new DocumentFragment();
    const confKeywords = s.opt('keywords');

    for (let v of hits) {
      /**
       * Add keywords buttons
       */
      const elKeywords = el('div', {class: ['search--button-group']});
      for (let k of confKeywords) {
        let keywords = v[k.type];
        if (keywords) {
          if (!isArray(keywords)) {
            keywords = [keywords];
          }
          for (let keyword of keywords) {
            if (isStringRange(keyword, 2)) {
              const facetEnabled = s.hasFilterFacet(k.type, keyword);
              const clEnabled = facetEnabled ? 'enabled' : 'disabled';
              const elKeyword = el(
                'div',
                {
                  class: [
                    'search--button-keyword',
                    `search--button-keyword-${clEnabled}`
                  ],
                  dataset: {
                    action: 'search_keyword_toggle',
                    keyword: keyword,
                    type: k.type
                  }
                },
                [
                  el('i', {
                    class: ['fa', k.icon]
                  }),
                  elSpanTranslate(keyword)
                ]
              );
              elKeywords.appendChild(elKeyword);
            }
          }
        }
      }

      /**
       * Add actions
       */
      const elButtonsBar = el(
        'div',
        {class: 'search--item-buttons-bar'},
        elButtonIcon('search_view_toggle', {
          icon: 'fa-plus',
          mode: 'icon',
          classes: [],
          dataset: {action: 'search_view_toggle', id_view: v.view_id}
        }),
        elButtonIcon('search_show_view_meta', {
          icon: 'fa-info-circle',
          mode: 'icon',
          classes: [],
          dataset: {action: 'search_show_view_meta', id_view: v.view_id}
        })
      );

      frag.appendChild(
        el(
          'div',
          {class: ['search--results-item']},
          el(
            'div',
            {class: 'search--item-title'},
            el('span', v._formatted.view_title)
          ),
          el(
            'p',
            {
              class: ['search--item-info']
            },
            [
              {key: 'view_abstract', id: 'view_id', type: 'view'},
              {key: 'source_title', id: 'source_id', type: 'source'},
              {key: 'source_abstract', id: null, type: null},
              {key: 'project_title', id: 'project_id', type: 'project'}
            ].map((row) => {
              return el(
                'span',
                {
                  class: ['search--item-info-snipet', 'hint--top'],
                  dataset: {
                    lang_key: `search_${row.key}`,
                    lang_type: 'tooltip'
                  }
                },
                s.formatCroppedText(v._formatted[row.key])
              );
            })
          ),
          elKeywords,
          elButtonsBar
        )
      );
    }
    return frag;
  }

  destroy() {
    const s = this;
    s._elSearch.remove();
    s.ac.destroy();
  }

  /**
   * Split text on n words using details element.
   * @param {String} str string
   * @param {Integer} max Number of words to use
   * @return {String} If max number of word reached,string with <details>+<summary>
   */
  cutext(str, max) {
    max = max || 50;
    // NOTE: Can split html div. but description should not contain html.
    const wrds = (str || '').split(/\b/);
    const strShow = wrds.filter((w, i) => i <= max).join('');
    const strHide = wrds.filter((w, i) => i > max).join('');

    if (strHide.length === 0) {
      return el('p', str);
    }

    const elSummary = el('summary', strShow);
    const elHide = el('p', strHide);
    return el(
      'details',
      {
        class: ['search--cutext']
      },
      elSummary,
      elHide
    );
  }

  /**
   * Format cropped text: add ellipsis when needed
   * @param {String} str Croped tring to format
   * @return {String} str String formated like '...on mercury analysis' or 'A mercury analysis...' ;
   */

  formatCroppedText(str) {
    if (!isStringRange(str, 1)) {
      return '';
    }
    if (str[0] !== str[0].toUpperCase()) {
      str = `…${str}`;
    }
    if (['.', '!', '?'].indexOf(str[str.length - 1]) === -1) {
      str = `${str}…`;
    }
    return str;
  }

  getFilters(op) {
    op = op || 'AND';
    const s = this;
    const filters = [];
    const inputFilters = s._filters;
    for (const id in inputFilters) {
      const filter = inputFilters[id];
      if (filter) {
        filters.push(filter);
      }
    }
    return filters.join(` ${op} `);
  }

  getFiltersFacets(op) {
    const s = this;
    op = op || 'AND';
    const inner = [];
    const outer = [];
    if (!s._facets) {
      return;
    }
    const keys = Object.keys(s._facets);
    for (let key of keys) {
      const facet = s._facets[key];
      if (facet.checked) {
        if (op === 'AND') {
          inner.push(key);
        } else {
          outer.push(key);
        }
      }
    }
    if (outer.length) {
      inner.push(outer);
    }
    if (inner.length) {
      return inner;
    }
    return;
  }

  /**
   * Check if keyword/tag has enabled facet
   * @param {String} attr Attribute (eg. keyword type)
   * @param {String} tag Keyword/tag
   * @return {Boolean}
   */
  hasFilterFacet(attr, tag) {
    const s = this;
    const hasFacet =
      s.getFacetsArray().filter((f) => f.checked && f.id == `${attr}:${tag}`)
        .length > 0;
    return hasFacet;
  }

  setFlag(opt) {
    if (opt.enable) {
      opt.target.classList.add('active');
    } else {
      opt.target.classList.remove('active');
    }
  }

  /**
   * Update the results, and set the page
   * @param {Integer} page Page number - saved in pagination.
   */
  async update(page) {
    const s = this;
    await s.initCheck();
    clearTimeout(s._id_update_timeout);
    s._id_update_timeout = setTimeout(async () => {
      try {
        const attr = s.opt('attributes');
        const attrKeys = s.opt('keywords').map((k) => k.type);
        const strFilters = s.getFilters();
        const facetFilters = s.getFiltersFacets();
        s.setFlag({
          target: s._elFilterFlag,
          enable: !!facetFilters && !!facetFilters.length
        });

        console.time('search update');

        const results = await s.search({
          q: s._elInput.value,
          offset: page * 20,
          limit: 20,
          filters: strFilters || null,
          facetFilters: facetFilters || null,
          attributesToRetrieve: ['*'],
          attributesToHighlight: attr.text,
          attributesToCrop: attr.text,
          facetsDistribution: attrKeys,
          matches: false
        });

        await s._update_stats(results);

        const fragItems = s._build_result_list(results.hits);
        s._elResults.replaceChildren(fragItems);

        const elPaginationItems = s._build_pagination_items(results);
        s._elPagination.replaceChildren(elPaginationItems);

        if (!s._facets) {
          const fragFacet = s._build_facets(results.facetsDistribution);
          s._elFiltersFacets.replaceChildren(fragFacet);
        } else {
          s._update_facets(results.facetsDistribution);
        }

        if (s._elResults.firstChild) {
          s._elResults.firstChild.scrollIntoView();
        }

        console.timeEnd('search update');
      } catch (e) {
        console.warn('Issue while searching', {error: e});
      }
    }, 100);
  }

  /**
   * Search on current index, with default params.
   * @param {Object} opt Options for index.search
   * @return {Object} Search result
   */
  async search(opt) {
    const s = this;
    const search = Object.assign(
      {},
      {
        q: '',
        offset: 0,
        limit: 20,
        filters: null,
        facetFilters: null,
        facetsDistribution: null,
        attributesToRetrieve: ['*'],
        attributesToCrop: null,
        cropLength: 40,
        attributesToHighlight: null,
        matches: false
      },
      opt
    );
    return await s._index.search(search.q, search);
  }

  /**
   * Update stats
   */
  async _update_stats(results) {
    const s = this;
    const nPage = Math.ceil(results.nbHits / results.limit);
    const cPage = Math.ceil(
      nPage - (results.nbHits - results.offset) / results.limit
    );
    const strTime = `${results.processingTimeMs} ms`;
    const strNbHit = `${results.nbHits} `;
    const tmpl = await getDictItem('search_results_stats');

    const txt = s.template(tmpl, {strNbHit, strTime, cPage, nPage});
    s._elStatHits.innerText = txt;
  }

  /**
   * Pagination builder
   */

  _build_pagination_items(results) {
    const s = this;
    const elItems = el('div', {class: ['search--pagination-items']});

    const nPage = Math.ceil(results.nbHits / results.limit);
    const cPage =
      Math.ceil(nPage - (results.nbHits - results.offset) / results.limit) - 1;

    let type = '';
    let fillerPos = [];

    /*
     * Pagination layout
     */

    if (nPage <= 10) {
      /**
       * oooooooXoo
       */
      type = 'all';
    } else if (cPage < 4) {
      /**
       * ooXoo ooo
       */
      type = '5_3';
      fillerPos.push(6);
    } else if (cPage > nPage - 4) {
      /**
       * ooo oXooo
       */
      type = '3_5';
      fillerPos.push(4);
    } else {
      /**
       * ooo oXo ooo
       */
      type = '3_5_3';
      fillerPos.push(...[3, nPage - 4]);
    }

    /**
     * Populate pagination
     */
    for (let i = 0; i < nPage; i++) {
      let add = false;
      switch (type) {
        case 'all':
          add = true;
          break;
        case '3_5_3':
          if (
            i < 3 ||
            i === cPage - 2 ||
            i === cPage - 1 ||
            i === cPage ||
            i === cPage + 1 ||
            i === cPage + 2 ||
            i > nPage - 4
          ) {
            add = true;
          }
          break;
        case '5_3':
          if (i < 5 || i > nPage - 4) {
            add = true;
          }
          break;
        case '3_5':
          if (i < 3 || i > nPage - 6) {
            add = true;
          }
          break;
        default:
      }

      /**
       * Add filler if needed
       */
      if (fillerPos.includes(i)) {
        const elFiller = el('span', {
          class: ['search--pagination-item-filler']
        });
        elItems.appendChild(elFiller);
      }

      if (add) {
        /**
         * Build item
         */

        let elItem;
        const elItemContainer = el(
          'span',
          {
            class: ['search--pagination-item-container'],
            dataset: {
              action: 'search_set_page',
              page: i
            }
          },
          (elItem = el('span', {
            class: ['search--pagination-item'],
            dataset: {page: i + 1}
          }))
        );
        /**
         * The item is the current page
         */

        if (i === cPage) {
          elItem.classList.add('active');
          elItem.setAttribute('disabled', true);
        }
        /**
         * Add the item
         */

        elItems.appendChild(elItemContainer);
      }
    }
    return elItems;
  }

  /**
   * Simple template parser
   * @param {String} template string
   * @param {Object} data Object with key : value pair
   * @return {String} template with replaced values
   */

  template(str, data) {
    const s = this;
    if (!data) {
      data = s._opt;
    }
    return str.replace(/{{([^{}]+)}}/g, (matched, key) => {
      return data[key];
    });
  }
}

class Facet {
  constructor(opt) {
    const fc = this;
    fc._opt = Object.assign(
      {},
      {
        count: 0,
        label: null,
        id: null,
        group: null,
        checked: false,
        order: 0,
        enable: true
      },
      opt
    );
    fc.init();
  }

  init() {
    const fc = this;
    if (fc._init) {
      return;
    }
    fc.build();
    fc.count = fc._opt.count;
    fc._init = true;
  }

  build() {
    const fc = this;
    fc._elCheckbox = el('input', {
      class: 'search--filter-facet-item-input',
      type: 'checkbox',
      dataset: {
        action: 'update_facet_filter'
      },
      id: Math.random().toString(32)
    });

    const elLabelContent = elSpanTranslate(fc._opt.label);

    fc._elLabel = el(
      'label',
      {class: 'search--filter-facet-item-label', for: fc._elCheckbox.id},
      elLabelContent
    );

    fc._elCount = el('span', {class: 'search--filter-facet-item-count'});
    fc._elTag = el(
      'div',
      {
        class: 'search--filter-facet-item'
      },
      [fc._elCheckbox, fc._elLabel, fc._elCount]
    );
  }

  get id() {
    return this._opt.id;
  }

  get el() {
    return this._elTag;
  }
  get checked() {
    return this._elCheckbox.checked === true;
  }

  set checked(enable) {
    this._elCheckbox.checked = enable;
  }

  get enable() {
    return this._opt.enable;
  }

  set enable(value) {
    const fc = this;
    if (!isBoolean(value)) {
      value = true;
    }
    fc._opt.enable = value;
    if (fc._opt.enable) {
      fc._elTag.classList.remove('disabled');
    } else {
      fc._elTag.classList.add('disabled');
    }
  }
  get order() {
    return this._opt.order;
  }
  set order(pos) {
    const fc = this;
    const oldPos = fc._opt.order;
    if (oldPos != pos) {
      fc._opt.order = pos;
      fc._elTag.style.order = pos;
    }
  }
  get count() {
    return this._opt.count;
  }
  set count(c) {
    const fc = this;
    fc._opt.count = c;
    fc._elCount.innerText = `${c}`;
    fc.enable = !!fc._opt.count;
    fc.order = 1000 - fc._opt.count;
  }
}

export {Search};
