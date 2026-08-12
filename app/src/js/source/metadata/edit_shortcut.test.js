import { afterEach, describe, expect, it, vi } from "vitest";
import { createSourceMetadataEditShortcut } from "./edit_shortcut.js";

describe("source metadata edit shortcut", () => {
  afterEach(() => vi.restoreAllMocks());

  it("stays hidden until authorized, then opens once and closes its panel", async () => {
    const root = document.createElement("div");
    const onEdit = vi.fn().mockResolvedValue(true);
    const onOpened = vi.fn();
    const shortcut = createSourceMetadataEditShortcut({
      root,
      label: "Edit source metadata",
      onEdit,
      onOpened,
    });
    root.append(shortcut.button);

    expect(shortcut.button.disabled).toBe(true);
    expect(shortcut.button.style.display).toBe("none");

    shortcut.reveal("mx_vector_a_b_c_d_e");
    expect(shortcut.button.disabled).toBe(false);
    expect(shortcut.button.style.display).toBe("");
    shortcut.button.click();
    shortcut.button.click();
    await new Promise((resolve) => queueMicrotask(resolve));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith("mx_vector_a_b_c_d_e");
    expect(onOpened).toHaveBeenCalledTimes(1);
  });

  it("re-enables the button when the compatibility bridge is unavailable", async () => {
    const shortcut = createSourceMetadataEditShortcut({
      root: document.createElement("div"),
      label: "Edit source metadata",
      onEdit: () => false,
    });
    shortcut.reveal("mx_vector_a_b_c_d_e");
    shortcut.button.click();
    await new Promise((resolve) => queueMicrotask(resolve));
    expect(shortcut.button.disabled).toBe(false);
  });
});
