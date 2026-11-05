import { describe, expect, it } from "vitest";
import { formatAttributeValue, getAttributesNames } from "./attributes.js";

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

describe("formatAttributeValue", () => {
  const noData = () => "No data";

  it("labels raster null samples as no data", () => {
    expect(formatAttributeValue(null, { isRaster: true, noData })).toBe(
      "No data",
    );
  });

  it("keeps genuine raster zero and measurements", () => {
    expect(formatAttributeValue(0, { isRaster: true, noData })).toBe(0);
    expect(formatAttributeValue(214.2, { isRaster: true, noData })).toBe(214.2);
  });

  it("keeps the vector null placeholder empty", () => {
    expect(formatAttributeValue("$NULL", { nullValue: "$NULL", noData })).toBe(
      "",
    );
    expect(formatAttributeValue(null, { nullValue: "$NULL", noData })).toBe(
      null,
    );
  });
});
