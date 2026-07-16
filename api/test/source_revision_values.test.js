/* global describe, it */

import assert from "node:assert/strict";
import { prepareRevisionValue } from "../modules/source/revision_values.js";

describe("source revision values", () => {
  it("serializes JSON arrays as JSON instead of PostgreSQL array literals", () => {
    assert.equal(prepareRevisionValue("readers", ["publishers"]), '["publishers"]');
    assert.equal(prepareRevisionValue("editors", ["publishers"]), '["publishers"]');
    assert.equal(prepareRevisionValue("services", []), "[]");
  });

  it("serializes JSON objects and preserves scalar database values", () => {
    assert.equal(
      prepareRevisionValue("data", { meta: { title: "Example" } }),
      '{"meta":{"title":"Example"}}',
    );
    assert.equal(prepareRevisionValue("editor", 1), 1);
    assert.equal(prepareRevisionValue("target", null), null);
  });
});
