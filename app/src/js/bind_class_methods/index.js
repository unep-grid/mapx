/**
 * Simple binding
 */

export {bindAll};
function bindAll(targetClass) {
  const props = Object.getOwnPropertyNames(Object.getPrototypeOf(targetClass));
  props.forEach((key) => {
    if (targetClass[key] instanceof Function && key !== 'constructor') {
      targetClass[key] = targetClass[key].bind(targetClass);
    }
  });
}
