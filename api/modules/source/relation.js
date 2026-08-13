/** Return the PostgreSQL relation kind owned by a catalog source. */
export function getSourceRelationKind(type) {
  if (type === "join") return "VIEW";
  if (["vector", "tabular", "raster"].includes(type)) return "TABLE";
  return null;
}
