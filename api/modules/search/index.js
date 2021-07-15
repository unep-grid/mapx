const {meili, pgRead} = require('@mapx/db');
const {getParamsValidator} = require('@mapx/route_validation');
const valid = require('@fxi/mx_valid');
const {validateTokenHandler} = require('@mapx/authentication');
const {sendError, sendJSON, wait} = require('@mapx/helpers');
const template = require('@mapx/template');
const {validation_defaults} = require('@root/settings');
const languages = validation_defaults.languages;
const {config} = require(__dirname + '/config.js');
const {getDictM49iso3} = require('@mapx/language');
const validateParamsHandler = getParamsValidator({
  required: ['idUser', 'token'],
  expected: ['searchIndexName', 'searchQuery']
});
const {htmlToText} = require('html-to-text');

const mwSearch = [validateParamsHandler, validateTokenHandler, handlerSearch];
const mwGetSearchKey = [
  validateParamsHandler,
  validateTokenHandler,
  handlerKey
];

module.exports = {
  mwSearch,
  mwGetSearchKey,
  updateIndexes
};

//updateIndexes();

async function updateIndexes() {
  try {
    const cid = config.idx_views;
    const start = Date.now();
    const result = await pgRead.query(template.getViewsPublicForSearchIndex);
    /**
     * TODO this step, m49 dict matching, could be done within the query
     */
  
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
     * - Primary key, e.g. 'view_id' column, must be present in documents
     * - Create an index for each language.
     * NOTE: we could search in the multilingual object, but the search
     * tool do not <em> stuff in object or array. Client side, this step should be added.
     * In addition, views could be matched, but the search terms does not appears in ui
     * if another language – not dispayed – matched the query.
     */
    for (let language of languages.codes) {
      const indexView = await meili.getOrCreateIndex(`views_${language}`, {
        primaryKey: cid.primaryKey
      });
      
      /**
      * Remove previous documents
      * Alternative : retrieve all id -> for each, delete those not in new documents 
      */ 
      console.log(`Delete all documents for index ${language}`);
      await indexView.deleteAllDocuments();

      /**
       * Update settings
       */
      console.log(`Update settings for language ${language}`);
      await indexView.updateAttributesForFaceting(cid.atributesForFaceting);
      await indexView.updateSettings({
        rankingRules: cid.rankingRules,
        searchableAttributes: cid.searchableAttributes
      });

      /*
       * Update synonyms
       */
      console.log(`Update synonyms for language ${language}`);
      const locsyn = {};
      for (let loc of m49iso3) {
        const code = loc.id;
        const str = loc[language];
        if (str && code) {
          locsyn[code] = [str];
          locsyn[str] = [code];
        }
      }
      await indexView.updateSynonyms(locsyn);

      /**
       * Update index
       */
      console.log(`Update index for language ${language}`);
      const doc = documents.map((item) => {
        return flatLanguageStrings(item, language);
      });

      await indexView.addDocuments(doc);
      /**
       * Avoid bug https://github.com/meilisearch/MeiliSearch/issues/1196
       */

      await wait(5000);
    }
    console.log(`Created search index in ${Date.now() - start} ms`);
  } catch (e) {
    console.log(`Failed to create search index`);
    console.error(e);
  }
}

async function handlerKey(req, res) {
  try {
    const keys = await meili.getKeys();
    sendJSON(
      res,
      {
        key: keys.private
      },
      {end: true}
    );
  } catch (err) {
    sendError(res, err);
  }
}

async function handlerSearch(req, res) {
  try {
    const index = meili.index(req.query.searchIndexName);
    const result = await index.search(req.query.searchQuery);
    await res.notifyData('search_result', {
      msg: result
    });
  } catch (err) {
    sendError(res, err);
  }
}

function flatLanguageStrings(item, language) {
  const ml = item.meta_multilingual || {};
  const pd = item.projects_data || [];
  const gm = item.source_keywords_gemet_multilingual;

  const g = item.source_keywords_gemet;
  g.length = 0; // id replaced by label
  for (let k of gm) {
    if (k.language === language) {
      g.push(k.label);
    }
  }
  /**
   * Extend document with items from meta_multilingual
   */
  for (let m in ml) {
    /*
     * e.g. 'view_title', 'source_notes',...
     */

    const tr = ml[m] || {};
    /*
     * e.g. {en:'My view title',fr:'Mon titre'}
     */

    item[m] = tr[language] || tr[languages.default];
    /*
     * e.g. {view_title:'My view title', ...}
     */

    const as = config.idx_views.attributesStripHTML;
    const toStrip = as.includes(m);
    if (toStrip) {
      item[m] = htmlToText(item[m], {wordwrap: false});
    }
  }

  /**
   * Set language in project data. Object => string
   * {title:{en:'Title','fr':'Titre'},...} => {title:'Title',...}
   */
  for (let p of pd) {
    for (let k in p) {
      if (valid.isObject(p[k])) {
        p[k] = p[k][language] || p[k][languages.default];
      }
    }
  }

  return item;
}

function cleanKeywords(arr) {
  return arr.map((k) => k.trim().toLowerCase());
}
