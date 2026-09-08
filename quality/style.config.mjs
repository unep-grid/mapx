import { readFileSync } from "node:fs";
import parser from "@typescript-eslint/parser";
import prettier from "eslint-config-prettier";

// Shared verbatim across MapX and its Git submodules; checked for drift in CI.
const ignores = readFileSync(
  new URL("../.prettierignore", import.meta.url),
  "utf8",
)
  .split(/\r?\n/)
  .filter((line) => line && !line.startsWith("#"));

/** @type {import("eslint").Linter.Config[]} */
export default [
  { ignores },
  prettier,
  {
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: { curly: ["error", "all"] },
  },
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    languageOptions: { parser },
  },
  {
    files: ["**/*.{cjs,cts}"],
    languageOptions: { sourceType: "commonjs" },
  },
];
