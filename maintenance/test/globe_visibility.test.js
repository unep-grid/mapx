import assert from "node:assert/strict";
import test from "node:test";

import { removeGlobeWhenUnavailable } from "../src/globe_visibility.js";

function createGlobeSection() {
  return {
    removed: false,
    remove() {
      this.removed = true;
    },
  };
}

test("removes the globe shell when the token is absent", () => {
  const globeSection = createGlobeSection();

  assert.equal(
    removeGlobeWhenUnavailable({
      globeSection,
      token: "",
      prefersReducedMotion: false,
    }),
    true,
  );
  assert.equal(globeSection.removed, true);
});

test("keeps the globe shell when animation is available", () => {
  const globeSection = createGlobeSection();

  assert.equal(
    removeGlobeWhenUnavailable({
      globeSection,
      token: "temporary-token",
      prefersReducedMotion: false,
    }),
    false,
  );
  assert.equal(globeSection.removed, false);
});

test("removes the globe shell when reduced motion is requested", () => {
  const globeSection = createGlobeSection();

  assert.equal(
    removeGlobeWhenUnavailable({
      globeSection,
      token: "temporary-token",
      prefersReducedMotion: true,
    }),
    true,
  );
  assert.equal(globeSection.removed, true);
});
