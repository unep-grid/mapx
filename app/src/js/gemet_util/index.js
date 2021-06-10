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
 * Same as searchGemet, but label + definition in same object
 */

async function searchGemetLabelDefinition(txt) {
  const res = await searchGemet(txt);
  /**
   * Combine labels + definition
   * 1) Check if matching definition exists ( search also retrieved definition )
   * -> yes, use this.
   * -> no, try to fetch remote.
   * NOTE: alternative, retrieve all definitions at once using array of id.
   */
  const list = res.hits || [];
  const labels = list.filter((l) => l.type === 'prefLabel');
  
  const definitions = list.filter((l) => l.type === 'definition');
  
  const out = [];
  for (let label of labels) {
    const item = {};
    const definition =
      definitions.find((d) => d.concept === label.concept) || {};
    item.value = label.concept;
    item.label = label.text;
    item.definition = definition?.text;
    if(!item.definition){
      const concept = await getGemetConcept(label.concept);
      const valid = Array.isArray(concept) && concept.length;
      if(valid){
        item.definition = concept[0].definition;
      }
    }
    out.push(item);
  }
  return out;
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
  searchGemetLabelDefinition,
  getGemetConcept,
  getGemetConceptLink
};
