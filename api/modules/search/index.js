import {meili, pgRead} from '#mapx/db';
import {getParamsValidator} from '#mapx/route_validation';
import {isObject} from '@fxi/mx_valid';
import {validateTokenHandler} from '#mapx/authentication';
import {sendError, sendJSON, wait} from '#mapx/helpers';
import {templates} from '#mapx/template';
import {settings} from '#root/settings';
import {htmlToText} from 'html-to-text';
import {config} from './config.js';
import {getDictM49iso3} from '#mapx/language';

const {validation_defaults } = settings;
const {
  languages
} = validation_defaults;

const validateParamsHandler = getParamsValidator({
  required: ['idUser', 'token'],
  expected: ['searchIndexName', 'searchQuery']
});

const mwSearch = [validateParamsHandler, validateTokenHandler, handlerSearch];
const mwGetSearchKey = [
  validateParamsHandler,
  validateTokenHandler,
  handlerKey
];

export  {
  mwSearch,
  mwGetSearchKey,
  updateIndexes
};

//updateIndexes();

async function updateIndexes() {
  try {
    const cid = config.idx_views;
    const start = Date.now();
    const result = await pgRead.query(templates.getViewsPublicForSearchIndex);
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
      const doc = documents.map(item => flatLanguageStrings(item, language));

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
  const itemClone = JSON.parse(JSON.stringify(item));
  const ml = itemClone.meta_multilingual || {};
  const pd = itemClone.projects_data || [];
  const gm = itemClone.source_keywords_gemet_multilingual;

  const g = itemClone.source_keywords_gemet;
  g.length = 0; // id replaced by label
  for (let k of gm) {
    if (k.language === language) {
      g.push(k.label);
    }
  }
  delete itemClone.source_keywords_gemet_multilingual
  /**
   * Extend document with itemClones from meta_multilingual
   */
  for (let m in ml) {
    /*
     * e.g. 'view_title', 'source_notes',...
     */

    const tr = ml[m] || {};
    /*
     * e.g. {en:'My view title',fr:'Mon titre'}
     */

    itemClone[m] = tr[language] || tr[languages.default];
    /*
     * e.g. {view_title:'My view title', ...}
     */

    const as = config.idx_views.attributesStripHTML;
    const toStrip = as.includes(m);
    if (toStrip) {
      itemClone[m] = htmlToText(itemClone[m], {wordwrap: false});
    }
  }
  delete itemClone.meta_multilingual

  /**
   * Set language in project data. Object => string
   * {title:{en:'Title','fr':'Titre'},...} => {title:'Title',...}
   */
  for (let p of pd) {
    for (let k in p) {
      if (isObject(p[k])) {
        p[k] = p[k][language] || p[k][languages.default];
      }
    }
  }

  return itemClone;
}

function cleanKeywords(arr) {
  return arr.map((k) => k.trim().toLowerCase());
}
