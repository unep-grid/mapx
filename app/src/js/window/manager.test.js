import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getMapxWindowManager, MxWindowManager } from "./manager.js";

describe("MxWindowManager", () => {
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

  it("opens, replaces and closes a keyed modal without global lookup", () => {
    expect(manager.elementCreator.document).toBe(root.ownerDocument);
    expect(manager.layer.ownerDocument).toBe(root.ownerDocument);

    const firstContent = document.createElement("p");
    firstContent.textContent = "First";
    const first = manager.open({
      key: "test",
      title: "One",
      content: firstContent,
    });
    const secondContent = document.createElement("p");
    secondContent.textContent = "Second";
    const second = manager.open({
      key: "test",
      title: "Two",
      content: secondContent,
    });

    expect(second).toBe(first);
    expect(manager.windows.size).toBe(1);
    expect(second.refs.title.textContent).toBe("Two");
    expect(second.refs.content.firstElementChild).toBe(secondContent);
    expect(second.backdrop.isConnected).toBe(true);

    expect(manager.close("test", "test")).toBe(true);
    expect(manager.windows.size).toBe(0);
    expect(second.isConnected).toBe(false);
  });

  it("keeps the application interactive for non-modal windows", () => {
    const element = manager.open({
      key: "interactive",
      modal: false,
      content: "Tools",
    });

    expect(element.backdrop).toBeNull();
    expect(manager.layer.querySelector(".mx-window-backdrop")).toBeNull();
    expect(element.getAttribute("aria-modal")).toBe("false");
  });

  it("supports collapse, expand, snap and restore states", () => {
    const element = manager.open({ key: "states", content: "Content" });
    element.collapse();
    expect(element.collapsed).toBe(true);
    expect(element.refs.body.hidden).toBe(true);

    element.expand();
    expect(element.collapsed).toBe(false);
    expect(element.refs.body.hidden).toBe(false);

    element.snap("left");
    expect(element.snapSide).toBe("left");
    expect(element.style.width).toBe("50vw");
    element.restore();
    expect(element.snapSide).toBe(null);
  });

  it("emits lifecycle events and calls the close callback", () => {
    const onClose = vi.fn();
    const element = manager.open({ key: "events", onClose });
    const closeEvent = vi.fn();
    element.addEventListener("mx-window-close", closeEvent);
    element.close("consumer");
    expect(closeEvent).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledWith("consumer");
  });

  it("closes the front window with Escape", () => {
    manager.open({ key: "back" });
    const front = manager.open({ key: "front" });
    front.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    expect(manager.windows.has("front")).toBe(false);
    expect(manager.windows.has("back")).toBe(true);
  });

  it("tracks viewport resize only while windows are open", () => {
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");

    manager.open({ key: "first" });
    manager.open({ key: "second" });
    expect(add.mock.calls.filter(([type]) => type === "resize")).toHaveLength(
      1,
    );

    manager.close("first");
    expect(
      remove.mock.calls.filter(([type]) => type === "resize"),
    ).toHaveLength(0);

    manager.close("second");
    expect(
      remove.mock.calls.filter(([type]) => type === "resize"),
    ).toHaveLength(1);

    manager.destroy();
    expect(
      remove.mock.calls.filter(([type]) => type === "resize"),
    ).toHaveLength(1);
  });

  it("scopes cached managers and window layers to each supplied root", () => {
    const otherRoot = document.createElement("aside");
    document.body.append(otherRoot);
    const rootManager = getMapxWindowManager(root);
    const sameRootManager = getMapxWindowManager(root);
    const otherManager = getMapxWindowManager(otherRoot);

    expect(sameRootManager).toBe(rootManager);
    expect(otherManager).not.toBe(rootManager);
    expect(rootManager.layer.parentElement).toBe(root);
    expect(otherManager.layer.parentElement).toBe(otherRoot);

    const rootWindow = rootManager.open({ key: "root-window" });
    otherManager.open({ key: "other-window" });
    rootWindow.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    expect(rootManager.windows.has("root-window")).toBe(false);
    expect(otherManager.windows.has("other-window")).toBe(true);

    rootManager.destroy();
    otherManager.destroy();
    otherRoot.remove();
  });
});
