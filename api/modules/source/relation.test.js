import { describe, expect, it } from "vitest";
import { getSourceRelationKind } from "./relation.js";

describe("source relation ownership", () => {
  it.each([
    ["vector", "TABLE"],
    ["tabular", "TABLE"],
    ["raster", "TABLE"],
    ["join", "VIEW"],
    ["external", null],
  ])("maps %s to %s", (type, relation) => {
    expect(getSourceRelationKind(type)).toBe(relation);
  });
});
