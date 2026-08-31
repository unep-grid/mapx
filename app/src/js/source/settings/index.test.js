import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  open: vi.fn(),
  pickSources: vi.fn(),
}));

vi.mock("./component.js", () => ({}));
vi.mock("../../settings/index.js", () => ({
  settings: { language: "en" },
}));
vi.mock("../../language/index.js", () => ({
  getDictItem: vi.fn(async (keys) =>
    Array.isArray(keys) ? keys : keys,
  ),
}));
vi.mock("../picker/index.js", () => ({
  pickSources: mocks.pickSources,
}));
vi.mock("../../window/index.js", () => ({
  getMapxWindowManager: () => ({
    el(tag, attributes = {}, children) {
      const element = document.createElement(tag);
      for (const [key, value] of Object.entries(attributes)) {
        if (key === "class") {
          element.classList.add(...(Array.isArray(value) ? value : [value]));
        } else if (key === "on") {
          for (const [type, listener] of Object.entries(value)) {
            element.addEventListener(type, listener);
          }
        } else if (key in element) {
          element[key] = value;
        } else {
          element.setAttribute(key, value);
        }
      }
      if (children) element.append(children);
      return element;
    },
    open: mocks.open,
  }),
}));

import { openSourceSettings } from "./index.js";

describe("openSourceSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pickSources.mockResolvedValue({ value: "mx_vector_a_b_c_d_e" });
    const window = document.createElement("div");
    window.close = vi.fn();
    mocks.open.mockReturnValue(window);
  });

  it("uses the conventional destructive/start and close/update footer order", async () => {
    await openSourceSettings({ root: document.body });

    const config = mocks.open.mock.calls[0][0];
    expect(config.footerStart.textContent).toBe("btn_delete");
    expect(config.footerStart.classList).toContain("text-danger");
    expect(config.footerEnd.map((button) => button.textContent)).toEqual([
      "btn_close",
      "btn_update",
    ]);
    expect(config.footerEnd[1].classList).toContain("btn-primary");
  });
});
