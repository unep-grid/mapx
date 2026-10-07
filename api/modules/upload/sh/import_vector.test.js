import { afterEach, describe, expect, it } from "vitest";
import { chmod, mkdtemp, rm, writeFile } from "fs/promises";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { join } from "path";
import { tmpdir } from "os";

const script = fileURLToPath(new URL("./import_vector.sh", import.meta.url));
let directory;

/**
 * First available shell supporting pipefail: busybox (production), sh, bash.
 * Debian/Ubuntu `sh` is dash, which rejects `set -o pipefail`.
 */
const shell = [["busybox", "sh"], ["sh"], ["bash"]].find(
  ([cmd, ...args]) =>
    spawnSync(cmd, [...args, "-c", "set -o pipefail"]).status === 0,
);

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
  const [cmd, ...args] = shell;
  return spawnSync(cmd, [...args, script, "in.gpkg", "mx_test", "", "no"], {
    encoding: "utf8",
    input: "",
    env: { ...process.env, PATH: `${directory}:${process.env.PATH}` },
  });
}

describe.skipIf(!shell)("import_vector.sh", () => {
  it("fails when ogr2ogr fails even if psql succeeds", async () => {
    expect((await runImport({ ogr: 5, psql: 0 })).status).toBe(5);
  });

  it("fails when psql fails", async () => {
    expect((await runImport({ ogr: 0, psql: 3 })).status).toBe(3);
  });

  it("succeeds when both succeed", async () => {
    expect((await runImport({ ogr: 0, psql: 0 })).status).toBe(0);
  });
});
