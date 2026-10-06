import { afterEach, describe, expect, it } from "vitest";
import { chmod, mkdtemp, rm, writeFile } from "fs/promises";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { join } from "path";
import { tmpdir } from "os";

const script = fileURLToPath(new URL("./import_vector.sh", import.meta.url));
let directory;

afterEach(() => rm(directory, { recursive: true, force: true }));

/**
 * Run the import with fake ogr2ogr / psql exiting with the given codes
 */
async function runImport({ ogr, psql }) {
  directory = await mkdtemp(join(tmpdir(), "mapx-import-test-"));
  for (const [name, code] of [
    ["ogr2ogr", ogr],
    ["psql", psql],
  ]) {
    const bin = join(directory, name);
    await writeFile(bin, `#!/bin/sh\ncat >/dev/null\nexit ${code}\n`);
    await chmod(bin, 0o755);
  }
  return spawnSync("sh", [script, "in.gpkg", "mx_test", "", "no"], {
    encoding: "utf8",
    input: "",
    env: { ...process.env, PATH: `${directory}:${process.env.PATH}` },
  });
}

describe("import_vector.sh", () => {
  it("fails when ogr2ogr fails even if psql succeeds", async () => {
    expect((await runImport({ ogr: 1, psql: 0 })).status).not.toBe(0);
  });

  it("fails when psql fails", async () => {
    expect((await runImport({ ogr: 0, psql: 3 })).status).not.toBe(0);
  });

  it("succeeds when both succeed", async () => {
    expect((await runImport({ ogr: 0, psql: 0 })).status).toBe(0);
  });
});
