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
import {getSearchUrl} from './../mx_helper_map.js';
import {EventSimple} from './../listener_store';
import './style.less';
import {def} from './default.js';
import {parser} from './parser.js';
import {AutoComplete} from './autocomplete.js';

class Search extends EventSimple {
  constructor(opt) {
    super();
    const s = this;
    s._opt = Object.assign({}, def, opt);
    return s.init();
  }

  async init() {
    const s = this;
    if (s._init) {
      return;
    }
    s._elContainer = document.querySelector(s._opt.container);
    // Init meili and init index used =>  _index.search
    s._meili = new MeiliSearch({
      host: getSearchUrl(),
      apiKey: s._opt.key || null
    });
    await s.setIndex();
    // build search group UI
    await s.build();
    // Init autocomplete feature
    s.ac = new AutoComplete({
      elInput : s._elInput,
      index : s._index
    });
    // flag init to ignore second init. 
    s._init = true;
    s.fire('ready');
    return s;
  }

  get isReady() {
    return !!this._init;
  }

  async setLanguage(lang) {
    const s = this;
    s._opt.language = lang;
    s.setIndex();
  }

  async setIndex(id) {
    const s = this;
    if (id) {
      s._opt.index = id;
    }
    s._index = await s._meili.getIndex(`${s._opt.index}_${s._opt.language}`);
  }

  async build() {
    const s = this;
    if (s._built) {
      return;
    }
    s._built = true;

    s._elSearch = el(
      'div',
      {
        class: ['search--container'],
        on: ['click', s._handleClick.bind(s)]
      },
      el(
        'div',
        {
          class: 'search--header'
        },
        await s._build_input('_elInput', {
          key_label: 'search_title',
          key_placeholder: 'search_placeholder'
        })
      ),
      (s._elResults = el('div', {class: ['search--results']}))
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
        (s[name] = el('div', {
          contenteditable: true,
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
        })
      )
    );
  }


  parse(str) {
    return parser(str);
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
      case 'search_clear':
        {
          s._elInput.innerText = '';
          s.update();
        }
        break;
      case 'search_filter_keyword':
        {
          const m49 = ds.keyword_type === 'm49';
          const keyword = ds.filter_keyword;
          /**
          * Space in keyword => add quotes
          */ 
          const hasSpace = keyword.match(/\s+/);
          const keywordSafe = hasSpace ? `"${keyword}"` : keyword;
          const search = s.parse(s._elInput.innerText);
          const filters = search.filtersArray;
          const keyFilter = m49
            ? `source_keywords_m49=${keywordSafe}`
            : `source_keywords=${keywordSafe}`;
          const pos = filters.indexOf(keyFilter);

          /**
          * Add or remove filter
          */ 
          if (pos === -1) {
            filters.push(keyFilter);
          } else {
            filters.splice(pos, 1);
          }

          s._elInput.innerText = `${search.text} ${filters.join(' ')}`;

          s.update();
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

  update() {
    const s = this;
    clearTimeout(s._id_update_timeout);
    s._id_update_timeout = setTimeout(async () => {
      try {
        const query = s.parse(s._elInput.innerText);
        const settingsBase = s._opt.index_setting[s._opt.index];
        const settings = Object.assign({}, settingsBase, {
          filters: query.filters || null
        });
        //console.log(query);
        const results = await s._index.search(query.text, settings);
        const fragItems = await s.buildList(results.hits);
        s._elResults.replaceChildren(fragItems);
      } catch (e) {
        console.warn('Issue while searching',{error:e})
      }
      //const fragFilter = await s.buildFilters(results.hits);
      //s._elFacets.replaceChildren(fragFilter);
    }, 100);
  }
}

export {Search};
