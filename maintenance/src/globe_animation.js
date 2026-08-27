const INITIAL_LONGITUDE = 12;
const LATITUDE = 24;
const INITIAL_ZOOM = 3.65;
const FINAL_ZOOM = 3;
const ZOOM_DURATION_MS = 240000;
const ROTATION_DURATION_MS = 480000;

/**
 * Calculate the maintenance globe camera for an elapsed animation time.
 * Moving the center longitude rotates the globe geographically; changing the
 * bearing would only rotate the camera around its viewing axis.
 *
 * @param {number} elapsedMs
 * @returns {{center: [number, number], zoom: number}}
 */
export function getGlobeCamera(elapsedMs) {
  const elapsed = Math.max(0, elapsedMs);
  const longitude =
    ((INITIAL_LONGITUDE + (elapsed / ROTATION_DURATION_MS) * 360 + 180) % 360) -
    180;
  const zoomProgress = Math.min(elapsed / ZOOM_DURATION_MS, 1);

  return {
    center: [longitude, LATITUDE],
    zoom: INITIAL_ZOOM - zoomProgress * (INITIAL_ZOOM - FINAL_ZOOM),
  };
}
