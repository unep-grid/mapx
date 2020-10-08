import storage from 'localforage';
import {isObject} from './../is_test/index.js';
/**
 * Based on https://gist.github.com/okoghenun/dc176adc88024a914ffaf8d6c4c7e6b9
 */
const miniCacheDb = storage.createInstance({
  name: 'minicache'
});

const def = {
  ttl: 1000 * 60 * 60 * 24 // 1 day
};

export async function miniCacheSet(key, value, opt) {
  opt = Object.assign({}, def, opt);
  const item = {
    ts: new Date().getTime() + parseInt(opt.ttl),
    value: JSON.parse(JSON.stringify(value))
  };
  let out = null;
  try {
    out = await miniCacheDb.setItem(key, item);
  } catch (e) {
    throw new Error(e);
  }

  return out;
}

export async function miniCacheGet(key) {
  const res = await miniCacheDb.getItem(key);
  if (!isObject(res)) {
    return;
  }
  const valid = new Date().getTime() < parseInt(res.ts);
  if (valid) {
    return res.value;
  } else {
    miniCacheDb.removeItem(key);
    return null;
  }
}

export async function miniCacheRemove(key) {
  const res = await miniCacheDb.getItem(key);
  if (!isObject(res)) {
    return;
  }
  miniCacheDb.removeItem(key);
}

export async function miniCacheClear() {
  return await miniCacheDb.dropInstance();
}
