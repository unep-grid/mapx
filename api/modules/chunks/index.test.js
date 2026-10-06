import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

vi.mock("#mapx/file_formats", () => ({
  getFormatInfo: () => ({ multiple: false, fileExt: [".gpkg"] }),
}));
vi.mock("#mapx/language", () => ({ t: (key) => key }));

import { ioChunkWriter } from "./index.js";

const idRequest = `chunktest${process.pid}`;
const outDir = join(tmpdir(), idRequest);
const socket = { notifyProgress: vi.fn() };

afterEach(() => rm(outDir, { recursive: true, force: true }));

describe("ioChunkWriter", () => {
  it("rejects request ids escaping the temporary directory", async () => {
    for (const id_request of ["../etc", "a/b", "", undefined, "x".repeat(65)]) {
      await expect(
        ioChunkWriter(socket, { id_request, filename: "a.gpkg", first: true }),
      ).rejects.toThrow("Invalid upload request");
    }
  });

  it("removes the partial upload when the client cancels", async () => {
    const chunk = {
      id_request: idRequest,
      filename: "a.gpkg",
      data: Buffer.from("part"),
      first: true,
      last: false,
    };
    expect(await ioChunkWriter(socket, chunk)).toBe(false);
    expect(existsSync(join(outDir, "a.gpkg"))).toBe(true);

    await ioChunkWriter(socket, { id_request: idRequest, canceled: true });

    expect(existsSync(outDir)).toBe(false);
  });

  it("returns the file config on the last chunk", async () => {
    const config = await ioChunkWriter(socket, {
      id_request: idRequest,
      filename: "a.gpkg",
      data: Buffer.from("all"),
      first: true,
      last: true,
    });

    expect(config.outDir).toBe(outDir);
    expect(config.file).toEqual({
      name: "a.gpkg",
      path: join(outDir, "a.gpkg"),
    });
  });
});
