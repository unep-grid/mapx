import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const repositories = ["submodules/mapx-style/", "submodules/zartigl/"];
const tools = [
  "eslint",
  "@typescript-eslint/parser",
  "typescript",
  "eslint-config-prettier",
  "globals",
  "prettier",
];

/** @param {string} path */
async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

const manifest = JSON.parse(await read("package.json"));
for (const repository of repositories) {
  // Missing/uninitialized submodules must fail, never silently reduce coverage.
  const child = JSON.parse(await read(`${repository}package.json`));
  for (const file of [".prettierrc.json", "quality/style.config.mjs"]) {
    assert.equal(
      await read(`${repository}${file}`),
      await read(file),
      `${repository}${file} differs from the shared policy`,
    );
  }
  for (const tool of tools) {
    assert.equal(
      child.devDependencies[tool],
      manifest.devDependencies[tool],
      `${repository} must pin the same ${tool} version`,
    );
  }
  for (const command of ["format", "format:check", "lint", "lint:fix"]) {
    assert.equal(
      child.scripts[command],
      manifest.scripts[`${command}:local`],
      `${repository} must use the shared ${command} command`,
    );
  }
}
console.log("Submodule style policies and tool versions match.");
