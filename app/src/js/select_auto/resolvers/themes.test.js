import { beforeEach, describe, expect, it, vi } from "vitest";

const colorsArray = vi.hoisted(() => vi.fn(() => ["#ffffff"]));

vi.mock("../../init_theme", () => ({
  theme: {
    colorsArray,
  },
}));

vi.mock("../../el_mapx", () => ({
  el: (tagName, ...options) => {
    const element = document.createElement(tagName);

    for (const option of options.flat(Infinity)) {
      if (option === null || option === undefined) {
        continue;
      }
      if (option instanceof Node) {
        element.appendChild(option);
      } else if (typeof option === "object") {
        for (const [key, value] of Object.entries(option)) {
          if (key === "class") {
            element.className = value;
          } else if (key === "style") {
            Object.assign(element.style, value);
          } else {
            element.setAttribute(key, value);
          }
        }
      } else {
        element.append(String(option));
      }
    }

    return element;
  },
}));

import { config } from "./themes.js";

const escape = (value) => String(value);

function makeTheme(id, label = "Color light") {
  return {
    id,
    label: { en: label },
    description: { en: "A bright theme" },
    _storage: "local",
    dark: false,
  };
}

describe("themes SelectAuto resolver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("disambiguates duplicate labels with their unique IDs", () => {
    const first = config.render.option(makeTheme("color_light"), escape);
    const second = config.render.option(
      makeTheme("color_light_project"),
      escape,
    );

    expect(first.querySelector(".mx-theme--selector-label").textContent).toBe(
      "Color light",
    );
    expect(first.querySelector(".mx-theme--selector-id").textContent).toBe(
      "color_light",
    );
    expect(second.querySelector(".mx-theme--selector-id").textContent).toBe(
      "color_light_project",
    );
    expect(first.querySelector("color-swatches")).not.toBeNull();
  });

  it("keeps the unique ID visible in the selected item", () => {
    const item = config.render.item(makeTheme("color_light"), escape);

    expect(item.querySelector(".mx-theme--selector-label").textContent).toBe(
      "Color light",
    );
    expect(item.querySelector(".mx-theme--selector-id").textContent).toBe(
      "color_light",
    );
  });

  it.each([
    ["a missing label", undefined],
    ["a label identical to the ID", "color_light"],
  ])("renders the ID only once for %s", (_case, label) => {
    const themeData = makeTheme("color_light", label);
    if (label === undefined) {
      delete themeData.label;
    }

    const item = config.render.item(themeData, escape);

    expect(item.querySelector(".mx-theme--selector-label").textContent).toBe(
      "color_light",
    );
    expect(item.querySelector(".mx-theme--selector-id")).toBeNull();
    expect(item.textContent.match(/color_light/g)).toHaveLength(1);
  });
});
