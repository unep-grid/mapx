import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ElementCreator, el, svg } from "./index.js";
import { waitTimeoutAsync } from "../../animation_frame/index.js";

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

    it("should create elements in a supplied document", () => {
      const otherDocument = document.implementation.createHTMLDocument();
      const creator = new ElementCreator({ document: otherDocument });
      const div = creator.el("div", "Document scoped");
      const icon = creator.svg("svg");

      expect(div.ownerDocument).toBe(otherDocument);
      expect(icon.ownerDocument).toBe(otherDocument);
      expect(div.innerText).toBe("Document scoped");
    });

    it("should reject an invalid document", () => {
      expect(() => new ElementCreator({ document: {} })).toThrow(
        "ElementCreator requires a DOM document",
      );
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
    let elDiv, clickHandler;

    beforeEach(() => {
      clickHandler = () => {
        elDiv.innerText = "test";
      };
      elDiv = el("div", { on: ["click", clickHandler] });
      document.body.appendChild(elDiv);
    });

    afterEach(() => {
      vi.useRealTimers();
      if (document.body.contains(elDiv)) {
        document.body.removeChild(elDiv);
      }
    });

    it("should attach event listeners", () => {
      elDiv.click();
      expect(elDiv.innerText).toBe("test");
    });

    it("should preserve listeners while an element is detached", () => {
      vi.useFakeTimers();
      document.body.removeChild(elDiv);
      vi.advanceTimersByTime(30 * 1000);
      document.body.appendChild(elDiv);
      elDiv.click();

      expect(elDiv.innerText).toBe("test");
      expect(elDiv.dataset.el_id_listener).toBeUndefined();
    });
  });

  describe("Content Setting", () => {
    
  describe("XSS Prevention", () => {
    it("should sanitize HTML content with script tags", () => {
      const maliciousContent = '<div>Hello</div><script>alert("xss")</script>';
      const div = el("div", maliciousContent);
      expect(div.innerHTML).not.toContain("<script>");
      expect(div.innerHTML).toContain("<div>Hello</div>");
    });

    it("should sanitize HTML content with onclick attributes", () => {
      const maliciousContent = '<div onclick="alert(\'xss\')">Click me</div>';
      const div = el("div", maliciousContent);
      expect(div.innerHTML).not.toContain("onclick");
      expect(div.innerHTML).toContain("<div>Click me</div>");
    });

    it("should sanitize HTML content with onerror in img tag", () => {
      const maliciousContent = '<img src="invalid.jpg" onerror="alert(\'xss\')" />';
      const div = el("div", maliciousContent);
      expect(div.innerHTML).not.toContain("onerror");
      expect(div.innerHTML.toLowerCase()).toContain('<img src="invalid.jpg"');
    });

    it("should not affect regular text content inc. special chars", () => {
      const textContent = "Hello World & Special chars: < > &";
      const div = el("div", textContent);
      expect(div.innerText).toBe(textContent);
    });
  });

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
