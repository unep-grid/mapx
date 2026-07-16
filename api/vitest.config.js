import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["index.js", "routines.js", "modules/**/*.js"],
      exclude: ["**/*.test.js"],
      reporter: ["text-summary", "json-summary", "html", "lcov"],
    },
  },
});
