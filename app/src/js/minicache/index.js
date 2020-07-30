import storage from 'localforage';
import {isObject} from './../is_test/index.js';
/**
 * Based on https://gist.github.com/okoghenun/dc176adc88024a914ffaf8d6c4c7e6b9
 */
const store = storage.createInstance({
  name: 'minicache'
});

const def = {
  ttl: 1000 * 60 * 60 * 24 // 1 day
};

export function cacheSet(key, value, opt) {
  opt = Object.assign({}, def, opt);
  const item = {
    ts: new Date().getTime() + parseInt(opt.ttl),
    value: value
  };
  return store.setItem(key, item);
}

export async function cacheGet(key) {
  const res = await store.getItem(key);
  if (!isObject(res)) {
    return;
  }
  const valid = new Date().getTime() < parseInt(res.ts);
  if (valid) {
    return res.value;
  } else {
    store.removeItem(key);
    return null;
  }
}
