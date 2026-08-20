// @ts-check

const STATUS = {
  unchecked: {
    translationKey: "project_tiles_report_status_unchecked",
    className: "default",
    icon: ["fa", "fa-circle-o"],
  },
  not_configured: {
    translationKey: "project_tiles_report_status_not_configured",
    className: "default",
    icon: ["fa", "fa-minus"],
  },
  pending: {
    translationKey: "project_tiles_report_status_pending",
    className: "default",
    icon: ["fa", "fa-clock-o"],
  },
  checking: {
    translationKey: "project_tiles_report_status_checking",
    className: "info",
    icon: ["fa", "fa-spinner", "fa-spin"],
  },
  valid: {
    translationKey: "project_tiles_report_status_valid",
    className: "success",
    icon: ["fa", "fa-check"],
  },
  invalid: {
    translationKey: "project_tiles_report_status_invalid",
    className: "danger",
    icon: ["fa", "fa-exclamation-triangle"],
  },
  incomplete: {
    translationKey: "project_tiles_report_status_incomplete",
    className: "warning",
    icon: ["fa", "fa-warning"],
  },
};

/** @typedef {keyof typeof STATUS} RasterHealthState */

/** @param {RasterHealthState} state */
export function rasterStatusConfig(state) {
  return { state, ...STATUS[state] };
}

/**
 * Resolve a stored or freshly tested health object to one resource state.
 * @param {Object | null | undefined} health
 * @param {"tile" | "legend" | "overall"} [resource]
 * @param {{configured?: boolean}} [options]
 */
export function rasterStatusLabel(
  health,
  resource = "overall",
  { configured = true } = {},
) {
  if (!configured || (resource === "legend" && health?.legend_configured === false)) {
    return rasterStatusConfig("not_configured");
  }
  if (!health) return rasterStatusConfig("unchecked");

  const valid = resource === "tile"
    ? (health.tile_valid ?? health.valid)
    : resource === "legend"
      ? health.legend_valid
      : health.valid;

  if (valid === true) return rasterStatusConfig("valid");
  if (valid === false) return rasterStatusConfig("invalid");
  return rasterStatusConfig("unchecked");
}
