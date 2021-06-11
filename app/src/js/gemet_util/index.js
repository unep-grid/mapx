import {config} from './config.js';
import {getApiUrl} from './../mx_helper_map.js';

/**
 * Get array of concepts by similarity search
 * @param {String} txt Value to search
 * @return {Object} {hits:[{type:<string>,concept:<id>,text:<string>}], ...}
 */
async function searchGemet(txt) {
  const lang = mx.settings.language;
  const url = new URL(getApiUrl(config.path_api_search));
  url.searchParams.set('language', lang);
  url.searchParams.set('searchText', txt);
  const resp = await fetch(url);
  return await resp.json();
}

/**
 * Get concept object by id or uri
 * @param {String|array} id Id of the concept or array of id
 * @return {Object} {label:<string>,value:id,definition:<string>}
 */
async function getGemetConcept(id) {
  const lang = mx.settings.language;
  const url = new URL(getApiUrl(config.path_api_concept));
  url.searchParams.set('idConcepts',id);
  url.searchParams.set('language', lang);
  const resp = await fetch(url);
  return await resp.json();
}

function getGemetConceptLink(id) {
  const url = new URL(config.thesaurus_link + id);
  url.searchParams.set('language',mx.settings.language);
  return url;
}

export {
  searchGemet,
  getGemetConcept,
  getGemetConceptLink
};
