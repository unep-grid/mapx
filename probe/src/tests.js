/*
 * TEST OF MAPBOX GL AND WEBSOCKET: one by one
 * based on https://github.com/mapbox/mapbox-gl-supported/blob/gh-pages/index.js
 */
export function isBrowser() {
  return !!(typeof window !== 'undefined' && typeof document !== 'undefined');
}

export function isArraySupported() {
  return !!(
    Array.prototype &&
    Array.prototype.every &&
    Array.prototype.filter &&
    Array.prototype.forEach &&
    Array.prototype.indexOf &&
    Array.prototype.lastIndexOf &&
    Array.prototype.map &&
    Array.prototype.some &&
    Array.prototype.reduce &&
    Array.prototype.reduceRight &&
    Array.isArray
  );
}

export function isFunctionSupported() {
  return !!(Function.prototype && Function.prototype.bind);
}

export function isObjectSupported() {
  return !!(
    Object.keys &&
    Object.create &&
    Object.getPrototypeOf &&
    Object.getOwnPropertyNames &&
    Object.isSealed &&
    Object.isFrozen &&
    Object.isExtensible &&
    Object.getOwnPropertyDescriptor &&
    Object.defineProperty &&
    Object.defineProperties &&
    Object.seal &&
    Object.freeze &&
    Object.preventExtensions
  );
}

export function isJSONSupported() {
  return !!('JSON' in window && 'parse' in JSON && 'stringify' in JSON);
}

export function isWorkerSupported() {
  if (!('Worker' in window && 'Blob' in window && 'URL' in window)) {
    return false;
  }

  var blob = new Blob([''], {
    type: 'text/javascript'
  });
  var workerURL = URL.createObjectURL(blob);
  var supported;
  var worker;

  try {
    worker = new Worker(workerURL);
    supported = true;
  } catch (e) {
    supported = false;
  }

  if (worker) {
    worker.terminate();
  }
  URL.revokeObjectURL(workerURL);

  return supported;
}

// IE11 only supports `Uint8ClampedArray` as of version
// [KB2929437](https://support.microsoft.com/en-us/kb/2929437)
export function isUint8ClampedArraySupported() {
  return !!('Uint8ClampedArray' in window);
}

// https://github.com/mapbox/mapbox-gl-supported/issues/19
export function isArrayBufferSupported() {
  return !!ArrayBuffer.isView;
}

export function isWebGLSupported() {
  var canvas = document.createElement('canvas');
  var attributes = {
    antialias: false,
    alpha: true,
    stencil: true,
    depth: true
  };
  if (canvas.probablySupportsContext) {
    return !!(
      canvas.probablySupportsContext('webgl', attributes) ||
      canvas.probablySupportsContext('experimental-webgl', attributes)
    );
  } else if (canvas.supportsContext) {
    return !!(
      canvas.supportsContext('webgl', attributes) ||
      canvas.supportsContext('experimental-webgl', attributes)
    );
  } else {
    return !!(
      canvas.getContext('webgl', attributes) ||
      canvas.getContext('experimental-webgl', attributes)
    );
  }
}

export function isWebsocketSupported() {
  return !!window.WebSocket;
}
