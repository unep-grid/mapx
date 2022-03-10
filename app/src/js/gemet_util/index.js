import {config} from './config.js';
import {getApiUrl} from './../api_routes';

/**
 * Get array of concepts by similarity search
 * @param {String} txt Value to search
 * @return {Object} {hits:[{type:<string>,concept:<id>,text:<string>}], ...}
 */
async function searchGemet(txt) {
  try {
    const lang = mx.settings.language;
    const url = new URL(getApiUrl(config.path_api_search));
    url.searchParams.set('language', lang);
    url.searchParams.set('searchText', txt);
    const resp = await fetch(url);
    const res = await resp.json();
    if (res && res.type === 'error') {
      throw new Error(res.message);
    }
    return res;
  } catch (e) {
    throw new Error(e);
  }
}

/**
 * Get concept object by id or uri
 * @param {String|array} id Id of the concept or array of id
 * @return {Object} {label:<string>,value:id,definition:<string>}
 */
async function getGemetConcept(id) {
  try {
    const lang = mx.settings.language;
    const url = new URL(getApiUrl(config.path_api_concept));
    url.searchParams.set('idConcepts', id);
    url.searchParams.set('language', lang);
    const resp = await fetch(url);
    const res = await resp.json();
    if (res && res.type === 'error') {
      throw new Error(res.message);
    }
    return res;
  } catch (e) {
    throw new Error(e);
  }
}

function getGemetConceptLink(id) {
  const url = new URL(config.thesaurus_link + id);
  url.searchParams.set('language', mx.settings.language);
  return url;
}

export {searchGemet, getGemetConcept, getGemetConceptLink};
