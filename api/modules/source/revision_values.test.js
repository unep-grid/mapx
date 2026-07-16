import { describe, expect, it } from "vitest";
import { prepareRevisionValue } from "./revision_values.js";

describe("source revision values", () => {
  it("serializes JSON arrays as JSON instead of PostgreSQL array literals", () => {
    expect(prepareRevisionValue("readers", ["publishers"])).toBe(
      '["publishers"]',
    );
    expect(prepareRevisionValue("editors", ["publishers"])).toBe(
      '["publishers"]',
    );
    expect(prepareRevisionValue("services", [])).toBe("[]");
  });

  it("serializes JSON objects and preserves scalar database values", () => {
    expect(prepareRevisionValue("data", { meta: { title: "Example" } })).toBe(
      '{"meta":{"title":"Example"}}',
    );
    expect(prepareRevisionValue("editor", 1)).toBe(1);
    expect(prepareRevisionValue("target", null)).toBe(null);
  });
});
