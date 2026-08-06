import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./icon_flash", () => ({ FlashItem: vi.fn() }));
vi.mock("./array_stat/index.js", () => ({ getArrayDistinct: vi.fn() }));
vi.mock("./is_test_mapx/index.js", () => ({
  isLanguageObject: vi.fn(),
  isEmpty: (value) => value === undefined || value === null || value === "",
  isPromise: vi.fn(),
  isElement: vi.fn(),
  isString: vi.fn(),
  isArray: Array.isArray,
  isObject: vi.fn(),
  isBoolean: vi.fn(),
  isArrayOfString: vi.fn(),
  isBase64img: vi.fn(),
  isValidType: vi.fn(),
  isNumeric: vi.fn(),
  isJson: vi.fn(),
}));
vi.mock("ua-parser-js", () => ({ UAParser: vi.fn() }));
vi.mock("./mx.js", () => ({ settings: {} }));
vi.mock("./el_mapx", () => ({ el: vi.fn(), tt: vi.fn() }));
vi.mock("./modules_loader_async", () => ({ moduleLoad: vi.fn() }));
vi.mock("./mx_helper_cookies", () => ({ readCookie: vi.fn() }));
vi.mock("./mx_helper_modal", () => ({ modalDialog: vi.fn() }));

import { cancelScrollFromTo, scrollFromTo } from "./mx_helper_misc.js";

describe("scrollFromTo", () => {
  afterEach(() => {
    cancelScrollFromTo();
    vi.useRealTimers();
  });

  it("cancels a pending scroll immediately", async () => {
    vi.useFakeTimers();
    const element = document.createElement("div");
    const scroll = scrollFromTo({
      el: element,
      from: 0,
      to: 100,
      during: 1000,
      using: (value) => value,
    });

    cancelScrollFromTo();

    await expect(scroll).resolves.toBe(true);
    expect(element.scrollTop).toBe(0);
  });
});
