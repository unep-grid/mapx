import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import * as prettier from "prettier";

const root = fileURLToPath(new URL("../", import.meta.url));
const eslint = new ESLint({ cwd: root });

test("missing pinned tools fail even when global formatters are available", async () => {
  const directory = await mkdtemp(join(tmpdir(), "mapx-quality-"));
  try {
    const manifest = JSON.parse(
      await readFile(join(root, "package.json"), "utf8"),
    );
    await writeFile(
      join(directory, "package.json"),
      JSON.stringify({ scripts: manifest.scripts }),
    );
    const bin = join(directory, "bin");
    await mkdir(bin);
    for (const name of ["prettier", "eslint"]) {
      // A PATH fallback would incorrectly pass with these fake global tools.
      await writeFile(join(bin, name), "#!/bin/sh\nexit 0\n", { mode: 0o755 });
    }
    for (const command of ["format:check:local", "lint:local"]) {
      const result = spawnSync("npm", ["run", command], {
        cwd: directory,
        env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
        encoding: "utf8",
      });
      assert.equal(result.error, undefined);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /Cannot find module.*node_modules/);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

/** @param {string} source @param {string} filePath */
async function rules(source, filePath) {
  const [result] = await eslint.lintText(source, { filePath });
  assert.equal(result.fatalErrorCount, 0, JSON.stringify(result.messages));
  return result.messages.map((message) => message.ruleId);
}

test("ESM, CommonJS, JSX, and TypeScript resolve appropriate parsers", async () => {
  assert.deepEqual(
    await rules("export default 1;", "app/src/js/example.js"),
    [],
  );
  assert.deepEqual(
    await rules("module.exports = {};", "commitlint.config.js"),
    [],
  );
  assert.deepEqual(
    await rules("export const x = <div />;", "app/src/js/example.jsx"),
    [],
  );
  assert.deepEqual(
    await rules("export const x: number = 1;", "app/src/js/example.ts"),
    [],
  );
  assert.deepEqual(await rules("export default {};", "eslint.config.mjs"), []);
});

test("all control flow requires braces; concise arrows remain valid", async () => {
  assert.ok(
    (
      await rules("if (true) console.log(1);", "app/src/js/example.js")
    ).includes("curly"),
  );
  assert.deepEqual(
    await rules(
      "const f = (x) => x; if (true) { f(1); }",
      "app/src/js/example.js",
    ),
    [],
  );
});

test("modern component restrictions and existing API/React checks survive", async () => {
  const restricted = await rules(
    '$("x"); document.querySelector("x"); window.example = 1;',
    "app/src/js/window/example.js",
  );
  assert.ok(restricted.includes("no-restricted-globals"));
  assert.equal(
    restricted.filter((rule) => rule === "no-restricted-syntax").length,
    2,
  );
  assert.ok(
    (await rules("unknownFunction();", "api/index.js")).includes("no-undef"),
  );
  assert.ok(
    (
      await rules(
        "export const x = <div class='x' />;",
        "app/src/js/sdk/examples/example.js",
      )
    ).includes("react/no-unknown-property"),
  );
});

test("runtime globals are scoped", async () => {
  const browser = await eslint.calculateConfigForFile("app/src/js/example.js");
  const server = await eslint.calculateConfigForFile("api/index.js");
  const webpack = await eslint.calculateConfigForFile(
    "app/src/js/north_arrow/index.js",
  );
  assert.ok("document" in browser.languageOptions.globals);
  assert.ok(!("require" in browser.languageOptions.globals));
  assert.ok("process" in server.languageOptions.globals);
  assert.ok(!("document" in server.languageOptions.globals));
  assert.equal(webpack.languageOptions.sourceType, "module");
  assert.equal(webpack.languageOptions.globals.require, "readonly");
});

test("generated output is ignored while owned build tests stay checked", async () => {
  for (const file of [
    "app/www/main.js",
    "app/src/js/sdk/dist/index.js",
    "api/coverage/report.js",
  ]) {
    assert.equal(await eslint.isPathIgnored(file), true);
    const info = await prettier.getFileInfo(file, {
      ignorePath: ".prettierignore",
    });
    assert.equal(info.ignored, true);
  }
  assert.equal(
    await eslint.isPathIgnored("app/test/build/build.test.js"),
    false,
  );
});

test("standalone submodules enforce the same formatting and brace policy", async () => {
  for (const directory of [
    ".",
    "submodules/mapx-style",
    "submodules/zartigl",
  ]) {
    const cwd = fileURLToPath(
      new URL(`${directory}/`, new URL("../", import.meta.url)),
    );
    const instance = new ESLint({ cwd });
    const [result] = await instance.lintText(
      "export const f = (x: number) => x; if (true) f(1);",
      { filePath: "src/example.ts" },
    );
    assert.equal(result.fatalErrorCount, 0);
    assert.ok(result.messages.some((message) => message.ruleId === "curly"));
    const options = await prettier.resolveConfig(`${cwd}/src/example.ts`);
    const source = "export const f=(x:number)=>x";
    assert.equal(
      await prettier.check(source, { ...options, filepath: "example.ts" }),
      false,
    );
    const formatted = await prettier.format(source, {
      ...options,
      filepath: "example.ts",
    });
    assert.equal(formatted, "export const f = (x: number) => x;\n");
    assert.equal(
      await prettier.check(formatted, { ...options, filepath: "example.ts" }),
      true,
    );
  }
});
