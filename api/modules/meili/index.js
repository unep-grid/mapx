const {meili, pgRead} = require('@mapx/db');
const {getParamsValidator} = require('@mapx/route_validation');
const {validateTokenHandler} = require('@mapx/authentication');
const {sendError} = require('@mapx/helpers');
const template = require('@mapx/template');
const {validation_defaults} = require('@root/settings');
const languages = validation_defaults.languages;
const {getDictM49iso3} = require('@mapx/language');
const validateParamsHandler = getParamsValidator({
  required: ['idUser', 'token', 'searchQuery'],
  expected: ['searchIndexName']
});
const {htmlToText} = require('html-to-text');

const mwSearch = [validateParamsHandler, validateTokenHandler, handlerSearch];

module.exports = {
  mwSearch,
  updateIndex
};

const config = {
  atributesForFaceting: ['view_type', 'source_keywords', 'source_keywords_m49'],
  /**
   * Ranking rules
   * https://docs.meilisearch.com/learn/core_concepts/relevancy.html#ranking-rules
   */

  rankingRules: [
    'attribute', // searchableAttributes order >
    'exactness', // exact terms >
    'proximity', // small distance >
    'words', // number of matches >
    'wordsPosition', // position of words >
    'typo', // fewer typo >
    'asc(view_modified_at)'
  ],
  attributesStripHTML: ['view_abstract', 'source_abstract'],
  /**
   * What is searchable
   * ( Also set importance )
   */
  searchableAttributes: [
    'view_title',
    'view_abstract',
    'source_title',
    'source_abstract',
    'source_keywords',
    'source_keywords_m49',
    'source_notes',
    'project_title',
    'project_abstract',
    'view_id',
    'project_id',
    'view_type',
    'view_modified_at',
    'view_created_at',
    'source_start_at',
    'source_end_at',
    'source_released_at',
    'source_modified_at'
  ]
};

setTimeout(updateIndex, 100);

async function updateIndex() {
  try {
    const start = Date.now();
    const result = await pgRead.query(template.getViewsPublicForSearchIndex);
    const m49iso3 = await getDictM49iso3();
    const documents = result.rows;
    /**
     * Clean keywords: trim, lowercase, ..
     * NOTE: this should have been done at save time : it's not
     * easy to do in postgres OR this add a step ... here.
     */

    for (let item of documents) {
      item.source_keywords = cleanKeywords(item.source_keywords);
    }
    /**
     * Views.
     * - Create an index for each language.
     * NOTE: we could search in the multilingual object, but the search
     * tool do not <em> stuff in object or array. Client side, this step should be added.
     * In addition, views could be matched, but the search terms does not appears in ui
     * if another language – not dispayed – matched the query.
     */
    for (let language of languages.codes) {
      const indexView = await meili.getOrCreateIndex(`views_${language}`);
      const doc = documents.map((item) => {
        return flatLanguageStrings(item, language);
      });
      await indexView.addDocuments(doc);
      
      /**
      * Non async-required operation
      */ 
      indexView.updateAttributesForFaceting(config.atributesForFaceting);
      indexView.updateSettings({rankingRules: config.rankingRules});
      indexView.updateSettings({
        searchableAttributes: config.searchableAttributes
      });

      /*
       * Update location synonyms for this language
       */
      const locsyn = {};
      for (let loc of m49iso3) {
        const code = loc.id;
        const str = loc[language];
        if (str && code) {
          locsyn[code] = [str];
          locsyn[str] = [code];
        }
      }
      indexView.updateSynonyms(locsyn);
    }

    console.log(`Created search index in ${Date.now() - start} ms`);
  } catch (e) {
    console.log(`Failed to create search index`);
    console.error(e);
  }
}

async function handlerSearch(req, res) {
  try {
    const index = client.index(req.query.searchIndexName);
    const result = await index.search(req.query.searchQuery);
    await res.notifyData('search_result', {
      msg: result
    });
  } catch (err) {
    sendError(res, err);
  }
}

function flatLanguageStrings(item, language) {
  const ml = item.meta_multilingual;
  for (let m in ml) {
    const tr = ml[m] || {};
    item[m] = tr[language] || tr[languages.default];
    if (config.attributesStripHTML.indexOf(m) > -1) {
      item[m] = htmlToText(item[m],{wordwrap:false});
    }
  }
  delete item.meta_multilingual;
  return item;
}

function cleanKeywords(arr) {
  return arr.map((k) => k.trim().toLowerCase());
}
