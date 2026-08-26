export const DEFAULT_VIEW_EXTENT = Object.freeze({
  lat1: -80,
  lat2: 80,
  lng1: -180,
  lng2: 180,
});

/**
 * Return a mutable copy of the default world extent.
 *
 * @returns {{lat1: number, lat2: number, lng1: number, lng2: number}}
 */
export function getDefaultViewExtent() {
  return { ...DEFAULT_VIEW_EXTENT };
}

/**
 * Return the minimal cached source-summary request needed for an extent.
 *
 * @returns {{useCache: boolean, stats: string[]}}
 */
export function getViewExtentSummaryOptions() {
  return {
    useCache: true,
    stats: ["spatial"],
  };
}

/**
 * Resolve a view extent exclusively through read operations.
 *
 * @param {object} options Options
 * @param {object|null} options.embeddedExtent Extent embedded in the view
 * @param {() => Promise<object|false|null>} options.getMetadataExtent Read stored metadata
 * @param {() => Promise<object|false|null>} options.getSummaryExtent Compute/read source summary
 * @param {(extent: unknown) => boolean} options.isValidExtent Extent validator
 * @param {Promise<unknown>} options.timeoutPromise Timeout resolving before slow reads
 * @returns {Promise<object>} A valid extent or the default world extent
 */
export async function resolveViewExtent({
  embeddedExtent,
  getMetadataExtent,
  getSummaryExtent,
  isValidExtent,
  timeoutPromise,
}) {
  const readExtent = async () => {
    if (isValidExtent(embeddedExtent)) {
      return embeddedExtent;
    }

    const metadataExtent = await getMetadataExtent();
    if (isValidExtent(metadataExtent)) {
      return metadataExtent;
    }

    const summaryExtent = await getSummaryExtent();
    return isValidExtent(summaryExtent) ? summaryExtent : null;
  };

  const extent = await Promise.race([readExtent(), timeoutPromise]);
  return isValidExtent(extent) ? extent : getDefaultViewExtent();
}
