
/**
 * Return the intersect between two Polygons or multiPolygon
 * @param {Object} poly1
 * @param {Object} poly2
 * @return {Object} Intersect or null
 */
export function intersect(poly1, poly2) {
  return Promise.all([
    import('martinez-polygon-clipping'),
    import('@turf/helpers')
  ]).then((m) => {
    const martinez = m[0];
    const helpers = m[1];

    const polygon = helpers.polygon;
    const multiPolygon = helpers.multiPolygon;

    const geom1 = poly1.geometry;
    const geom2 = poly2.geometry;
    const properties = poly1.properties || {};

    const intersection = martinez.intersection(
      geom1.coordinates,
      geom2.coordinates
    );
    if (intersection === null || intersection.length === 0) {
      return null;
    }
    if (intersection.length === 1) {
      const start = intersection[0][0][0];
      const end = intersection[0][0][intersection[0][0].length - 1];
      if (start[0] === end[0] && start[1] === end[1]) {
        return polygon(intersection[0], properties);
      }
      return null;
    }
    return multiPolygon(intersection, properties);
  });
}

