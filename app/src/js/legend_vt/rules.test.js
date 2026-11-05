import { describe, expect, it } from "vitest";
import { dedupeLegendRules } from "./rules.js";

describe("dedupeLegendRules", () => {
  it("merges consecutive duplicates and keeps the duplicate sprite", () => {
    const rules = [
      { value: 0, value_to: 10, color: "#f00", sprite: "none" },
      { value: 0, value_to: 10, color: "#f00", sprite: "hatch" },
      { value: 10, value_to: 20, color: "#0f0", sprite: "none" },
    ];
    const out = dedupeLegendRules(rules);
    expect(out).toBe(rules);
    expect(out).toEqual([
      { value: 0, value_to: 10, color: "#f00", sprite: "hatch" },
      { value: 10, value_to: 20, color: "#0f0", sprite: null },
    ]);
  });

  it("keeps distinct rules", () => {
    const rules = [{ value: "a" }, { value: "b" }];
    expect(dedupeLegendRules(rules)).toHaveLength(2);
  });
});
