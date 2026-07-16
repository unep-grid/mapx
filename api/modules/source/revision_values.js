const jsonColumns = new Set([
  "target",
  "data",
  "readers",
  "editors",
  "services",
]);

/** Prepare values for PostgreSQL JSONB columns instead of PG array encoding. */
export function prepareRevisionValue(column, value) {
  if (jsonColumns.has(column) && value !== null && value !== undefined) {
    return JSON.stringify(value);
  }
  return value;
}
