/**
 * User interaction handlers that can be toggled through the SDK.
 * See https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/#properties
 */
export const MAP_INTERACTIONS = Object.freeze([
  "boxZoom",
  "dragRotate",
  "dragPan",
  "scrollZoom",
  "keyboard",
  "doubleClickZoom",
  "touchZoomRotate",
  "touchPitch",
]);

/**
 * Interactions explicitly disabled by the embedder, per map instance
 * @type {WeakMap<Object, Set<string>>}
 */
const disabledByUser = new WeakMap();

/**
 * Enable or disable map interaction handlers
 * @param {Object} map MapLibre map
 * @param {Object<string, boolean>} state Handler name as key, enabled as value
 * @return {Object<string, boolean>} Resulting state of all handlers
 */
export function setMapInteractions(map, state) {
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    throw new Error("Interactions must be an object, e.g. {boxZoom:false}");
  }
  const entries = Object.entries(state);
  for (const [name, enabled] of entries) {
    if (!MAP_INTERACTIONS.includes(name)) {
      throw new Error(
        `Unknown interaction '${name}'. Use: ${MAP_INTERACTIONS.join(", ")}`,
      );
    }
    if (typeof enabled !== "boolean") {
      throw new Error(`Interaction '${name}' requires a boolean value`);
    }
  }

  let disabled = disabledByUser.get(map);
  if (!disabled) {
    disabled = new Set();
    disabledByUser.set(map, disabled);
  }

  for (const [name, enabled] of entries) {
    if (enabled) {
      map[name].enable();
      disabled.delete(name);
    } else {
      map[name].disable();
      disabled.add(name);
    }
  }
  return getMapInteractions(map);
}

/**
 * Get the enabled state of map interaction handlers
 * @param {Object} map MapLibre map
 * @return {Object<string, boolean>} Handler name as key, enabled as value
 */
export function getMapInteractions(map) {
  const out = {};
  for (const name of MAP_INTERACTIONS) {
    out[name] = map[name].isEnabled();
  }
  return out;
}

/**
 * Test if internal code may (re-)enable an interaction: false when the
 * embedder disabled it with setMapInteractions.
 * @param {Object} map MapLibre map
 * @param {string} name Handler name
 * @return {boolean}
 */
export function isMapInteractionAllowed(map, name) {
  return !disabledByUser.get(map)?.has(name);
}

/**
 * Re-enable an interaction temporarily disabled by internal code (e.g. a
 * story, an animation), unless the embedder disabled it.
 * @param {Object} map MapLibre map
 * @param {string} name Handler name
 * @return {boolean} Enabled
 */
export function enableMapInteractionIfAllowed(map, name) {
  if (!isMapInteractionAllowed(map, name)) {
    return false;
  }
  map[name].enable();
  return true;
}
