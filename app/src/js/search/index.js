import {MeiliSearch} from 'meilisearch';
import {el, elSpanTranslate, elButtonIcon} from '../el_mapx/index.js';
import {viewsListAddSingle} from './../mx_helper_map_view_ui.js';
import {
  zoomToViewId,
  getView,
  getViewRemote,
  viewAdd,
  viewRemove,
  getViewsOpen
} from './../mx_helper_map.js';
import {viewToMetaModal} from './../mx_helper_map_view_metadata.js';
import {getDictItem} from './../mx_helper_language.js';
import {EventSimple} from './../listener_store';
import './style.less';
import {def} from './default.js';

class Search extends EventSimple {
  constructor(opt) {
    super();
    const s = this;
    return s.init(opt);
  }

  async init(opt) {
    const s = this;
    if (s._init) {
      return;
    }
    s.setOpt(opt);
    s._elContainer = document.querySelector(s.opt('container'));
    s._meili = new MeiliSearch({
      host: `${s.opt('protocol')}${s.opt('host')}:${s.opt('port')}`,
      apiKey: s.opt('key') || null
    });

    await s.setIndex();
    await s.build();
    s._init = true;
    s.fire('ready');
    return s;
  }

  opt(k) {
    return this._opt[k];
  }

  setOpt(opt) {
    const s = this;
    if (!s._opt) {
      s._opt = {};
    }
    Object.assign(s._opt, def, s._opt, opt);
  }

  get isReady() {
    return !!this._init;
  }

  async setLanguage(lang) {
    const s = this;
    s.setOpt({language: lang});
    s.setIndex();
  }

  async setIndex(id) {
    const s = this;
    if (!id) {
      id = s.template(s.opt('index_template'));
    }
    s.setOpt({index: id});
    s._index = await s._meili.getIndex(id);
  }

  async build() {
    const s = this;
    if (s._built) {
      return;
    }
    s._built = true;
    s._elResults = el('div', {class: ['search--results']});
    s._elPagination = el('div', {class: ['search--pagination']});
    s._elFilters = el(
      'div',
      {
        class: ['search--filters', 'search--hidden']
      },
      'FILTERS'
    );

    s._elHeader = el(
      'div',
      {
        class: 'search--header'
      },
      await s._build_input('_elInput', {
        key_label: 'search_title',
        key_placeholder: 'search_placeholder'
      }),
      s._elFilters
    );

    s._elSearch = el(
      'div',
      {
        class: ['search--container'],
        on: ['click', s._handleClick.bind(s)]
      },
      s._elHeader,
      s._elResults,
      s._elPagination
    );

    s._elContainer.appendChild(s._elSearch);
  }

  /**
   * Input builder
   * @param {String} name Name of the private class item e.g. <instance>._elInput
   * @param {Options} opt Options
   * @param {String} opt.key_label translation key for the label
   * @param {String} opt.key_placeholder translation key for the placeholder
   */
  async _build_input(name, opt) {
    const s = this;
    const id = Math.random().toString(32);
    opt = Object.assign(
      {},
      {key_label: null, key_placeholder: null, key_action: null},
      opt
    );
    return el(
      'div',
      el('label', {for: id}, elSpanTranslate(opt.key_label)),
      el(
        'div',
        {
          class: 'search--input-container'
        },
        (s[name] = el('input', {
          class: 'search--input',
          id: id,
          type: 'text',
          lang_key: opt.key_placeholder,
          placeholder: await getDictItem(opt.key_placeholder),
          on: {
            input: () => {
              s.update();
              s.autosize();
            }
          }
        })),
        elButtonIcon('search_clear_query', {
          icon: 'fa-times',
          mode: 'icon',
          classes: [],
          dataset: {action: 'search_clear'}
        }),
        elButtonIcon('search_filters', {
          icon: 'fa-sliders',
          mode: 'icon',
          classes: [],
          dataset: {action: 'toggle_filters'}
        })
      )
    );
  }

  /**
   * Resize text area according to height of scrollHeight
   */
  autosize() {
    const s = this;
    s._elInput.style.height = '';
    s._elInput.style.height = 5 + s._elInput.scrollHeight + 'px';
  }

  async _handleClick(e) {
    const s = this;
    const ds = e.target?.dataset || {};

    const action = ds.action;
    switch (action) {
      case 'toggle_filters':
        {
          s._elFilters.classList.toggle('search--hidden');
        }
        break;
      case 'search_clear':
        {
          s._elInput.value = '';
          s.update();
        }
        break;
      case 'search_set_page':
        {
          s.update(ds.page);
        }
        break;
      case 'search_filter_keyword':
        {
          //return;
          //   const m49 = ds.keyword_type === 'm49';
          //const keyword = ds.filter_keyword;
          /**
           * Space in keyword => add quotes
           */
          //const hasSpace = keyword.match(/\s+/);
          //const keywordSafe = hasSpace ? `"${keyword}"` : keyword;
          //const search = s.parse(s._elInput.innerText);
          //const filters = search.filtersArray;
          //const keyFilter = m49
          //? `source_keywords_m49=${keywordSafe}`
          //: `source_keywords=${keywordSafe}`;
          //const pos = filters.indexOf(keyFilter);
          /**
           * Add or remove filter
           */
          //if (pos === -1) {
          //filters.push(keyFilter);
          //} else {
          //filters.splice(pos, 1);
          //}
          //s._elInput.innerText = `${search.text} ${filters.join(' ')}`;
          //s.update();
        }
        break;
      case 'search_view_toggle':
        {
          const idView = ds.id_view;
          const view = getView(idView);
          if (view) {
            const hasView = getViewsOpen().includes(idView);
            if (hasView) {
              await viewRemove(view);
            } else {
              await viewAdd(view);
            }
          } else {
            const viewRemote = await getViewRemote(idView);
            viewsListAddSingle(viewRemote);
          }
          zoomToViewId(idView);
        }
        break;
      case 'search_show_view_meta':
        {
          const idView = ds.id_view;
          viewToMetaModal(idView);
        }
        break;
      default:
        null;
    }
  }

  async buildList(hits) {
    const s = this;
    const frag = new DocumentFragment();
    for (let v of hits) {
      const elKeywords = el(
        'div',
        {class: ['search--button-group']},
        v.source_keywords.map((keyword) => {
          if (!keyword) {
            return;
          }
          return elButtonIcon(keyword, {
            icon: 'fa-tag',
            mode: 'text_icon',
            classes: [],
            dataset: {action: 'search_filter_keyword', filter_keyword: keyword}
          });
        }),
        v.source_keywords_m49.map((keyword) => {
          if (!keyword) {
            return;
          }
          return elButtonIcon(keyword, {
            icon: 'fa-map-marker',
            mode: 'text_icon',
            classes: [],
            dataset: {
              action: 'search_filter_keyword',
              keyword_type: 'm49',
              filter_keyword: keyword
            }
          });
        })
      );

      const elButtonsBar = el(
        'div',
        {class: 'search--item-buttons-bar'},
        elButtonIcon('search_view_toggle', {
          icon: 'fa-eye',
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
              class: [
                'search--item-info',
                'search--show-toggle',
                'search--show-less'
              ]
            },
            [
              {key: 'view_abstract', id: 'view_id', type: 'view'},
              {key: 'source_title', id: 'source_id', type: 'source'},
              {key: 'source_abstract', id: null, type: null},
              {key: 'project_title', id: 'project_id', type: 'project'}
            ].map((row) => {
              return el(
                'div',
                {class: 'search--item-info-columns'},
                el(
                  'div',
                  {class: 'search--item-info-column-title'},
                  elSpanTranslate(`search_${row.key}`)
                ),
                el(
                  'div',
                  {class: 'search--item-info-column-content'},
                  s.cutext(v._formatted[row.key], 50)
                )
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

  update(page) {
    const s = this;
    clearTimeout(s._id_update_timeout);
    s._id_update_timeout = setTimeout(async () => {
      try {
        const attr = s.opt('attributes');
        const search = {
          q: s._elInput.value,
          offset: page * 20,
          limit: 20,
          filters: null,
          facetFilters: null,
          facetsDistribution: null,
          attributesToRetrieve: ['*'],
          attributesToCrop: null,
          cropLength: 400,
          attributesToHighlight: attr.text,
          matches: false
        };
        const results = await s._index.search(search.q, search);
        const fragItems = await s.buildList(results.hits);
        s._elResults.replaceChildren(fragItems);
        const elPaginationItems = s.buildPaginationItems(results);
        s._elPagination.replaceChildren(elPaginationItems);
      } catch (e) {
        console.warn('Issue while searching', {error: e});
      }
    }, 100);
  }

  /**
   * Pagination builder
   */

  buildPaginationItems(results) {
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

export {Search};
