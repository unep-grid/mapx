export function getVerticalKind(meta = {}, values = []) {
  const text = `${meta.label || ""} ${meta.name || ""}`.toLowerCase();
  if (text.includes("depth")) {
    return "depth";
  }
  if (text.includes("elevation") || text.includes("altitude")) {
    return hasOnlyNegativeValues(values) ? "depth" : "elevation";
  }
  return "vertical";
}

export function orderVerticalValues(values, meta = {}) {
  const ordered = [...values].filter(Number.isFinite);
  const kind = getVerticalKind(meta, ordered);

  if (kind === "depth") {
    return ordered.sort((a, b) => {
      const da = Math.abs(a);
      const db = Math.abs(b);
      if (da !== db) {
        return da - db;
      }
      return b - a;
    });
  }

  if (kind === "elevation") {
    return ordered.sort((a, b) => b - a);
  }

  return ordered;
}

export function formatVerticalAxisLabel(meta = {}, values = []) {
  const kind = getVerticalKind(meta, values);
  if (kind === "depth") {
    return "Depth";
  }
  if (kind === "elevation") {
    return "Elevation";
  }
  return titleCase(meta.label || meta.name || "Vertical");
}

function hasOnlyNegativeValues(values) {
  return values.length > 0 && values.every((value) => value <= 0);
}

function titleCase(value) {
  return String(value)
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}
