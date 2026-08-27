/**
 * Remove the decorative globe when it cannot or should not be displayed.
 *
 * @param {object} options
 * @param {HTMLElement | { remove: () => void }} options.globeSection
 * @param {string | undefined} options.token
 * @param {boolean} options.prefersReducedMotion
 * @returns {boolean} Whether the globe was removed.
 */
export function removeGlobeWhenUnavailable({
  globeSection,
  token,
  prefersReducedMotion,
}) {
  const unavailable = !token || prefersReducedMotion;
  if (unavailable) {
    globeSection.remove();
  }
  return unavailable;
}
