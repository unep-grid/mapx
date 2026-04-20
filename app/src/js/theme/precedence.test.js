import { describe, expect, it } from "vitest";
import { shouldIgnoreIncomingThemeUpdate } from "./precedence.js";

describe("theme precedence", () => {
  it("accepts incoming theme updates when there is no query theme", () => {
    expect(
      shouldIgnoreIncomingThemeUpdate({
        queryThemeId: null,
        incomingThemeId: "terminal_dark",
      }),
    ).toBe(false);
  });

  it("accepts incoming theme updates when they match the query theme", () => {
    expect(
      shouldIgnoreIncomingThemeUpdate({
        queryThemeId: "terminal_dark",
        incomingThemeId: "terminal_dark",
      }),
    ).toBe(false);
  });

  it("rejects incoming theme updates when they conflict with the query theme", () => {
    expect(
      shouldIgnoreIncomingThemeUpdate({
        queryThemeId: "terminal_dark",
        incomingThemeId: "color_light_2_fred",
      }),
    ).toBe(true);
  });
});
