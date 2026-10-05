import { describe, expect, it } from "vitest";
import { getAttributesNames } from "./attributes.js";

describe("getAttributesNames", () => {
  it("merges attribute names from rows with different schemas", () => {
    const rows = [
      { gid: 1, name_en: "A", j0_idp: 10 },
      { gid: 2, name_en: "A", j0_disasters: 300 },
    ];
    expect(getAttributesNames(rows)).toEqual([
      "gid",
      "name_en",
      "j0_idp",
      "j0_disasters",
    ]);
  });

  it("ignores non-enumerable properties", () => {
    const row = { a: 1 };
    Object.defineProperty(row, "hidden", { value: 1, enumerable: false });
    expect(getAttributesNames([row])).toEqual(["a"]);
  });

  it("returns an empty array for empty input", () => {
    expect(getAttributesNames([])).toEqual([]);
    expect(getAttributesNames(null)).toEqual([]);
  });
});
