import { getApiUrl } from "./../api_routes";
import { isUrl } from "./../is_test/index.js";
import { modalMirror } from "./tool_modal.js";

export { modalMirror };

/**
 * Create a composite url for our miror
 * @example
 * // returns http://test.com/get/mirror?url=http%3A%2F%2Fgoogle.com
 * mirrorUrlCreate('http://google.com');
 * @param {String} url URL to access
 * @return {String} url string e.g.
 */
export function mirrorUrlCreate(url) {
  if (!isUrl(url)) {
    throw new Error(`Not a valid URL`);
  }
  if (isMirrorUrl(url)) {
    console.warn("Trying to create an mirrored url already mirrored");
    return url;
  }
  const mUrl = new URL(getApiUrl("getMirror"));
  mUrl.searchParams.set("url", url);
  /**
   * Replace % utf8 escaped brackets by the actual character.
   * -> if not, {bbox-epsg-3857}, {z}, {x} template
   *    do not work when used as source for mapbox-gl
   * Brackets are not considered as reservered characters in
   * https://datatracker.ietf.org/doc/html/rfc3986
   * -> it should be fine and I don't know why there are
   *    escaped in the first place
   */
  return mUrl.href.replaceAll("%7B", "{").replaceAll("%7D", "}");
}

/**
 * Test if an url is mirrored
 * @example
 * // returns true
 * isMirrorUrl('http://test.com/get/mirror?url=http%3A%2F%2Fgoogle.com');
 * @param {String} url URL string to test
 * @return {Boolean} contains expected path for mirror url
 */
export function isMirrorUrl(url) {
  const mUrl = new URL(getApiUrl("getMirror"));
  const tUrl = new URL(url);
  return mUrl.pathname === tUrl.pathname;
}

/**
 * Extract mirrored url
 * @example
 * // returns https://google.com
 * mirrorUrlGet('http://test.com/get/mirror?url=http%3A%2F%2Fgoogle.com')
 * @param {String} url Input mirror url
 * @return {String} mirrored url.
 */
export function mirrorUrlGet(url) {
  if (!isMirrorUrl(url)) {
    console.warn("Trying to get the mirrored url from a non-mirrored url");
    return url;
  }
  const mUrl = new URL(url);
  return mUrl.searchParams.get("url");
}


/**
* Fetch url, using mirror. Takes cares of mapbox bbox brackets 
* @param {String} url Url to fetch
* @param {Any} opt Fetch method options 
* @return {Promise} Fetch promise 
*/ 
export function fetchMirror(url,opt) {
  const urlMirror = mirrorUrlCreate(url);
  return fetch(urlMirror,opt);
}
