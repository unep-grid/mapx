import { afterEach, describe, expect, it, vi } from "vitest";
import "./index.js";
import { ElementCreator } from "../../el/src/index.js";

const steps = Array.from({ length: 8 }, (_, index) => ({
  name: `Step ${index + 1}`,
}));

describe("MxStoryNavigationElement", () => {
  /** @type {HTMLElement} */
  let navigation;

  afterEach(() => {
    navigation?.remove();
  });

  it("creates the navigation node in an alternate owner document", () => {
    const ownerDocument = document.implementation.createHTMLDocument();
    const { el } = new ElementCreator({ document: ownerDocument });
    navigation = el("mx-story-navigation");
    ownerDocument.body.appendChild(navigation);

    expect(navigation.ownerDocument).toBe(ownerDocument);
  });

  it("renders configured steps and state", () => {
    navigation = document.createElement("mx-story-navigation");
    document.body.appendChild(navigation);

    navigation.configure({
      steps: [{ name: "One" }, { name: "Two" }],
      activeIndex: 1,
      locked: false,
      showQuit: false,
    });

    expect(navigation.refs.quit.hidden).toBe(true);
    expect(navigation.refs.grid.hidden).toBe(true);
    expect(navigation.refs.lock.getAttribute("aria-label")).toBe("Lock map");
    expect(navigation.refs.bullets.children).toHaveLength(2);
    expect(
      navigation.refs.bullets.children[1].classList.contains(
        "mx-story-step-active",
      ),
    ).toBe(true);
  });

  it("dispatches navigation events from button actions", () => {
    navigation = document.createElement("mx-story-navigation");
    document.body.appendChild(navigation);
    navigation.configure({ steps });
    const eventHandler = vi.fn();
    navigation.addEventListener("mx-story-nav-goto", eventHandler);

    navigation.refs.next.click();

    expect(eventHandler).toHaveBeenCalledOnce();
    expect(eventHandler.mock.calls[0][0].detail).toEqual({ to: "next" });
  });

  it("opens the grid and dispatches the selected step", () => {
    navigation = document.createElement("mx-story-navigation");
    document.body.appendChild(navigation);
    navigation.configure({ steps });
    const eventHandler = vi.fn();
    navigation.addEventListener("mx-story-nav-goto", eventHandler);

    navigation.refs.grid.click();

    expect(
      navigation.refs.gridPanel.classList.contains("mx-display-none"),
    ).toBe(false);
    navigation.refs.gridPanel.querySelector('[data-step="6"]').click();

    expect(eventHandler.mock.calls[0][0].detail).toEqual({ to: 6 });
    expect(
      navigation.refs.gridPanel.classList.contains("mx-display-none"),
    ).toBe(true);
  });
});
