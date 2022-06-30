import {FlashItem} from './icon_flash/index.js';
import {getDictItem, getDictTemplate} from './language';
import {modalConfirm} from './mx_helper_modal.js';
import {clearAllCache, getStorageEstimate} from './cache_management/index.js';
import {removeCookie} from './mx_helper_cookies.js';

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
    await clearAllCache();
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

export function isProd(){
 return location.protocol === 'https:';
}
