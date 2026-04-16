import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  resolve: {
    alias: {
      "@unep-grid/mapx-style": path.resolve(
        __dirname,
        "../submodules/mapx-style/packages/theme-core/src/index.js",
      ),
    },
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
