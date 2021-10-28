import {isJson, isString} from './../is_test/index.js';
/**
* Generic handler 
* @param {String|Object} err Error message or object
* @return NULL
*/
export function errorHandler(err) {
  const errObject = errorFormater(err);
  const src = errObject?.sourceId;
  if (src) {
    errObject.message = `${errObject.message} (source:${src} )`;
  }
  console.error(errObject);
}
/**
* Generic error formater, produce an Error object from text or object
* @note : depending on what produced the error, it could have many shape: promise, map, api, fetch_xhr, etc.. 
* @param {String|Object} err Error message or object
* @return {Error}  
*/
export function errorFormater(e) {
  if(e instanceof Error){
     return e;
  }
  if(!e){
    e = {};
  }
  if (isJson(e)) {
    e = JSON.parse(e);
  }
  if (isString(e)) {
    e = {
      message: e
    };
  }
  if (!e.message) {
    const msg =
      e?.msg ||
      e?.error?.message ||
      e?.reason?.message ||
      e?.reason ||
      'Unspecified';
    e = {
      message: msg
    };
  }
  return Object.assign(new Error(),e);
}
