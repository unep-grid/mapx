import { afterEach, describe, expect, it, vi } from "vitest";
import { FrameManager } from "./frameManager.js";
import { HOST_VISIBILITY_MESSAGE_TYPE } from "./host_visibility.js";

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
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("FrameManager host visibility", () => {
  it("sends iframe intersection state and removes its observer", () => {
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    vi.spyOn(document, "hidden", "get").mockReturnValue(false);
    const container = document.createElement("div");
    document.body.appendChild(container);
    const manager = new FrameManager({
      container,
      url: "https://example.test",
    });
    const postMessage = vi.spyOn(manager._iframe.contentWindow, "postMessage");

    MockIntersectionObserver.instance.emit(false);

    const message = JSON.parse(postMessage.mock.calls.at(-1)[0]);
    expect(message).toMatchObject({
      type: HOST_VISIBILITY_MESSAGE_TYPE,
      visible: false,
    });

    manager.destroy();
    expect(MockIntersectionObserver.instance.disconnect).toHaveBeenCalledOnce();
  });
});
