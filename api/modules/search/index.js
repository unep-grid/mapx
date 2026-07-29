import { meili, pgReadLong } from "#mapx/db";
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
import { buildSourceTiles } from "./tiles.js";
const keysStripHTML = config.idx_views.attributesStripHTML;
const {
  validation_defaults: { languages },
} = settings;

const validateParamsHandler = getParamsValidator({
  required: ["idUser", "token"],
  expected: ["searchIndexName", "searchQuery"],
});

const mwGetSearchKey = [
  validateParamsHandler,
  validateTokenHandler,
  handlerKey,
];

export { mwGetSearchKey, updateIndexes };

/**
 * Updates MeiliSearch indexes for all languages.
 * @async
 */
async function updateIndexes() {
  try {
    const cid = config.idx_views;
    const start = Date.now();
    const { rows: results } = await pgReadLong.query(
      templates.getViewsPublicForSearchIndex
    );
    const documents = results.map((doc) => ({
      ...doc,
      source_keywords: cleanKeywords(doc.source_keywords),
      source_tiles: buildSourceTiles(doc, settings.api),
    }));

    for (const language of languages.codes) {
      await updateIndexForLanguage(language, documents, cid);
    }
    console.log(`Created search index in ${Date.now() - start} ms`);
  } catch (e) {
    console.error("Failed to create search index", e);
    throw e;
  }
}

/**
 * Retries an async operation, with exponential backoff.
 * Absorbs transient transport failures ( see #1102 ).
 * @param {Function} fn - Async operation to retry.
 * @param {Object} opt - Options.
 * @param {number} opt.attempts - Max attempts.
 * @param {number} opt.baseDelayMs - First retry delay, doubled each attempt.
 * @async
 */
async function withRetry(fn, { attempts = 3, baseDelayMs = 2000 } = {}) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      /**
       * 4xx = semantic error, retrying cannot succeed.
       */
      const status = e?.response?.status;
      if (status && status < 500) {
        throw e;
      }
      lastErr = e;
      if (i < attempts - 1) {
        console.warn(`Meili operation failed, retry ${i + 1}/${attempts - 1}`, e);
        await wait(baseDelayMs * 2 ** i);
      }
    }
  }
  throw lastErr;
}

/**
 * Throws if a settled task did not succeed :
 * waitTask() resolves even for failed tasks.
 * @param {Object} task - Settled MeiliSearch task.
 * @returns {Object} The task, when successful.
 */
function assertTaskOk(task) {
  if (task.status !== "succeeded") {
    throw new Error(
      `Meili task ${task.uid} (${task.type}) ${task.status}: ${JSON.stringify(
        task.error
      )}`
    );
  }
  return task;
}

/**
 * Checks if an index exists.
 * Do not use deleteIndexIfExists / enqueue deletions blindly :
 * deleting a missing index leaves a failed task, which pollutes
 * the `tasks?statuses=failed` monitoring signal.
 * @param {string} uid - Index uid.
 * @returns {Promise<boolean>} True when the index exists.
 * @async
 */
async function indexExists(uid) {
  try {
    await meili.getRawIndex(uid);
    return true;
  } catch (e) {
    if (e?.cause?.code === "index_not_found") {
      return false;
    }
    throw e;
  }
}

/**
 * Updates MeiliSearch index for a specific language, atomically :
 * build a staging index, populate it, then swap it with the live
 * one. On failure, the live index is left untouched ( #1102 ).
 * @param {string} language - The language code.
 * @param {Array} documents - Array of documents to index.
 * @param {Object} cid - Configuration object for index.
 * @async
 */
async function updateIndexForLanguage(language, documents, cid) {
  const uid = `views_${language}`;
  const uidNext = `${uid}_next`;

  /**
   * Ensure the live index exists ( first boot, fresh volume ) :
   * swapIndexes requires both sides to exist.
   */
  if (!(await withRetry(() => indexExists(uid)))) {
    assertTaskOk(
      await withRetry(() =>
        meili.createIndex(uid, { primaryKey: cid.primaryKey }).waitTask()
      )
    );
  }

  /**
   * Remove leftover staging index from a previously failed run.
   */
  if (await withRetry(() => indexExists(uidNext))) {
    assertTaskOk(
      await withRetry(() => meili.deleteIndex(uidNext).waitTask())
    );
  }

  /**
   * Build the staging index.
   */
  assertTaskOk(
    await withRetry(() =>
      meili.createIndex(uidNext, { primaryKey: cid.primaryKey }).waitTask()
    )
  );
  const indexNext = meili.index(uidNext);

  try {
    /**
     * All settings in a single call / task.
     */
    const synonyms = await generateLocaleSynonyms(language);
    assertTaskOk(
      await withRetry(() =>
        indexNext
          .updateSettings({
            rankingRules: cid.rankingRules,
            searchableAttributes: cid.searchableAttributes,
            filterableAttributes: cid.filterableAttributes,
            synonyms,
          })
          .waitTask({ timeout: 60000 })
      )
    );

    const docsToIndex = documents.map((doc) => processDocuments(doc, language));
    assertTaskOk(
      await withRetry(() =>
        indexNext.addDocuments(docsToIndex).waitTask({ timeout: 120000 })
      )
    );

    /**
     * Sanity check before the swap : never swap in a partial index.
     */
    const { numberOfDocuments } = await indexNext.getStats();
    if (numberOfDocuments !== docsToIndex.length) {
      throw new Error(
        `Index ${uidNext}: expected ${docsToIndex.length} documents, got ${numberOfDocuments}`
      );
    }

    /**
     * Atomic swap : the live index gets the fresh documents and
     * settings in one step.
     */
    assertTaskOk(
      await withRetry(() =>
        meili
          .swapIndexes([{ indexes: [uid, uidNext] }])
          .waitTask({ timeout: 60000 })
      )
    );
  } catch (e) {
    /**
     * Rollback = leave the live index untouched. Best effort cleanup :
     * a leftover staging index is removed at the next run anyway.
     */
    await meili.deleteIndex(uidNext).catch(() => {});
    throw e;
  }

  /**
   * The staging index now holds the previous documents : cleanup.
   */
  try {
    assertTaskOk(await withRetry(() => meili.deleteIndex(uidNext).waitTask()));
  } catch (e) {
    console.error(`Cleanup of ${uidNext} failed (next run will clear it)`, e);
  }
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
 * Handler to get the MeiliSearch search-only API key.
 * Never expose the admin key : the frontend only needs search.
 * @param {Object} _ - Request object.
 * @param {Object} res - Response object.
 * @async
 */
async function handlerKey(_, res) {
  try {
    let key = "";
    try {
      const { results } = await meili.getKeys();
      const searchKey = results.find(
        (k) => k.actions.length === 1 && k.actions[0] === "search"
      );
      key = searchKey?.key || "";
    } catch (e) {
      /**
       * Keyless instance ( no master key, dev ) : the keys API is
       * not available, the client works without a key.
       */
      console.warn("Meili keys not available, returning empty key", e?.message);
    }
    sendJSON(res, { key }, { end: true });
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
