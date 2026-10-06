import { afterEach, describe, expect, it } from "vitest";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { join } from "path";
import { tmpdir } from "os";

const script = fileURLToPath(new URL("./upload_vector.sh", import.meta.url));
const temporaryDirectories = [];
// Users source the helper from their interactive shell: cover bash 4+, macOS
// bash 3.2 and zsh when available.
const shells = ["bash", "/bin/bash", "zsh"].filter(
  (shell) => spawnSync(shell, ["-c", "true"]).status === 0,
);

async function makeTemporaryDirectory() {
  const directory = await mkdtemp(join(tmpdir(), "mapx-upload-test-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("upload_mapx shell helper", () => {
  it("is source-only and does not change shell options", () => {
    const sourced = spawnSync(
      "bash",
      [
        "-c",
        'set +u; before="$-"; source "$1"; after="$-"; declare -F upload_mapx >/dev/null && [[ "$before" == "$after" ]]',
        "bash",
        script,
      ],
      { encoding: "utf8" },
    );
    expect(sourced.status).toBe(0);

    const executed = spawnSync("bash", [script], { encoding: "utf8" });
    expect(executed.status).toBe(2);
    expect(executed.stderr).toContain("must be sourced");
  });

  it.each(shells)(
    "uploads multiple files, applies overrides and reports failures (%s)",
    async (shell) => {
      const directory = await makeTemporaryDirectory();
      const bin = join(directory, "bin");
      const curl = join(bin, "curl");
      const log = join(directory, "curl.log");
      const first = join(directory, "first.ZIP");
      const second = join(directory, "second file.gpkg");
      const missing = join(directory, "missing.csv");
      await mkdir(bin);
      await Promise.all([
        writeFile(first, "zip"),
        writeFile(second, "gpkg"),
        writeFile(
          curl,
          `#!/usr/bin/env bash
printf '%s\\n' '---' "$@" >> "$CURL_LOG"
printf '%s\\t\\n' '{"level":"info","message":"ok"}'
printf '\\n__mapx_http_status__:200\\n'
`,
        ),
      ]);
      await chmod(curl, 0o755);

      const command = [
        "upload_mapx",
        "--host api.staging.mapx.org",
        "--project MX-OVERRIDE",
        "--language fr",
        "--srs EPSG:2056",
        "--no-create-view",
        "--enable-download",
        '"$2" "$3" "$4"',
      ].join(" ");
      const result = spawnSync(
        shell,
        [
          "-c",
          `source "$1"; ${command}`,
          shell,
          script,
          first,
          second,
          missing,
        ],
        {
          encoding: "utf8",
          env: {
            ...process.env,
            PATH: `${bin}:${process.env.PATH}`,
            CURL_LOG: log,
            MAPX_API: "https://api.example.test",
            MAPX_USER: "42",
            MAPX_TOKEN: "secret",
            MAPX_PROJECT: "MX-DEFAULT",
          },
        },
      );

      expect(result.status).toBe(1);
      expect(result.stdout).toContain(
        "Summary: 3 total, 2 succeeded, 1 failed",
      );
      expect(result.stderr).toContain("cannot read file");

      const argumentsLog = await readFile(log, "utf8");
      expect(
        argumentsLog.match(
          /https:\/\/api\.staging\.mapx\.org\/upload\/vector\//g,
        ),
      ).toHaveLength(2);
      expect(argumentsLog).toContain("idProject=MX-OVERRIDE");
      expect(argumentsLog).toContain("title=first");
      expect(argumentsLog).toContain("title=second file");
      expect(argumentsLog).toContain("language=fr");
      expect(argumentsLog).toContain("create_view=false");
      expect(argumentsLog).toContain("enable_download=true");
      expect(argumentsLog).toContain("assign_srs=true");
      expect(argumentsLog).toContain("source_srs=EPSG:2056");
      expect(argumentsLog).toContain(`vector=@${first};type=application/zip`);
    },
  );

  it("rejects an explicit title for multiple files before calling curl", async () => {
    const directory = await makeTemporaryDirectory();
    const first = join(directory, "one.csv");
    const second = join(directory, "two.csv");
    await Promise.all([writeFile(first, "one"), writeFile(second, "two")]);

    const result = spawnSync(
      "bash",
      [
        "-c",
        'source "$1"; upload_mapx --title Shared "$2" "$3"',
        "bash",
        script,
        first,
        second,
      ],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          MAPX_API: "https://api.example.test",
          MAPX_USER: "42",
          MAPX_TOKEN: "secret",
          MAPX_PROJECT: "MX-TEST",
        },
      },
    );

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("--title can only be used with one file");
  });
});
