import { describe, expect, it } from "vitest";
import {
  clearTranslations,
  getTranslationCount,
} from "./multilingual_label_helpers.js";

const languages = ["en", "fr", "es"];

describe("multilingual label helpers", () => {
  it("counts non-empty translations", () => {
    expect(
      getTranslationCount({ en: "Forest", fr: "", es: "Bosque" }, languages),
    ).toBe(2);
  });

  it("clears only configured translations", () => {
    expect(
      clearTranslations(
        { en: "Forest", fr: "Forêt", es: "Bosque", metadata: "keep" },
        languages,
      ),
    ).toEqual({ en: "", fr: "", es: "", metadata: "keep" });
  });
});
