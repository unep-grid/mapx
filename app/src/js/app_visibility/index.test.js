import { afterEach, describe, expect, it, vi } from "vitest";
import { AppVisibility, VisibilityGate } from "./index.js";
import { HOST_VISIBILITY_MESSAGE_TYPE } from "../sdk/src/host_visibility.js";

class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback;
    this.disconnect = vi.fn();
    MockIntersectionObserver.instance = this;
  }

  observe(element) {
    this.element = element;
  }

  emit(visible) {
    this.callback([
      {
        target: this.element,
        isIntersecting: visible,
        intersectionRatio: visible ? 1 : 0,
      },
    ]);
  }
}
MockIntersectionObserver.instance = null;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AppVisibility", () => {
  it("combines document and parent-provided visibility", () => {
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(false);
    const state = new AppVisibility();
    const changed = vi.fn();
    state.subscribe(changed);

    window.dispatchEvent(
      new MessageEvent("message", {
        source: window,
        data: JSON.stringify({
          type: HOST_VISIBILITY_MESSAGE_TYPE,
          visible: false,
        }),
      }),
    );
    expect(state.isVisible()).toBe(false);

    window.dispatchEvent(
      new MessageEvent("message", {
        source: window,
        data: { type: HOST_VISIBILITY_MESSAGE_TYPE, visible: true },
      }),
    );
    expect(state.isVisible()).toBe(true);

    hidden.mockReturnValue(true);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(state.isVisible()).toBe(false);
    expect(changed).toHaveBeenCalledTimes(3);
    state.destroy();
  });

  it("ignores visibility messages that do not come from the parent", () => {
    vi.spyOn(document, "hidden", "get").mockReturnValue(false);
    const state = new AppVisibility();

    window.dispatchEvent(
      new MessageEvent("message", {
        source: null,
        data: { type: HOST_VISIBILITY_MESSAGE_TYPE, visible: false },
      }),
    );

    expect(state.isVisible()).toBe(true);
    state.destroy();
  });
});

describe("VisibilityGate", () => {
  it("combines app state with intersection and cleans up", () => {
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    vi.spyOn(document, "hidden", "get").mockReturnValue(false);
    const appState = new AppVisibility();
    const root = document.createElement("div");
    const gate = new VisibilityGate({ root, appVisibility: appState });
    const changed = vi.fn();
    gate.subscribe(changed);

    expect(gate.isVisible()).toBe(false);
    MockIntersectionObserver.instance.emit(true);
    expect(gate.isVisible()).toBe(true);
    MockIntersectionObserver.instance.emit(false);
    expect(gate.isVisible()).toBe(false);

    gate.destroy();
    expect(MockIntersectionObserver.instance.disconnect).toHaveBeenCalledOnce();
    expect(changed).toHaveBeenCalledTimes(2);
    appState.destroy();
  });
});
