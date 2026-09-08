/*
 * Get a simple state : object with properties not extensible
 * @param {Object} obj Original state ;
 * @return {Proxy} state
 */
export function createState(obj) {
  let proxy = new Proxy(obj, {
    set(target, property, value) {
      if (property in target) {
        target[property] = value;
        return true;
      } else {
        console.log("Adding new properties is not allowed");
        return false;
      }
    },
  });
  return proxy;
}
