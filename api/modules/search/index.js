import { meili, pgRead } from "#mapx/db";
import { getParamsValidator } from "#mapx/route_validation";
import { isObject } from "@fxi/mx_valid";
import { validateTokenHandler } from "#mapx/authentication";
import {
  clone,
  sendError,
  sendJSON,
  sortObjectByKeys,
  wait,
} from "#mapx/helpers";
import { templates } from "#mapx/template";
import { settings } from "#root/settings";
import { htmlToText } from "html-to-text";
import { config } from "./config.js";
import { getDictM49iso3 } from "#mapx/language";
const keysStripHTML = config.idx_views.attributesStripHTML;
const {
  validation_defaults: { languages },
} = settings;

const validateParamsHandler = getParamsValidator({
  required: ["idUser", "token"],
  expected: ["searchIndexName", "searchQuery"],
});

const mwSearch = [validateParamsHandler, validateTokenHandler, handlerSearch];
const mwGetSearchKey = [
  validateParamsHandler,
  validateTokenHandler,
  handlerKey,
];

export { mwSearch, mwGetSearchKey, updateIndexes };

/**
 * Updates MeiliSearch indexes for all languages.
 * @async
 */
async function updateIndexes() {
  try {
    const cid = config.idx_views;
    const start = Date.now();
    const { rows: results } = await pgRead.query(
      templates.getViewsPublicForSearchIndex
    );
    const documents = results.map((doc) => ({
      ...doc,
      source_keywords: cleanKeywords(doc.source_keywords),
    }));

    for (const language of languages.codes) {
      await updateIndexForLanguage(language, documents, cid);
    }
    console.log(`Created search index in ${Date.now() - start} ms`);
  } catch (e) {
    console.error("Failed to create search index", e);
  }
  return true;
}

/**
 * Updates MeiliSearch index for a specific language.
 * @param {string} language - The language code.
 * @param {Array} documents - Array of documents to index.
 * @param {Object} cid - Configuration object for index.
 * @async
 */
async function updateIndexForLanguage(language, documents, cid) {
  const indexView = await meili.getOrCreateIndex(`views_${language}`, {
    primaryKey: cid.primaryKey,
  });

  await indexView.deleteAllDocuments();
  await indexView.updateAttributesForFaceting(cid.atributesForFaceting);
  await indexView.updateSettings({
    rankingRules: cid.rankingRules,
    searchableAttributes: cid.searchableAttributes,
  });

  const locsyn = generateLocaleSynonyms(language);
  await indexView.updateSynonyms(locsyn);

  const docsToIndex = documents.map((doc) => processDocuments(doc, language));
  await indexView.addDocuments(docsToIndex);

  await wait(5000);
}

/**
 * Generates synonyms for locale-based searches.
 * @async
 * @param {string} language - The language code.
 * @returns {Promise<Object>} Locale synonyms.
 */
async function generateLocaleSynonyms(language) {
  const m49iso3 = await getDictM49iso3();
  const locsyn = {};
  for (const loc of m49iso3) {
    const code = loc.id;
    const str = loc[language];
    if (str && code) {
      locsyn[code] = [str];
      locsyn[str] = [code];
    }
  }
  return locsyn;
}

/**
 * Handler to get MeiliSearch keys.
 * @param {Object} _ - Request object.
 * @param {Object} res - Response object.
 * @async
 */
async function handlerKey(_, res) {
  try {
    const keys = await meili.getKeys();
    sendJSON(res, { key: keys.private }, { end: true });
  } catch (err) {
    sendError(res, err);
  }
}

/**
 * Handler to perform a search on MeiliSearch.
 * @param {Object} req - Request object.
 * @param {Object} res - Response object.
 * @async
 */
async function handlerSearch(req, res) {
  try {
    const index = meili.index(req.query.searchIndexName);
    const result = await index.search(req.query.searchQuery);
    await res.notifyData("search_result", { msg: result });
  } catch (err) {
    sendError(res, err);
  }
}

/**
 * Processes documents for a specific language.
 * @param {Object} item - Document item.
 * @param {string} language - The language code.
 * @returns {Object} Processed document.
 */
function processDocuments(item, language) {
  const itemClone = clone(item);
  const ml = itemClone.meta_multilingual || {};
  const pt = itemClone.projects_title_multilingual || [];
  const pd = itemClone.projects_description_multilingual || [];
  const gm = itemClone.source_keywords_gemet_multilingual || [];
  const m4 = itemClone.source_keywords_m49_multilingual || [];

  /**
   * New arrays for the document
   * - specific for current language
   * - not practical to set in DB query
   */
  itemClone.source_keywords_gemet_label = [];
  itemClone.source_keywords_m49_label = [];
  itemClone.projects_title = [];
  itemClone.projects_description = [];

  /**
   * Gemet multilingual
   * - Add new array  of labels
   * - Remove multilingual object
   */
  for (const g of gm) {
    itemClone.source_keywords_gemet_label.push(
      g[language] || g[languages.default]
    );
  }
  delete itemClone.source_keywords_gemet_multilingual;

  /**
   * M49 / ISO3 geo codes
   * - Add new array of labels
   * - Remove multilingual object
   */
  for (const m of m4) {
    itemClone.source_keywords_m49_label.push(
      m[language] || m[languages.default]
    );
  }
  delete itemClone.source_keywords_m49_multilingual;

  /**
   * Meta multilingual
   * - Convert to text
   * - Save at first level
   * - Remmove multilingual object
   */
  for (const m in ml) {
    const tr = ml[m] || {};
    itemClone[m] = tr[language] || tr[languages.default];
    const toStrip = keysStripHTML.includes(m);
    if (toStrip) {
      itemClone[m] = htmlToText(itemClone[m], { wordwrap: false });
    }
  }
  delete itemClone.meta_multilingual;

  /**
   * Project multilingual
   * - Add new aray of label
   * - Remove projects_data
   */
  for (let p of pd) {
    if (isObject(p)) {
      const desc = p[language] || p[languages.default];
      if (desc) {
        itemClone.projects_description.push(desc);
      }
    }
  }
  for (let p of pt) {
    if (isObject(p)) {
      const title = p[language] || p[languages.default];
      if (title) {
        itemClone.projects_title.push(title);
      }
    }
  }
  delete itemClone.projects_description_multilingual;
  delete itemClone.projects_title_multilingual;

  /**
   * Sort for readability
   */
  const itemCloneSorted = sortObjectByKeys(itemClone);
  return itemCloneSorted;
}

/**
 * Cleans keywords by trimming and converting to lowercase.
 * @param {Array} arr - Array of keywords.
 * @returns {Array} Cleaned keywords.
 */
function cleanKeywords(arr) {
  return arr.map((k) => k.trim().toLowerCase());
}
