/**
 * Simple binding
 */
export { bindAll };
function bindAll(targetClass) {
  const props = Object.getOwnPropertyNames(Object.getPrototypeOf(targetClass));
  for (const key of props) {
    if (targetClass[key] instanceof Function && key !== "constructor") {
      targetClass[key] = targetClass[key].bind(targetClass);
    }
  }
}
