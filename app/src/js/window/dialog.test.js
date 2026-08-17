import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  openChoiceDialog,
  openConfirmDialog,
  openNoticeDialog,
} from "./dialog.js";
import { MxWindowManager } from "./manager.js";

describe("window dialogs", () => {
  let root;
  let manager;

  beforeEach(() => {
    root = document.createElement("main");
    document.body.appendChild(root);
    manager = new MxWindowManager({ root });
  });

  afterEach(() => {
    manager.destroy();
    root.remove();
  });

  it("resolves confirmation and custom values", async () => {
    const confirmed = openConfirmDialog({
      manager,
      key: "confirm",
      title: "Confirm",
      content: "Continue?",
      confirmLabel: "Yes",
      cancelLabel: "No",
    });

    const dialog = manager.windows.get("confirm");
    expect(dialog.refs.title.textContent).toBe("Confirm");
    expect(dialog.refs.content.textContent).toContain("Continue?");
    dialog.refs.footerEnd.querySelector(".btn-primary").click();
    await expect(confirmed).resolves.toBe(true);

    const data = openConfirmDialog({
      manager,
      key: "data",
      getValue: () => ({ id: "theme" }),
    });
    manager.windows
      .get("data")
      .refs.footerEnd.querySelector(".btn-primary")
      .click();
    await expect(data).resolves.toEqual({ id: "theme" });
  });

  it("opens a padded notice with one close action", async () => {
    const notice = openNoticeDialog({
      manager,
      key: "notice",
      title: "Notice",
      content: "Nothing changed.",
      closeLabel: "Close",
    });
    const dialog = manager.windows.get("notice");

    expect(dialog.refs.content.firstElementChild.className).toBe(
      "mx-window-dialog__content",
    );
    expect(dialog.refs.footerEnd.querySelectorAll("button")).toHaveLength(1);
    expect(dialog.refs.footerEnd.textContent).toBe("Close");

    dialog.refs.footerEnd.querySelector("button").click();
    await expect(notice).resolves.toBeUndefined();
    expect(manager.windows.has("notice")).toBe(false);
  });

  it.each(["header close", "Escape", "manager close"])(
    "resolves a notice when closed by %s",
    async (action) => {
      const notice = openNoticeDialog({
        manager,
        key: `notice-${action}`,
      });
      const dialog = manager.windows.get(`notice-${action}`);

      if (action === "header close") {
        dialog.refs.close.click();
      } else if (action === "Escape") {
        dialog.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        );
      } else {
        manager.close(dialog, "test");
      }

      await expect(notice).resolves.toBeUndefined();
    },
  );

  it.each([
    ["cancel button", (dialog) => dialog.refs.footerEnd.lastElementChild.click()],
    ["header close", (dialog) => dialog.refs.close.click()],
    [
      "Escape",
      (dialog) =>
        dialog.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
        ),
    ],
    ["manager close", (dialog) => dialog.manager.close(dialog, "test")],
  ])("resolves its cancellation value on %s", async (_, closeDialog) => {
    const result = openConfirmDialog({
      manager,
      key: "cancel",
      cancelValue: null,
    });
    closeDialog(manager.windows.get("cancel"));
    await expect(result).resolves.toBeNull();
  });

  it("exposes controls for validation and rejects failed result extraction", async () => {
    const onReady = vi.fn(({ confirmButton }) => {
      confirmButton.disabled = true;
    });
    openConfirmDialog({ manager, key: "validation", onReady });
    const validationDialog = manager.windows.get("validation");
    expect(onReady).toHaveBeenCalledOnce();
    expect(
      validationDialog.refs.footerEnd.querySelector(".btn-primary").disabled,
    ).toBe(true);
    validationDialog.close();

    const failure = new Error("invalid result");
    const result = openConfirmDialog({
      manager,
      key: "failure",
      getValue: () => {
        throw failure;
      },
    });
    manager.windows
      .get("failure")
      .refs.footerEnd.querySelector(".btn-primary")
      .click();
    await expect(result).rejects.toBe(failure);
    expect(manager.windows.has("failure")).toBe(false);
  });

  it("cancels an existing dialog when its key is replaced", async () => {
    const first = openConfirmDialog({
      manager,
      key: "replaceable",
      cancelValue: "replaced",
    });
    const second = openConfirmDialog({ manager, key: "replaceable" });

    await expect(first).resolves.toBe("replaced");
    expect(manager.windows.size).toBe(1);
    manager.windows
      .get("replaceable")
      .refs.footerEnd.querySelector(".btn-primary")
      .click();
    await expect(second).resolves.toBe(true);
  });

  it("returns the default or changed radio choice and disables invalid options", async () => {
    const defaultChoice = openChoiceDialog({
      manager,
      key: "choice-default",
      options: [
        { value: "session", label: "Session" },
        { value: "database", label: "Database", disabled: true },
      ],
      defaultValue: "session",
    });
    const defaultDialog = manager.windows.get("choice-default");
    expect(defaultDialog.querySelector('[value="database"]').disabled).toBe(
      true,
    );
    defaultDialog.refs.footerEnd.querySelector(".btn-primary").click();
    await expect(defaultChoice).resolves.toBe("session");

    const changedChoice = openChoiceDialog({
      manager,
      key: "choice-changed",
      options: [
        { value: "session", label: "Session", checked: true },
        { value: "local", label: "Local" },
      ],
    });
    const changedDialog = manager.windows.get("choice-changed");
    const local = changedDialog.querySelector('[value="local"]');
    local.checked = true;
    local.dispatchEvent(new Event("change", { bubbles: true }));
    changedDialog.refs.footerEnd.querySelector(".btn-primary").click();
    await expect(changedChoice).resolves.toBe("local");
  });

  it("preserves choices when translated descriptions and labels resolve later", async () => {
    let resolveDescription;
    let resolveSession;
    let resolveLocal;
    const description = new Promise((resolve) => {
      resolveDescription = resolve;
    });
    const sessionLabel = new Promise((resolve) => {
      resolveSession = resolve;
    });
    const localLabel = new Promise((resolve) => {
      resolveLocal = resolve;
    });
    const choice = openChoiceDialog({
      manager,
      key: "translated-choice",
      description,
      options: [
        { value: "session", label: sessionLabel, checked: true },
        { value: "local", label: localLabel },
      ],
    });
    const dialog = manager.windows.get("translated-choice");

    resolveDescription("Choose where to store your theme");
    resolveSession("Session, temporary");
    resolveLocal("This device, any project");
    await vi.waitFor(() => {
      expect(dialog.textContent).toContain("Choose where to store your theme");
      expect(dialog.textContent).toContain("Session, temporary");
      expect(dialog.textContent).toContain("This device, any project");
    });

    const inputs = dialog.querySelectorAll('input[type="radio"]');
    expect(inputs).toHaveLength(2);
    expect(inputs[0].isConnected).toBe(true);
    inputs[1].checked = true;
    inputs[1].dispatchEvent(new Event("change", { bubbles: true }));
    dialog.refs.footerEnd.querySelector(".btn-primary").click();
    await expect(choice).resolves.toBe("local");
  });

  it("creates all dialog nodes through the manager-scoped creator", () => {
    const createElement = vi.spyOn(manager.elementCreator, "el");
    manager.el = manager.elementCreator.el;
    openConfirmDialog({ manager, key: "scoped" });
    const dialog = manager.windows.get("scoped");
    expect(createElement).toHaveBeenCalled();
    expect(dialog.querySelector("button").ownerDocument).toBe(
      root.ownerDocument,
    );
  });
});
