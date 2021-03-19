const {meili, pgRead} = require('@mapx/db');
const {getParamsValidator} = require('@mapx/route_validation');
const {validateTokenHandler} = require('@mapx/authentication');
const {sendError} = require('@mapx/helpers');
const template = require('@mapx/template');
const {validation_defaults} = require('@root/settings');
const languages = validation_defaults.languages;
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
  rankingRules: [
    'typo',
    'words',
    'proximity',
    'attribute',
    'wordsPosition',
    'exactness',
    'desc(view_modified_at)'
  ],
  attributesStripHTML: ['view_abstract', 'source_abstract']
};

setTimeout(updateIndex, 100);

async function updateIndex() {
  try {
    const start = Date.now();
    const result = await pgRead.query(template.getViewsPublicForSearchIndex);
    const documents = result.rows
    for (let language of languages.codes) {
      const index = await meili.getOrCreateIndex(`views_${language}`);
      const doc = documents.map((item) => {
        return convertMultilanguage(item, language);
      });
      index.addDocuments(doc);
      index.updateAttributesForFaceting(config.atributesForFaceting);
      index.updateSettings({rankingRules: config.rankingRules});
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

function convertMultilanguage(item, language) {
  const ml = item.meta_multilingual;
  for (let m in ml) {
    const tr = ml[m] || {};
    item[m] = tr[language] || tr[languages.default];
    if(config.attributesStripHTML.indexOf(m) > -1){
      item[m] = htmlToText(item[m])
    }
  }
  item.source_keywords = (item.source_keywords || []).map(cleanKeywords);
  delete item.meta_multilingual;
  return item;
}

function cleanKeywords(str) {
  return str.trim().toLowerCase();
}

