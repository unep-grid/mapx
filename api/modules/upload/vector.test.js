import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  access: vi.fn(),
  unlink: vi.fn(),
  removeSource: vi.fn(async () => true),
  sendError: vi.fn(),
}));

vi.mock("multer", () => {
  const multer = () => ({ single: () => vi.fn() });
  multer.diskStorage = vi.fn();
  return { default: multer };
});
vi.mock("fs/promises", () => ({
  access: mocks.access,
  unlink: mocks.unlink,
}));
vi.mock("#mapx/view", () => ({
  ioAddViewVt: vi.fn(),
  newIdView: () => "MX-AAAAA-BBBBB-CCCCC",
}));
vi.mock("#mapx/chunks", () => ({ ioChunkWriter: vi.fn() }));
vi.mock("#mapx/mail", () => ({ sendMailAuto: vi.fn() }));
vi.mock("#mapx/error", () => ({ handleErrorText: (e) => e }));
vi.mock("#root/settings", () => ({
  settings: { contact: {}, vector: { path: {} } },
}));
vi.mock("../source/id.js", () => ({ newIdSource: () => "mx_aaaaa_bbbbb" }));
vi.mock("#mapx/language", () => ({ t: (key) => key }));
vi.mock("#mapx/helpers", () => ({ sendError: mocks.sendError }));
vi.mock("#mapx/db_utils", () => ({
  removeSource: mocks.removeSource,
  removeView: vi.fn(async () => true),
  isLayerValid: vi.fn(),
  tableHasValues: vi.fn(),
  registerOrRemoveSource: vi.fn(),
}));
vi.mock("#mapx/authentication", () => ({
  validateTokenHandler: vi.fn(),
  validateRoleHandlerFor: vi.fn(),
}));

import { getHttpUploadConfig, mwUpload, saveHandler } from "./vector.js";

function createResponse() {
  return {
    end: vi.fn(),
    notifyInfoError: vi.fn(),
    notifyInfoSuccess: vi.fn(),
  };
}

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

  it("notifies the failure even when the cleanup fails", async () => {
    mocks.access.mockRejectedValueOnce(new Error("missing file"));
    mocks.removeSource.mockRejectedValueOnce(new Error("db down"));
    const res = createResponse();

    await saveHandler(
      { body: { title: "Test" }, file: { path: "/tmp/upload.zip" } },
      res,
    );

    expect(res.notifyInfoError).toHaveBeenCalledTimes(1);
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
