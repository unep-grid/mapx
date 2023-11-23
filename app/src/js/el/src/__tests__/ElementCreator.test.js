import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { el, svg } from "../index.js";
import { waitTimeoutAsync } from "../../../animation_frame/index.js";

const settings = {
  timeout: 10,
};

describe("ElementCreator", () => {
  // Test the constructor and basic function creation
  it("should create a function", () => {
    expect(el).toBeInstanceOf(Function);
    expect(svg).toBeInstanceOf(Function);
  });

  describe("el method", () => {
    // Test for basic HTML element creation
    it("should create a basic HTML element", () => {
      const div = el("div");
      expect(div).toBeInstanceOf(HTMLElement);
      expect(div.tagName).toBe("DIV");
    });

    // Test for setting attributes
    it("should set attributes correctly", () => {
      const div = el("div", {
        id: "testDiv",
        style: { color: "rgb(0, 0, 0)" },
        class: ["class1", "class2"],
      });
      expect(div.id).toBe("testDiv");
      expect(div.classList.contains("class1")).toBe(true);
      expect(div.classList.contains("class2")).toBe(true);
      expect(div.style.color).toBe("rgb(0, 0, 0)");
    });

    // Test for setting class as string
    it("should set class correctly", () => {
      const div = el("div", {
        class: "class1",
      });
      expect(div.classList.contains("class1")).toBe(true);
    });
  });

  describe("svg method", () => {
    // Test for SVG element creation
    it("should create an SVG element", () => {
      const svgEl = svg("svg");
      expect(svgEl).toBeInstanceOf(SVGElement);
      expect(svgEl.tagName).toBe("svg");
    });

    // Test for setting SVG attributes
    it("should set SVG attributes correctly", () => {
      const svgEl = svg("rect", { width: 100, height: 200 });
      expect(svgEl.getAttribute("width")).toBe("100");
      expect(svgEl.getAttribute("height")).toBe("200");
    });
  });

  describe("Event Listeners", () => {
    let elDiv, clickHandler, config;

    beforeEach(() => {
      config = el.parent.config;
      config.interval_delay = settings.timeout;
      clickHandler = () => {
        elDiv.innerText = "test";
      };
      elDiv = el("div", { on: ["click", clickHandler] });
      document.body.appendChild(elDiv);
    });

    afterEach(() => {
      if (document.body.contains(elDiv)) {
        document.body.removeChild(elDiv);
      }
    });

    it("should attach and track event listeners", () => {
      const { listeners } = config;
      expect(listeners.map((l) => l.target).includes(elDiv)).toBe(true);
      expect(listeners.map((l) => l.eventHandler).includes(clickHandler)).toBe(
        true
      );
    });

    it("should listen to clickHandler", () => {
      elDiv.click();
      expect(elDiv.innerText).toBe("test");
    });

    it("should check for altered interval_delay", () => {
      const { interval_delay } = config;
      expect(interval_delay).toBe(settings.timeout);
    });

    it("should remove child", () => {
      document.body.removeChild(elDiv);
      expect(document.body.contains(elDiv)).toBe(false);
    });

    it("should have an interval id", () => {
      expect(config.interval).toBeTruthy();
    });

    it("should clean up event listeners", async () => {
      const { listeners } = config;
      document.body.removeChild(elDiv);
      await waitTimeoutAsync(settings.timeout * 2);
      expect(listeners.map((l) => l.target).includes(elDiv)).toBe(false);
    });
  });

  describe("Content Setting", () => {
    it("should handle elements", () => {
      const childEl = el("span");
      const divWithChild = el("div", childEl);
      expect(divWithChild.contains(childEl)).toBe(true);
    });

    it("should set text content correctly", () => {
      const div = el("div", "Hello World");
      expect(div.innerText).toBe("Hello World");
    });

    it("should handle async text content", async () => {
      const promiseContent = Promise.resolve("Async Content");
      const elOut = el("div", promiseContent);
      await waitTimeoutAsync(settings.timeout);
      expect(elOut.innerText).toBe("Async Content");
    });

    it("should handle async element content", async () => {
      const elTest = el("span", "Async in span");
      const promiseContent = Promise.resolve(elTest);
      const elOut = el("div", promiseContent);
      await waitTimeoutAsync(settings.timeout);
      expect(elOut.contains(elTest)).toBe(true);
    });

    it("should set innerHTML correctly", () => {
      const htmlContent = "<span>HTML Content</span>";
      const div = el("div", htmlContent);
      expect(div.innerHTML).toBe(htmlContent);
    });
  });
});
