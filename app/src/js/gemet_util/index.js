import {config} from './config.js';

const str_search =
  config.url +
  '/getConceptsMatchingRegexByThesaurus?regex=&thesaurus_uri=' +
  config.thesaurus;
const str_get_concept = config.url + 'getConcept?concept_uri=';
const str_concept = config.url + 'concept/';
config.url_search = new URL(str_search);
config.url_get_concept = new URL(str_get_concept);
config.url_concept = new URL(str_concept);
config.regId = new RegExp(/[0-9]{1,4}$/g);

/**
 * Get array of concepts by regex search
 * @param {String} txt Value to search
 * @return {Array} [{label:<string>,value:id,definition:<string>}, ...]
 */
async function searchGemet(txt) {
  const lang = mx.settings.language;
  const url = config.url_search;
  url.searchParams.set('language', lang);
  url.searchParams.set('regex', txt);
  const resp = await fetch(url);
  const res = await resp.json();
  const out = res.map((r) => {
    const idConcept = parseInt(r.uri.match(config.regId));
    return {
      definition: r?.definition?.string || '',
      label: r?.preferredLabel?.string,
      value: idConcept
    };
  });
  return out;
}

/**
 * Get concept object by id or uri
 * @param {String} id Id of the concept
 * @return {Object} {label:<string>,value:id,definition:<string>}
 */
async function getGemetConcept(id) {
  const lang = mx.settings.language;
  const url = config.url_get_concept;
  const urlConcept = config.thesaurus;
  url.searchParams.set('concept_uri', urlConcept + id);
  url.searchParams.set('language', lang);
  const resp = await fetch(url);
  const res = await resp.json();
  const idConcept = parseInt(res.uri.match(config.regId));
  return {
    label: res?.preferredLabel?.string,
    value: idConcept,
    definition: res?.definition?.string || ''
  };
}

function getGemetConceptLink(id) {
  return config.thesaurus + id + "?language=" + mx.settings.language;
}



export {searchGemet, getGemetConcept, getGemetConceptLink};
