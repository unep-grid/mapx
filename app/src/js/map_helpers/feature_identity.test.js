import { describe, expect, it } from "vitest";
import {
  FEATURE_ID_PROPERTY,
  NO_FEATURE_FILTER,
  buildFeatureIdentityFilter,
  setFeatureIdentityProperty,
} from "./feature_identity.js";

describe("feature identity filters", () => {
  it("builds a gid filter from valid gid values", () => {
    expect(
      buildFeatureIdentityFilter([
        { gid: 1 },
        { gid: "2" },
        { gid: undefined },
      ]),
    ).toEqual(["match", ["to-string", ["get", "gid"]], ["1", "2"], true, false]);
  });

  it("falls back to feature ids when gid is missing", () => {
    expect(buildFeatureIdentityFilter([{ id: 10 }, { id: "abc" }])).toEqual([
      "match",
      ["to-string", ["id"]],
      ["10", "abc"],
      true,
      false,
    ]);
  });

  it("combines gid and feature id filters for mixed identities", () => {
    expect(buildFeatureIdentityFilter([{ gid: 1 }, { id: "abc" }])).toEqual([
      "any",
      ["match", ["to-string", ["get", "gid"]], ["1"], true, false],
      ["match", ["to-string", ["id"]], ["abc"], true, false],
    ]);
  });

  it("uses a safe non-matching filter when no identity is usable", () => {
    expect(
      buildFeatureIdentityFilter([
        { gid: undefined },
        { id: null },
        { gid: Number.NaN },
      ]),
    ).toEqual(NO_FEATURE_FILTER);
  });

  it("stores feature ids as hidden properties for clicked attributes", () => {
    const properties = { name: "feature" };
    setFeatureIdentityProperty(properties, "feature-id");

    expect(properties[FEATURE_ID_PROPERTY]).toBe("feature-id");
    expect(Object.keys(properties)).toEqual(["name"]);
    expect(buildFeatureIdentityFilter([properties])).toEqual([
      "match",
      ["to-string", ["id"]],
      ["feature-id"],
      true,
      false,
    ]);
  });
});
