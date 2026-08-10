import { afterEach, describe, expect, it, vi } from "vitest";
import "./index.js";
import { getStepPreviewData } from "./preview.js";
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

  it("renders rich grid cards without changing compact bullets", () => {
    navigation = document.createElement("mx-story-navigation");
    document.body.appendChild(navigation);
    navigation.configure({
      steps: [
        {
          name: "Introduction",
          text: "A localized introduction to the story.",
          coverImageSrc: "/cover.jpg",
        },
        ...steps.slice(1),
      ],
      aspectRatio: 16 / 9,
    });

    navigation.openGrid();

    expect(navigation.refs.bullets.querySelector(".mx-story-nav__card")).toBe(
      null,
    );
    expect(
      navigation.refs.gridPanel.style.getPropertyValue(
        "--mx-story-preview-ratio",
      ),
    ).toBe(String(16 / 9));
    const card = navigation.refs.gridPanel.querySelector('[data-step="0"]');
    const cardText = card.querySelector(".mx-story-nav__card-text");
    const cardLabel = cardText.querySelector(".mx-story-nav__card-label");
    expect(cardText.children).toHaveLength(1);
    expect(cardLabel.children).toHaveLength(3);
    expect(cardLabel.querySelector(".mx-story-nav__card-index").textContent).toBe(
      "1 – ",
    );
    expect(
      cardLabel.querySelector("strong:not(.mx-story-nav__card-index)")
        .innerText,
    ).toBe("Introduction");
    expect(cardLabel.querySelector("p").innerText).toBe(
      "A localized introduction to the story.",
    );
    expect(card.querySelector("img").getAttribute("src")).toBe("/cover.jpg");
    expect(card.getAttribute("style")).toBe(null);
    const secondCardLabel = navigation.refs.gridPanel
      .querySelector('[data-step="1"]')
      .querySelector(".mx-story-nav__card-label");
    expect(secondCardLabel.children).toHaveLength(2);
    expect(
      secondCardLabel.querySelector(".mx-story-nav__card-index").textContent,
    ).toBe("2 – ");
    expect(
      secondCardLabel.querySelector(
        "strong:not(.mx-story-nav__card-index)",
      ).innerText,
    ).toBe("Step 2");

    card.querySelector("img").dispatchEvent(new Event("error"));
    expect(card.querySelector("img")).toBe(null);
    expect(card.classList.contains("mx-story-nav__card--with-cover")).toBe(
      false,
    );
  });

  it("extracts localized text and legacy cover images from a rendered step", () => {
    const elStep = document.createElement("div");
    elStep.innerHTML = `
      <div class="mx-story-slide mx-story-image-cover">
        <div class="mx-story-slide-front" style="color: rgb(1, 2, 3)">
          <h2>Localized heading</h2>
          <p>  Some narrative text. </p>
          <img src="/cover.jpg">
        </div>
        <div class="mx-story-slide-back" style="background-color: rgb(250, 251, 252)"></div>
      </div>
      <div class="mx-story-slide">
        <div class="mx-story-slide-front">Second layer</div>
      </div>
    `;

    expect(getStepPreviewData({ elStep, name: "  Named step  " })).toEqual({
      name: "Named step",
      text: "Localized heading Some narrative text. Second layer",
      coverImageSrc: "/cover.jpg",
    });

    elStep.querySelector(".mx-story-image-cover").classList.remove(
      "mx-story-image-cover",
    );
    elStep.querySelector("img").classList.add("mx-image-cover");
    expect(getStepPreviewData({ elStep }).coverImageSrc).toBe("/cover.jpg");
  });

});
