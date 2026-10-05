import { expect, it, vi } from "vitest";
import { disableUnloadListener } from "./content_tools_unload.js";

function createContentTools(addDOMEventListeners) {
  class EditorApp {}
  EditorApp.prototype._addDOMEventListeners = addDOMEventListeners;
  return { EditorApp: { getCls: () => EditorApp }, cls: EditorApp };
}

it("skips the ContentTools unload listener and keeps the others", () => {
  const onUnload = vi.fn();
  const onBeforeUnload = vi.fn();
  const ContentTools = createContentTools(function () {
    window.addEventListener("unload", onUnload);
    window.addEventListener("beforeunload", onBeforeUnload);
  });
  const native = window.addEventListener;
  const added = vi.fn();
  window.addEventListener = added;

  try {
    disableUnloadListener(ContentTools);
    new ContentTools.cls()._addDOMEventListeners();
    expect(added).toHaveBeenCalledTimes(1);
    expect(added).toHaveBeenCalledWith("beforeunload", onBeforeUnload);
    expect(window.addEventListener).toBe(added);
  } finally {
    window.addEventListener = native;
  }
});

it("restores window.addEventListener when ContentTools throws", () => {
  const ContentTools = createContentTools(function () {
    throw new Error("boom");
  });
  const original = window.addEventListener;

  disableUnloadListener(ContentTools);

  expect(() => new ContentTools.cls()._addDOMEventListeners()).toThrow("boom");
  expect(window.addEventListener).toBe(original);
});
