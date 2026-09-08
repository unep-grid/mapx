import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MxWindowManager } from "../window/index.js";

const mocks = vi.hoisted(() => ({
  settings: {
    project: { theme: "classic_dark" },
    user: { roles: { publisher: false } },
  },
  editor: {
    getEditor: vi.fn(() => ({ disable: vi.fn() })),
    getValue: vi.fn(() => ({ id: "custom_theme" })),
    on: vi.fn(),
    validate: vi.fn(() => []),
  },
}));

vi.mock("../mx.js", () => ({ settings: mocks.settings }));

vi.mock("../language/index.js", () => ({
  getDictItem: vi.fn(async (key) => key),
}));

vi.mock("../json_editor", () => ({
  jedInit: vi.fn(async () => mocks.editor),
}));

vi.mock("@unep-grid/mapx-style", async (importOriginal) => ({
  ...(await importOriginal()),
  listFontFamilies: vi.fn(() => []),
  listFonts: vi.fn(() => []),
}));

describe("ThemeModal window migration", () => {
  let root;
  let manager;
  let theme;

  beforeEach(() => {
    root = document.createElement("main");
    document.body.appendChild(root);
    manager = new MxWindowManager({ root });
    mocks.settings.user.roles.publisher = false;
    mocks.editor.on.mockReset();
    mocks.editor.validate.mockReset().mockReturnValue([]);
    mocks.editor.getValue.mockReset().mockReturnValue({ id: "custom_theme" });
    theme = {
      getSchema: vi.fn(async () => ({})),
      isExistingId: vi.fn(() => false),
      isExistingIdBase: vi.fn(() => false),
      listByStorageTypes: vi.fn(() => []),
      theme: vi.fn(() => ({ id: "classic_dark" })),
    };
  });

  afterEach(() => {
    manager.destroy();
    root.remove();
    vi.restoreAllMocks();
  });

  it("opens and cleans up the main manager through MxWindowManager", async () => {
    const { ThemeModal } = await import("./theme_modal.js");
    const onClose = vi.fn();
    const modal = new ThemeModal({ theme, windowManager: manager, onClose });
    modal.buildContent = vi.fn(async () => {});

    await modal.init();

    const windowElement = manager.windows.get("theme-manager");
    expect(windowElement.config).toMatchObject({
      modal: false,
      draggable: true,
      resizable: true,
      collapsible: true,
      snappable: true,
    });
    expect(windowElement.backdrop).toBeNull();
    expect(manager.layer.querySelector(".mx-window-backdrop")).toBeNull();
    const buttonGroup = windowElement.refs.footerStart.querySelector(
      ":scope > .btn-group",
    );
    const buttons = Array.from(buttonGroup.children);
    expect(buttonGroup.getAttribute("role")).toBe("group");
    expect(buttonGroup.getAttribute("aria-label")).toBe(
      "mx_theme_manager_title",
    );
    expect(buttons).toHaveLength(6);
    expect(buttons.every((button) => button.matches("button.btn"))).toBe(true);
    expect(windowElement.refs.footerEnd.children).toHaveLength(0);
    expect(
      buttons.map((button) =>
        button.querySelector(".btn-icon-wrapper > i").classList.item(1),
      ),
    ).toEqual([
      "fa-times",
      "fa-cloud-upload",
      "fa-cloud-download",
      "fa-files-o",
      "fa-save",
      "fa-trash",
    ]);
    expect(
      buttons.every(
        (button) =>
          button.querySelector(".btn-icon").firstElementChild.matches("span") &&
          button
            .querySelector(".btn-icon")
            .lastElementChild.matches(".btn-icon-wrapper"),
      ),
    ).toBe(true);
    modal.close();
    expect(manager.windows.has("theme-manager")).toBe(false);
    expect(onClose).toHaveBeenCalledOnce();
    expect(modal._closed).toBe(true);
  });

  it("offers scoped storage choices based on the publisher role", async () => {
    const { ThemeModal } = await import("./theme_modal.js");
    const modal = new ThemeModal({ theme, windowManager: manager });

    const sessionChoice = modal.showStorageLocationModal();
    await vi.waitFor(() => {
      expect(manager.windows.has("theme-storage-location")).toBe(true);
    });
    let choiceWindow = manager.windows.get("theme-storage-location");
    await vi.waitFor(() => {
      expect(choiceWindow.querySelector('[value="session"]')).not.toBeNull();
      expect(choiceWindow.querySelector('[value="local"]')).not.toBeNull();
      expect(choiceWindow.textContent).toContain("mx_theme_save_session");
      expect(choiceWindow.textContent).toContain("mx_theme_save_local");
    });
    expect(choiceWindow.querySelector('[value="db"]')).toBeNull();
    choiceWindow.refs.footerEnd.querySelector(".btn-primary").click();
    await expect(sessionChoice).resolves.toBe("session");

    mocks.settings.user.roles.publisher = true;
    const databaseChoice = modal.showStorageLocationModal();
    await vi.waitFor(() => {
      expect(manager.windows.has("theme-storage-location")).toBe(true);
    });
    choiceWindow = manager.windows.get("theme-storage-location");
    const database = choiceWindow.querySelector('[value="db"]');
    expect(database).not.toBeNull();
    database.checked = true;
    database.dispatchEvent(new Event("change", { bubbles: true }));
    choiceWindow.refs.footerEnd.querySelector(".btn-primary").click();
    await expect(databaseChoice).resolves.toBe("db");
  });

  it("returns metadata and keeps the confirm button aligned with validation", async () => {
    const { ThemeModal } = await import("./theme_modal.js");
    const modal = new ThemeModal({ theme, windowManager: manager });
    const result = modal.showMetadataEditorModal("create", {
      id: "custom_theme",
    });
    await vi.waitFor(() => {
      expect(manager.windows.has("theme-metadata-create")).toBe(true);
    });

    const metadataWindow = manager.windows.get("theme-metadata-create");
    const confirmButton =
      metadataWindow.refs.footerEnd.querySelector(".btn-primary");
    const changeHandler = mocks.editor.on.mock.calls.find(
      ([event]) => event === "change",
    )[1];
    mocks.editor.validate.mockReturnValueOnce([{ message: "Invalid" }]);
    changeHandler();
    expect(confirmButton.disabled).toBe(true);
    mocks.editor.validate.mockReturnValueOnce([]);
    changeHandler();
    expect(confirmButton.disabled).toBe(false);

    confirmButton.click();
    await expect(result).resolves.toEqual({ id: "custom_theme" });
  });
});
