const {meili, pgRead} = require('@mapx/db');
const {createHash} = require('crypto');
const template = require('@mapx/template');
const {validation_defaults} = require('@root/settings');
const {wait} = require('@mapx/helpers');
const languages = validation_defaults.languages;
const {getDictM49iso3} = require('@mapx/language');
const {htmlToText} = require('html-to-text');
const {writeFileSync} = require('fs');
const {config} = require(__dirname + '/config.js');

/**
 * Search middleware sample
 * const {getParamsValidator} = require('@mapx/route_validation');
 * const {validateTokenHandler} = require('@mapx/authentication');
 * const {sendError} = require('@mapx/helpers');
 * const validateParamsHandler = getParamsValidator({
 *   required: ['idUser', 'token', 'searchQuery'],
 *   expected: ['searchIndexName']
 * });
 * const mwSearch = [validateParamsHandler, validateTokenHandler, handlerSearch];
 * async function handlerSearch(req, res) {
 *   try {
 *     const index = client.index(req.query.searchIndexName);
 *     const result = await index.search(req.query.searchQuery);
 *     await res.notifyData('search_result', {
 *       msg: result
 *     });
 *   } catch (err) {
 *     sendError(res, err);
 *   }
 * }
 */

module.exports = {
  updateIndex
};

/**
 * Bug in meili #1196: if addDocuments / updates occuring to quickly,
 * meili block, without stoping the server.
 */

//async function fixMeiliBlocking() {
//// await wait(10 * 1000);
//}

async function updateIndex() {
  try {
    let idIndex;
    const start = Date.now();
    /**
     * Extract documents from DB
     */

    const result = await pgRead.query(template.getViewsPublicForSearchIndex);
    const docViews = result.rows;
    const m49iso3 = await getDictM49iso3();

    /**
     * MeiliSearch health check
     */
    const ok = await meili.isHealthy();
    console.log(`MeiliSearch is healthy : ${ok ? 'YES' : 'NO'}`);

    /**
     * Clean keywords: trim, lowercase, ..
     * NOTE: this should have been done at save time : it's not
     * easy to do in postgres OR this add a step ... here.
     */
    for (let item of docViews) {
      item.source_keywords = cleanKeywords(item.source_keywords);
    }

    if (0) {
      /**
       * Remove all indexes
       */
      const idxAllPre = await meili.listIndexes();
      for (let idx of idxAllPre) {
        await meili.deleteIndex(idx.uid);
      }
    }

    /**
     * Keywords from source metadata
     * [id:1,key:"elephant"]
     */
    idIndex = `source_keywords`;
    const idxSourceKeywords = await meili.getOrCreateIndex(idIndex, {
      primaryKey: config.keywords.primaryKey
    });
    /**
     * Get distinct keywords
     */
    const docKeywordsRaw = docViews.map((r) => r.source_keywords);
    const docKeywordsFlat = [...new Set(docKeywordsRaw.flat())];
    const docKeywords = docKeywordsFlat.map((k) => {
      /**
       * Adding the primary key as hash.
       * - primary key can't be the key as no special char allowed. only 'A-Z a-z 0-9 and -_'  Using hash instead
       * - primary key should be unique AND related to the keyword, if not next update will produce duplicate
       */
      const keyword = k.charAt(0).toUpperCase() + k.slice(1);
      const item = {keyword};
      const hash = createHash('md5')
        .update(k || 'empty')
        .digest('hex');
      item[config.keywords.primaryKey] = hash;
      return item;
    });
    await idxSourceKeywords.addDocuments(docKeywords);
    await idxSourceKeywords.updateSettings({
      searchableAttributes: config.keywords.searchableAttributes
    });
    /**
     * Keywords from dictionary.
     * NOTE: client side, this is already included in
     * dictionnary by language, but for multilingual search,
     * we need access to the full thing.
     * search result: [id:"COD",key:"COD",fr:"Congo",...,<lang>: <text>"]
     */
    idIndex = `source_keywords_m49`;
    const idxSourceKeywordsM49 = await meili.getOrCreateIndex(idIndex, {
      primaryKey: config.keywords_m49.primaryKey
    });
    const docKeywordsM49 = m49iso3.map((m) => {
      m[config.keywords_m49.primaryKey] = m.id;
      return m;
    });

    await idxSourceKeywordsM49.addDocuments(docKeywordsM49);
    await idxSourceKeywordsM49.updateSettings({
      searchableAttributes: config.keywords_m49.searchableAttributes
    });
    /**
     * Views.
     * - Create an index for each language.
     * NOTE: we could search in the multilingual object, but the search
     * tool do not <em> stuff in object or array. Client side, this step should be added.
     * In addition, views could be matched, but the search terms does not appears in ui
     * if another language – not dispayed – matched the query.
     */
    for (let language of languages.codes) {
      idIndex = `views_${language}`;

      console.log(`Update start for index ${idIndex}`);

      const idxView = await meili.getOrCreateIndex(idIndex, {
        primaryKey: config.views.primaryKey
      });

      const doc = docViews.map((item) => {
        item = flatLanguageStrings(item, language);
        /**
         * Adding the primary key.
         */
        item[config.views.primaryKey] = item.view_id;
        return item;
      });
      const res = await idxView.addDocuments(doc);

      console.log(
        `curl -f http://search.mapx.localhost:8880/indexes/${idIndex}/updates/${
          res.updateId
        }`
      );

      /*
       * Update location synonyms for this language
       *
       * WARNING this could block meili
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
      //writeFileSync(`synonyms${language}.json`,JSON.stringify(locsyn))
      await idxView.updateSynonyms(locsyn);

      /**
       * Update settings
       */
      await idxView.updateSettings({
        rankingRules: config.views.rankingRules,
        searchableAttributes: config.views.searchableAttributes
      });
    }

    console.log(`Created search index in ${Date.now() - start} ms`);
  } catch (e) {
    console.log(`Failed to create search index`);
    console.error(e);
  }
}

function flatLanguageStrings(item, language) {
  const ml = item.meta_multilingual;
  for (let m in ml) {
    const tr = ml[m] || {};
    item[m] = tr[language] || tr[languages.default];
    if (config.views.attributesStripHTML.indexOf(m) > -1) {
      item[m] = htmlToText(item[m], {wordwrap: false});
    }
  }
  delete item.meta_multilingual;
  return item;
}

function cleanKeywords(arr) {
  return arr.map((k) => k.trim().toLowerCase());
}
