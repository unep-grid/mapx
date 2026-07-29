const protocolsHttp = new Set(["http:", "https:"]);

/**
 * Builds the public tile templates exposed by a search document.
 * @param {Object} document - Search document before language processing.
 * @param {Object} api - Public API settings.
 * @returns {string[]} Absolute tile templates.
 */
export function buildSourceTiles(document, api) {
  if (document?.view_type === "rt") {
    return normalizeRasterTiles(document.source_tiles);
  }

  if (document?.view_type !== "vt" || !document.view_id) {
    return [];
  }

  const apiBaseUrl = getPublicApiBaseUrl(api);
  if (!apiBaseUrl) {
    return [];
  }

  const idView = encodeURIComponent(document.view_id);
  return [
    `${apiBaseUrl}/get/tile/{x}/{y}/{z}.mvt?idView=${idView}`,
  ];
}

/**
 * Keeps usable HTTP(S) raster templates without changing their placeholders.
 * @param {unknown} tiles - Stored view source tiles.
 * @returns {string[]} Normalized tile templates.
 */
export function normalizeRasterTiles(tiles) {
  if (!Array.isArray(tiles)) {
    return [];
  }

  return tiles.flatMap((tile) => {
    if (typeof tile !== "string") {
      return [];
    }

    const value = tile.trim();
    if (!value) {
      return [];
    }

    try {
      const url = new URL(value);
      return protocolsHttp.has(url.protocol) ? [value] : [];
    } catch {
      return [];
    }
  });
}

/**
 * Derives the public API origin from server settings.
 * @param {Object} api - Public API settings.
 * @returns {string|null} Public API origin.
 */
export function getPublicApiBaseUrl(api) {
  const host = api?.host_public;
  if (typeof host !== "string" || !host.trim()) {
    return null;
  }

  const port = `${api?.port_public || ""}`.trim();
  const protocolConfigured = `${api?.protocol || ""}`.trim();
  const protocol = protocolConfigured
    ? protocolConfigured.replace(/:?$/, ":")
    : port === "443"
      ? "https:"
      : "http:";
  const portSuffix = port ? `:${port}` : "";

  try {
    return new URL(`${protocol}//${host.trim()}${portSuffix}`).origin;
  } catch {
    return null;
  }
}
