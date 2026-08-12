import { getUserRoles } from "#mapx/authentication";

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * Resolve source edit permission from database state.
 *
 * @param {Object} options
 * @param {Object} options.client PostgreSQL client or pool
 * @param {string} options.idSource Source identifier
 * @param {number|string} options.idUser Authenticated user identifier
 * @param {string|null} [options.idProject] Required source project
 * @param {boolean} [options.allowRoot] Whether root bypasses the source ACL
 * @returns {Promise<{allowed: boolean, roles: Object, source: Object|null}>}
 */
export async function getSourceEditPermission({
  client,
  idSource,
  idUser,
  idProject = null,
  allowRoot = true,
}) {
  const sourceResult = await client.query(
    `SELECT editor, editors, project
     FROM mx_sources_latest
     WHERE id = $1`,
    [idSource],
  );
  const source = sourceResult.rows[0] || null;
  if (!source || (idProject && source.project !== idProject)) {
    return { allowed: false, roles: {}, source };
  }

  const roles = await getUserRoles(idUser, source.project, client);
  const groups = asArray(roles.group);
  const editors = asArray(source.editors);
  const matchesAcl =
    source.editor === Number(idUser) ||
    editors.includes(String(idUser)) ||
    editors.some((editor) => groups.includes(editor));
  const allowed =
    roles.publisher === true &&
    ((allowRoot && roles.root === true) || matchesAcl);

  return { allowed, roles, source };
}
