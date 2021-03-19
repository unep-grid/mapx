import {el} from '@fxi/el';
import {MeiliSearch} from 'meilisearch';
import {getDictItem, getTranslationTag} from './../mx_helper_language.js';
import {getSearchUrl} from './../mx_helper_map.js';
import './style.less';

const def = {
  key: null,
  host: 'localhost',
  port: 80,
  container: '#idcontainer',
  key_label: 'search_title',
  key_placeholder: 'search_placeholder',
  language: 'en',
  index: 'views',
  index_setting: {
    views: {
      facetsDistribution: [
        'view_type',
        'source_keywords',
        'source_keywords_m49'
      ],
      //attributesToHighlight: ['*'],
      attributesToHighlight: [
        'view_title',
        'view_abstract',
        'source_title',
        'source_abstract'
      ]
    }
  }
};

class Search {
  constructor(opt) {
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
    //s.update();
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
    const id = Math.random().toString(32);
    s._elSearch = el(
      'div',
      {
        class: ['search--container'],
        on : {'click':s._handleClick}
      },
      (s._elLabel = el(
        'label',
        {for: id},
        getTranslationTag(s._opt.key_label)
      )),
      (s._elInput = el('input', {
        class: 'search--input',
        type: 'text',
        lang_key: s._opt.key_placeholder,
        placeholder: await getDictItem(s._opt.key_placeholder),
        on: {input: s.update.bind(s)}
      })),
      (s._elResults = el('div', {class: ['search--results']}))
    );
    s._elContainer.appendChild(s._elSearch);
  }

  _handleClick(e){
    if(e.target.classList.contains('search--show-more')){
       e.stopPropagation();
       e.target.classList.toggle('search--show-less');
    }
  }


  buildList(hits) {
    const frag = new DocumentFragment();
    for (let v of hits) {
      frag.appendChild(
        el(
          'div',
          {class: ['search--results-item']},
          el('h3', {class: 'search--title'}, v._formatted.view_title),
          el('p', {class: ['search--abstract','search--show-more','search--show-less']}, v._formatted.view_abstract)
        )
      );
    }
    return frag;
  }

  destroy() {
    const s = this;
    s._elSearch.remove();
  }

  async update() {
    const s = this;
    const str = s._elInput.value;
    const results = await s._index.search(
      str,
      s._opt.index_setting[s._opt.index]
    );
    const fragList = s.buildList(results.hits);
    s._elResults.replaceChildren(fragList);
  }
}

export {Search};
