/**
 * Explicitly empty shell values override file values; neither input is mutated.
 * @param {Record<string, string | undefined>} [environment]
 * @param {Record<string, string | undefined>} [fileEnvironment]
 * @returns {{maintenanceEnd: string, mapTilerToken: string, apiHostPrefix: string}}
 */
export function resolveConfiguration(
  environment = process.env,
  fileEnvironment = {},
) {
  const values = { ...fileEnvironment, ...environment };
  return Object.freeze({
    maintenanceEnd: (values.MAINTENANCE_END ?? "").trim(),
    mapTilerToken: (values.MAPTILER_TOKEN ?? "").trim(),
    apiHostPrefix:
      (values.MAINTENANCE_API_HOST_PREFIX ?? "").trim().toLowerCase() || "api.",
  });
}
