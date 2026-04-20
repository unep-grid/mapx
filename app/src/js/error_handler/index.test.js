import { afterEach, describe, expect, it, vi } from "vitest";
import { errorHandler } from "./index.js";

describe("errorHandler", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("suppresses expected Mapterhorn ocean-tile 404s", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const consoleWarn = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    const consoleTrace = vi
      .spyOn(console, "trace")
      .mockImplementation(() => undefined);

    errorHandler({
      sourceId: "terrain",
      error: {
        status: 404,
        message: "Failed to load https://tiles.mapterhorn.com/6/31/22.webp",
      },
    });

    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
    expect(consoleTrace).not.toHaveBeenCalled();
  });

  it("keeps unrelated map errors visible", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const consoleTrace = vi
      .spyOn(console, "trace")
      .mockImplementation(() => undefined);

    errorHandler({
      sourceId: "custom-source",
      error: {
        status: 404,
        message: "Failed to load https://example.com/6/31/22.webp",
      },
    });

    expect(consoleError).toHaveBeenCalledWith(
      "Failed to load https://example.com/6/31/22.webp",
    );
    expect(consoleTrace).toHaveBeenCalled();
  });
});
