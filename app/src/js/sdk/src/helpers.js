import * as t from '../../is_test/index.js';

export function stringify(data) {
  
  try{
    return JSON.stringify(sanitizeJson(data));
  }catch(e){
    console.error('Error in stringify helper',e,data);
  }
}

export function parse(str) {
  return JSON.parse(str);
}

export function sanitizeJson(data) {
  if (t.isString(data) || t.isNumeric(data)) {
    return data;
  }

  const isArr = t.isArray(data);
  const isObj = t.isObject(data);
  const out = isArr ? [] : {};
  const keys = isArr ? data : isObj ? Object.keys(data) : null;

  
  keys.forEach((k) => {
    const valid = t.isStringifiable(isArr ? k : data[k]);
    if (valid) {
      if (isArr) {
        out.push(k);
      } else {
        out[k] = data[k];
      }
    }
  });
  return out;
}
