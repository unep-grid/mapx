//import {el} from '@fxi/el';
import {el, elSpanTranslate, elButtonIcon} from '../el_mapx/index.js';
import {MeiliSearch} from 'meilisearch';
import {getDictItem} from './../mx_helper_language.js';
import {getSearchUrl} from './../mx_helper_map.js';
import {EventSimple} from './../listener_store';
import * as test from './../is_test_mapx';

import './style.less';

const def = {
  key: null,
  host: 'localhost',
  port: 80,
  container: '#idcontainer',
  language: 'en',
  index: 'views',
  filters: {
    operators: ['=', '!=', '>', '>=', '<', '<='],
    date: [
      'view_modified_at',
      'view_created_at',
      'source_start_at',
      'source_end_at',
      'source_released_at',
      'source_modified_at'
    ]
  },
  index_setting: {
    views: {
      facetsDistribution: [
        'view_type',
        'source_keywords',
        'source_keywords_m49'
      ],
      attributesToHighlight: [
        'view_title',
        'view_abstract',
        'source_title',
        'source_abstract'
      ]
    }
  }
};

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
    s._meili = new MeiliSearch({
      host: getSearchUrl(),
      apiKey: s._opt.key || null
    });
    await s.setIndex();
    await s.build();
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
        on: ['click', s._handleClick]
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
        (s[name] = el('input', {
          class: 'search--input',
          id: id,
          type: 'text',
          on: ['input', s.update],
          lang_key: opt.key_placeholder,
          placeholder: await getDictItem(opt.key_placeholder),
          on: {input: s.update.bind(s)}
        }))
      )
    );
  }

  _handleClick(e) {
    const elItem = e.target.closest('.search--show-toggle');
    if (elItem) {
      elItem.classList.toggle('search--show-less');
      return;
    }
  }

  async buildList(hits) {
    const s = this;
    const frag = new DocumentFragment();
    for (let v of hits) {
      const keywords = [];

      keywords.push(...(v.source_keywords || []));
      keywords.push(...(v.source_keywords_m49 || []));

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
            classes: ['btn-xs'],
            dataset: {filter_keyword: keyword}
          });
        }),
        v.source_keywords_m49.map((keyword) => {
          if (!keyword) {
            return;
          }
          return elButtonIcon(keyword, {
            icon: 'fa-map-marker',
            mode: 'text_icon',
            classes: ['btn-xs'],
            dataset: {filter_keyword: keyword}
          });
        })
      );

      const elButtonsBar = el(
        'div',
        {class: 'search--item-buttons-bar'},
        elButtonIcon('search_view_toggle', {
          icon: 'fa-eye',
          mode: 'icon',
          classes: ['btn-xs'],
          dataset: {action: 'search_view_toggle', id_view: v.view_id}
        }),
        elButtonIcon('search_show_view_meta', {
          icon: 'fa-info-circle',
          mode: 'icon',
          classes: ['btn-xs'],
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
  }

  /**
   * Split text on n words using details element.
   * @param {String} str string
   * @param {Integer} max Number of words to use
   * @return {String} If max number of word reached,string with <details>+<summary>
   */
  cutext(str, max) {
    max = max || 50;
    const wrds = (str || '').split(/\b/);
    const strShow = wrds.filter((w, i) => i <= max).join('');
    const strHide = wrds.filter((w, i) => i > max).join('');
    if (strHide.length > 0) {
      str = `<details class="search--cutext"><summary>${strShow}</summary>${strHide}</details>`;
    }
    return str;
  }

  parse(str) {
    const s = this;
    let text = '';
    let filters = '';
    const groups = str.split(/\s+/);
    const regOps = new RegExp(s._opt.filters.operators.join('|'));
    for (let group of groups) {
      updateFilters(group);
    }

    console.log({text, filters});
    return {text, filters};

    function updateFilters(group) {
      try {
        const op = (group.match(regOps) || [])[0];
        if (!op) {
          return (text += ` ${group}`);
        }
        const sub = group.split(op);
        if (sub.length !== 2) {
          return (text =+ ` ${group}`);
        }
        let attribute = sub[0];
        let value = sub[1];
        if (!value) {
          return (text =+ ` ${group}`);
        }
        if (s._opt.filters.date.includes(attribute)) {
          value = Math.ceil((new Date(value) * 1) / 1000);
        }
        filters += `${filters ? 'AND' : ''} ${attribute}${op}${value} `;
      } catch (e) {
        console.warn(e);
      }
    }
  }

  update() {
    const s = this;
    clearTimeout(s._id_update_timeout);
    s._id_update_timeout = setTimeout(async () => {
      const query = s.parse(s._elInput.value);
      const settingsBase = s._opt.index_setting[s._opt.index];
      const settings = Object.assign({}, settingsBase, {
        filters: query.filters || null
      });
      const results = await s._index.search(query.text, settings);
      const fragList = await s.buildList(results.hits);
      s._elResults.replaceChildren(fragList);
    }, 100);
  }
}

export {Search};
