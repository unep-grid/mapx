import assert from "node:assert/strict";
import test from "node:test";

import { getGlobeCamera } from "../src/globe_animation.js";

test("rotates by changing longitude while keeping latitude stable", () => {
  const initial = getGlobeCamera(0);
  const quarterTurn = getGlobeCamera(120000);

  assert.deepEqual(initial.center, [12, 24]);
  assert.deepEqual(quarterTurn.center, [102, 24]);
});

test("zooms out progressively and stops at the final zoom", () => {
  const initial = getGlobeCamera(0);
  const halfway = getGlobeCamera(120000);
  const finished = getGlobeCamera(240000);
  const later = getGlobeCamera(480000);

  assert.equal(initial.zoom, 3.65);
  assert.equal(halfway.zoom, 3.325);
  assert.equal(finished.zoom, 3);
  assert.equal(later.zoom, 3);
});
