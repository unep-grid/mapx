import {formatByteSize} from './../mx_helper_misc';
import {miniCacheClear} from './../minicache';

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
    opt = Object.assign({}, {format: false}, opt);
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

/**
 * Clear Mapx DB
 */
export async function clearForageCache() {
  if (mx) {
    if (mx?.data?.draft) {
      await mx.data.draft.dropInstance();
    }
    if (mx?.data?.geojson) {
      await mx.data.geojson.dropInstance();
    }
    if (mx?.nc) {
      mx.nc.clearHistory();
    }
  }
  await miniCacheClear();
  return true;
}
/**
 * Unregister service worker
 */
export async function clearServiceWorker() {
  let hadSW = false;
  if ('serviceWorker' in navigator) {
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
