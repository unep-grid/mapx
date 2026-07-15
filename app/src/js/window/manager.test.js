import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MxWindowManager } from "./manager.js";

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
    manager.open({ key: "front" });
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(manager.windows.has("front")).toBe(false);
    expect(manager.windows.has("back")).toBe(true);
  });
});
