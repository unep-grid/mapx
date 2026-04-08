export default {
  resolve: {
    // theme-core is a symlinked local package; its transitive deps must
    // resolve from app/node_modules (not the submodule's physical path).
    dedupe: ["pmtiles", "maplibre-contour", "maplibre-gl", "chroma-js"],
  },
  test: {
    environment: "jsdom",
    environmentMatchGlobs: [
      ['**/test/build/**', 'node']  // Use node environment for build tests
    ],
    setupFiles: ["./vitest.setup.js"],
  },
  assetsInclude: ["**/*.html"],
};
