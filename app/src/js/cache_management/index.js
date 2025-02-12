import { formatByteSize } from "./../mx_helper_misc";
import { miniCacheClear } from "./../minicache";
import { nc, data as mx_storage } from "./../mx.js";
import { prefReset } from "../user_pref";

/**
 * Remove all accessible caches
 */
export async function clearAllCache() {
  await Promise.all([clearServiceWorker(), clearForageCache(), clearSwCache()]);
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
    opt = Object.assign({}, { format: false }, opt);
    const est = await navigator.storage.estimate();
    usage = est.usage;
  } catch (e) {
    console.warn("getStorageEstimate failed to estimate storage size.");
  }
  if (opt.format) {
    usage = formatByteSize(usage);
  }

  return usage;
}

/**
 * Clear MapX local data
 */
export async function clearForageCache() {
  await mx_storage.draft.dropInstance();
  await mx_storage.geojson.dropInstance();
  await prefReset();
  await miniCacheClear();
  nc.clearHistory();
  return true;
}
/**
 * Unregister service worker
 */
export async function clearServiceWorker() {
  let hadSW = false;
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (let registration of registrations) {
      hadSW = true;
      registration.unregister();
    }
  }
  return hadSW;
}

/**
 * Remove cache
 */
export async function clearSwCache() {
  console.log(`SW - Clear cache`);
  let hadCache = false;
  const items = await caches.keys();
  for (const item of items) {
    hadCache = true;
    await caches.delete(item);
  }
  return hadCache;
}
