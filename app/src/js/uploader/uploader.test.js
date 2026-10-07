import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  copyToClipboard: vi.fn(async () => {}),
  settings: {
    api: {
      upload_size_max: 10_000,
      protocol: "https:",
      host_public: "api.example.test",
      port_public: "443",
      routes: {},
    },
    user: { id: 42, token: "session-secret" },
    project: { id: "MX-TEST" },
  },
}));

vi.mock("./../settings", () => ({ settings: mocks.settings }));
vi.mock("./utils", () => ({ fileFormatsVectorUpload: vi.fn(async () => []) }));
vi.mock("./item.js", () => ({ Item: vi.fn() }));
vi.mock("./../language", () => ({
  getDictItem: vi.fn(async (key) => key),
}));
// el_mapx pulls mx.js (the whole application) through is_test_mapx
vi.mock("../el_mapx", () => ({
  tt: vi.fn((key) => {
    const span = document.createElement("span");
    span.dataset.lang_key = key;
    span.textContent = key;
    return span;
  }),
}));
vi.mock("../animation_frame", () => ({
  waitTimeoutAsync: vi.fn(async () => {}),
}));
vi.mock("./../mx_helper_misc.js", () => ({
  copyToClipboard: mocks.copyToClipboard,
  fileSelector: vi.fn(async () => []),
  formatByteSize: vi.fn((value) => String(value)),
  parseTemplate: vi.fn((text, data) =>
    Object.entries(data).reduce(
      (result, [key, value]) => result.replace(`{{${key}}}`, String(value)),
      text,
    ),
  ),
  prevent: vi.fn(),
}));

import { Uploader } from "./uploader.js";

describe("Uploader mx-window integration", () => {
  let root;
  let uploader;

  beforeEach(async () => {
    root = document.createElement("main");
    document.body.appendChild(root);
    mocks.copyToClipboard.mockClear();
    uploader = new Uploader({ root });
    await uploader.init();
  });

  afterEach(() => {
    uploader?._windowManager.destroy();
    root.remove();
  });

  it("opens in the injected root with native close and grouped footer actions", () => {
    const windowElement = uploader._window;

    expect(windowElement.parentElement).toBe(uploader._windowManager.layer);
    expect(uploader._windowManager.layer.parentElement).toBe(root);
    expect(windowElement.refs.content.firstElementChild).toBe(
      uploader._el_content,
    );
    expect(uploader._el_content.className).toBe("uploader-window__content");
    expect(uploader._el_container.parentElement).toBe(uploader._el_content);
    expect(windowElement.config).toMatchObject({
      modal: true,
      draggable: true,
      resizable: true,
      collapsible: true,
      snappable: true,
    });
    expect(
      windowElement.refs.footerStart.querySelectorAll("button"),
    ).toHaveLength(2);
    expect(
      windowElement.refs.footerEnd.querySelectorAll("button"),
    ).toHaveLength(2);
    expect(windowElement.refs.close.hidden).toBe(false);
    expect(windowElement.refs.footer.textContent).not.toContain(
      "up_button_close",
    );
  });

  it("copies credentials without rendering the token", async () => {
    expect(uploader._window.textContent).not.toContain("session-secret");

    await uploader.copyApiEnvironment();

    expect(mocks.copyToClipboard).toHaveBeenCalledWith(
      `export MAPX_API='https://api.example.test:443'
export MAPX_USER='42'
export MAPX_TOKEN='session-secret'
export MAPX_PROJECT='MX-TEST'`,
    );
    expect(uploader._window.textContent).not.toContain("session-secret");
  });

  it("vetoes close while busy and confirms discarding queued files", async () => {
    const item = { cancel: vi.fn(), _el_item: document.createElement("div") };
    uploader._items.push(item);
    uploader.update();

    uploader.disable();
    expect(uploader._window.close("button")).toBe(false);
    expect(uploader._window.isConnected).toBe(true);
    uploader.enable();

    const rejectedClose = uploader._window.close("button");
    await vi.waitFor(() => {
      expect(
        uploader._windowManager.windows.has("uploader-close-confirm"),
      ).toBe(true);
    });
    uploader._windowManager.windows
      .get("uploader-close-confirm")
      .refs.footerEnd.lastElementChild.click();
    await expect(rejectedClose).resolves.toBe(false);
    expect(uploader._window.isConnected).toBe(true);

    const acceptedClose = uploader._window.close("button");
    await vi.waitFor(() => {
      expect(
        uploader._windowManager.windows.has("uploader-close-confirm"),
      ).toBe(true);
    });
    uploader._windowManager.windows
      .get("uploader-close-confirm")
      .refs.footerEnd.firstElementChild.click();
    await expect(acceptedClose).resolves.toBe(true);
    expect(item.cancel).toHaveBeenCalledOnce();
    expect(uploader._destroy).toBe(true);
  });
});
