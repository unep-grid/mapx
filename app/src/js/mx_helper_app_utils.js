import {miniCacheClear} from './minicache';
import {FlashItem} from './icon_flash/index.js';
import {getDictItem, getDictTemplate} from './mx_helper_language.js';
import {modalConfirm} from './mx_helper_modal.js';
import {removeCookie} from './mx_helper_cookies.js';
import {formatByteSize} from './mx_helper_misc';
/**
 * Remove service worker cache
 */
export async function clearMapxCache() {
  const remove = await modalConfirm({
    title: getDictItem('utils_clear_cache_title'),
    content: getDictTemplate('utils_clear_cache', {
      usage: await getStorageEstimate({format: true})
    })
  });
  if (remove) {
    if ('serviceWorker' in navigator) {
      const cacheNames = await caches.keys();
      for (let cacheName of cacheNames) {
        caches.delete(cacheName);
      }
      mx.data.draft.dropInstance();
      mx.data.geojson.dropInstance();
      if (mx.nc) {
        mx.nc.clearHistory();
      }
      miniCacheClear();
      clearServiceWorker();
      new FlashItem('trash-o');
      const confirmReload = await modalConfirm({
        title: getDictItem('utils_clear_cache_reload_title'),
        content: getDictItem('utils_clear_cache_reload')
      });
      if (confirmReload) {
        removeCookie();
        reload();
      }
    }
  }
}

/**
 * Unregister service worker
 */
async function clearServiceWorker() {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (let registration of registrations) {
      registration.unregister();
    }
  }
}

/**
 * Refresh the page
 */
export function reload() {
  window.location.reload();
}

/**
 * Get version as array [major,minor,maintenance]
 */
export function getVersion() {
  return mx.version;
}

/**
 * Get usage browser storage usage estimate, with optional formating
 * @param {Object} opt Options
 * @param {Boolean} opt.format Return human friendly string, e.g (31 MiB)
 * @return {Numeric|String} Estimated usage
 */

export async function getStorageEstimate(opt) {
  let usage = 0;
  try {
    opt = Object.assign({}, {format: true}, opt);
    const est = await navigator.storage.estimate();
    usage = est.usage;
  } catch (e) {
    console.warn('getStorageEstimate failed to estimate storage size.');
  }
  if (opt.format) {
    usage = formatByteSize(usage);
  }

  return usage;
}
