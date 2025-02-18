export default {
  test: {
    environment: "jsdom",
    environmentMatchGlobs: [
      ['**/test/build/**', 'node']  // Use node environment for build tests
    ],
    setupFiles: ["./vitest.setup.js"],
  },
  assetsInclude: ["**/*.html"],
};
