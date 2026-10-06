import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  unlink: vi.fn(),
  rm: vi.fn(),
  spawn: vi.fn(),
  discardUpload: vi.fn(async () => {}),
  tableExists: vi.fn(async () => false),
  ioAddViewVt: vi.fn(),
  sendError: vi.fn(),
  client: { query: vi.fn() },
}));

vi.mock("multer", () => {
  const multer = () => ({ single: () => vi.fn() });
  multer.diskStorage = vi.fn();
  return { default: multer };
});
vi.mock("fs/promises", () => ({
  access: mocks.access,
  unlink: mocks.unlink,
  rm: mocks.rm,
}));
vi.mock("child_process", () => ({ spawn: mocks.spawn }));
vi.mock("./discard.js", () => ({ discardUpload: mocks.discardUpload }));
vi.mock("#mapx/view", () => ({
  ioAddViewVt: mocks.ioAddViewVt,
  newIdView: () => "MX-AAAAA-BBBBB-CCCCC",
}));
vi.mock("#mapx/chunks", () => ({ ioChunkWriter: vi.fn() }));
vi.mock("#mapx/mail", () => ({ sendMailAuto: vi.fn() }));
vi.mock("#mapx/error", () => ({ handleErrorText: (e) => e }));
vi.mock("#root/settings", () => ({
  settings: { contact: {}, vector: { path: {} } },
}));
vi.mock("../source/id.js", () => ({ newIdSource: () => idSource }));
vi.mock("#mapx/language", () => ({ t: (key) => key }));
vi.mock("#mapx/helpers", () => ({ sendError: mocks.sendError }));
vi.mock("#mapx/db_utils", () => ({
  withTransaction: vi.fn((action) => action(mocks.client)),
  tableExists: mocks.tableExists,
  isSourceRegistered: vi.fn(async () => false),
  isLayerValid: vi.fn(async () => ({ valid: true })),
  tableHasValues: vi.fn(async () => true),
  registerOrRemoveSource: vi.fn(async () => ({ registered: true })),
}));
vi.mock("#mapx/authentication", () => ({
  validateTokenHandler: vi.fn(),
  validateRoleHandlerFor: vi.fn(),
}));

import { EventEmitter } from "events";
import { getHttpUploadConfig, mwUpload, saveHandler } from "./vector.js";
import { ioUploadSource } from "./vector.js";
import { ioChunkWriter } from "#mapx/chunks";

const idSource = vi.hoisted(() => "mx_aaaaa_bbbbb_ccccc_ddddd_eeeee");
const idView = "MX-AAAAA-BBBBB-CCCCC";

function createResponse() {
  return {
    end: vi.fn(),
    notifyInfoError: vi.fn(),
    notifyInfoSuccess: vi.fn(),
    notifyProgress: vi.fn(),
    notifyInfoMessage: vi.fn(),
    notifyInfoVerbose: vi.fn(),
  };
}

/** Import process exiting successfully */
function mockImport() {
  mocks.spawn.mockImplementationOnce(() => {
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    setTimeout(() => child.emit("close", 0, null));
    return child;
  });
}

const request = {
  body: { title: "Test", idProject: "MX-AAA-BBB-CCC-DDD-EEE", idUser: "42" },
  file: { path: "/tmp/upload.gpkg", originalname: "upload.gpkg" },
};

describe("HTTP vector upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("parses multipart flags as booleans", () => {
    const file = { path: "/tmp/upload.zip" };
    const config = getHttpUploadConfig({
      body: {
        title: "Test",
        create_view: "false",
        enable_download: "true",
        enable_wms: "0",
      },
      file,
    });

    expect(config).toMatchObject({
      title: "Test",
      file,
      create_view: false,
      enable_download: true,
      enable_wms: false,
      assign_srs: false,
    });
  });

  it("notifies and returns an error when the import fails", async () => {
    mocks.access.mockRejectedValueOnce(new Error("missing file"));
    const res = createResponse();

    await saveHandler(
      { body: { title: "Test" }, file: { path: "/tmp/upload.zip" } },
      res,
    );

    expect(res.notifyInfoError).toHaveBeenCalledTimes(1);
    expect(mocks.sendError).toHaveBeenCalledWith(res, expect.anything(), 500);
    expect(res.end).not.toHaveBeenCalled();
  });

  it("discards view, source and table when the view step fails", async () => {
    mockImport();
    mocks.ioAddViewVt.mockRejectedValueOnce(new Error("view failed"));
    const res = createResponse();

    await saveHandler(request, res);

    expect(mocks.discardUpload).toHaveBeenCalledWith(
      { idSource, idView },
      mocks.client,
    );
    expect(res.notifyInfoError).toHaveBeenCalledTimes(1);
    expect(mocks.unlink).toHaveBeenCalledWith("/tmp/upload.gpkg");
    expect(mocks.sendError).toHaveBeenCalledWith(res, expect.anything(), 500);
  });

  it("logs a failed cleanup and still notifies the failure", async () => {
    mocks.access.mockRejectedValueOnce(new Error("missing file"));
    mocks.discardUpload.mockRejectedValueOnce(new Error("db down"));
    const res = createResponse();

    await saveHandler(
      { body: { title: "Test" }, file: { path: "/tmp/upload.zip" } },
      res,
    );

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining(idSource),
      expect.objectContaining({ message: "db down" }),
    );
    expect(res.notifyInfoError).toHaveBeenCalledTimes(1);
    expect(mocks.sendError).toHaveBeenCalledWith(res, expect.anything(), 500);
  });

  it("never cleans up an id that already exists", async () => {
    mocks.tableExists.mockResolvedValueOnce(true);
    const res = createResponse();

    await saveHandler(request, res);

    expect(mocks.spawn).not.toHaveBeenCalled();
    expect(mocks.discardUpload).not.toHaveBeenCalled();
    expect(mocks.unlink).toHaveBeenCalledWith("/tmp/upload.gpkg");
    expect(mocks.sendError).toHaveBeenCalledWith(res, expect.anything(), 500);
  });

  it("returns an error status when the failure cannot be notified", async () => {
    mocks.access.mockRejectedValueOnce(new Error("missing file"));
    const res = createResponse();
    res.notifyInfoError.mockRejectedValueOnce(new Error("write failed"));

    await saveHandler(
      { body: { title: "Test" }, file: { path: "/tmp/upload.zip" } },
      res,
    );

    expect(mocks.sendError).toHaveBeenCalledWith(res, expect.anything(), 500);
  });

  it("removes the uploaded file when authentication fails", async () => {
    const cleanOnError = mwUpload.at(-1);
    const err = new Error("Token not valid");
    const next = vi.fn();
    mocks.access.mockResolvedValueOnce();

    await cleanOnError(err, { file: { path: "/tmp/upload.zip" } }, {}, next);

    expect(mocks.unlink).toHaveBeenCalledWith("/tmp/upload.zip");
    expect(next).toHaveBeenCalledWith(err);
  });
});

describe("Socket.IO vector upload", () => {
  beforeEach(() => vi.clearAllMocks());

  it("removes the chunk directory after the import", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.access.mockRejectedValueOnce(new Error("missing file"));
    ioChunkWriter.mockResolvedValueOnce({
      outDir: "/tmp/req",
      file: { name: "a.shp", path: "/tmp/req/a.shp" },
    });
    const socket = {
      ...createResponse(),
      session: { user_roles: { publisher: true } },
    };

    await ioUploadSource(socket, {}, vi.fn());

    expect(mocks.rm).toHaveBeenCalledWith("/tmp/req", {
      recursive: true,
      force: true,
    });
  });
});
