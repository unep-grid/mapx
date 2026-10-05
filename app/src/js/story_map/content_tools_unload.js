/**
 * Prevent ContentTools from registering a window `unload` listener.
 *
 * ContentTools (unmaintained) adds `unload` in `_addDOMEventListeners` to
 * destroy the editor. Chrome deprecates `unload` through a default permissions
 * policy and logs a violation. MapX destroys the editor explicitly, so the
 * listener is dropped; other listeners, including `beforeunload`, are kept.
 *
 * @param {{EditorApp: {getCls: () => Function}}} ContentTools ContentTools module
 */
export function disableUnloadListener(ContentTools) {
  const proto = ContentTools.EditorApp.getCls().prototype;
  const addDOMEventListeners = proto._addDOMEventListeners;

  proto._addDOMEventListeners = function (...args) {
    const addEventListener = window.addEventListener;
    window.addEventListener = function (type, ...rest) {
      if (type === "unload") {
        return;
      }
      return addEventListener.call(this, type, ...rest);
    };
    try {
      return addDOMEventListeners.apply(this, args);
    } finally {
      window.addEventListener = addEventListener;
    }
  };
}
