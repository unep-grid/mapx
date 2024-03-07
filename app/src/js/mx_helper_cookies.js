import { isNotEmpty } from "./is_test";
import { reload } from "./mx_helper_app_utils";
/**
 * NOTE: this was used to store encrypted token
 * in cookies. The name persisted but we store
 * things in localStorage instead. If stored stuff
 * become huge, consider using async method :
 * - mapx miniCache
 * - localforage
 */

/**
 * Read all cookies
 *
 * @return {Object} Object containing cookies values
 */
export function readCookie() {
  const str = localStorage.getItem("mx-cookies");
  const out = {};
  try {
    const stored = JSON.parse(str);
    return Object.assign({}, out, stored);
  } catch (e) {
    console.warn(e);
    return out;
  }
}

/**
 * Write cookies based on object keys
 * @param e {Object}
 * @param e.cookie {Object} Object containing cookies name and values
 * @param e.reload {Boolean} Reload location
 */
export function writeCookie(e) {
  e = Object.assign({}, { reload: false, deleteAll: false, cookie: null }, e);
  if (e.deleteAll) {
    e.cookie = { mx_token: "" };
  }
  if (isNotEmpty(e.cookie)) {
    const cookieStr = JSON.stringify(e.cookie);
    localStorage.setItem("mx-cookies", cookieStr);
  }
  if (e.reload) {
    reload();
  }
}

/**
 * Get mx_token
 * @return {String} Mapx encrypted mx_token, if exists.
 */

export function getToken() {
  const data = readCookie();
  return data.mx_token;
}

/**
 * Set mx_token
 * @param {String} valid encrypted token.
 */

export function setToken(str) {
  if (str) {
    const data = readCookie();
    data.mx_token = str;
    writeCookie({
      cookie: data,
      reload: true,
    });
  }
}

/**
 * Remove mapx cookies
 * @param e.reload {Boolean} Reload location
 */
export function removeCookie(e) {
  e = Object.assign({}, { reload: false }, e);
  localStorage.setItem("mx-cookies", "{}");
  if (e.reload) {
    reload();
  }
}
