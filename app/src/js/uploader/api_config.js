// @ts-check

/** @param {unknown} value */
export function quoteShellValue(value) {
  return `'${String(value ?? "").replaceAll("'", `'"'"'`)}'`;
}

/**
 * Build the environment consumed by api/modules/upload/examples/upload_vector.sh.
 * @param {{apiUrl: string, userId: string | number, token: string, projectId: string}} values
 */
export function buildUploadApiEnvironment(values) {
  const entries = [
    ["MAPX_API", values.apiUrl],
    ["MAPX_USER", values.userId],
    ["MAPX_TOKEN", values.token],
    ["MAPX_PROJECT", values.projectId],
  ];
  return entries
    .map(([name, value]) => `export ${name}=${quoteShellValue(value)}`)
    .join("\n");
}
