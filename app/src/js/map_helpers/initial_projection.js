/**
 * Add the initial projection to a MapLibre style without mutating the supplied
 * style. MapLibre selects its transform from `style.projection`; a top-level
 * map constructor option is not part of the MapLibre API. Supplying the globe
 * projection here also prevents the temporary Mercator transform from
 * constraining a valid polar camera before the style loads.
 *
 * @param {import("maplibre-gl").StyleSpecification} style MapLibre style specification.
 * @param {boolean | undefined} globe Whether globe projection is requested.
 * @returns {import("maplibre-gl").StyleSpecification} Style specification with the requested projection.
 */
export function withInitialProjection(style, globe) {
  return {
    ...style,
    projection: {
      type: globe ? "globe" : "mercator",
    },
  };
}
