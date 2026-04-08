// maplibre-gl v5 calls URL.createObjectURL at module init to register the web worker.
// jsdom does not implement it; stub it so the module loads without error.
if (typeof URL.createObjectURL === 'undefined') {
  URL.createObjectURL = () => '';
}
