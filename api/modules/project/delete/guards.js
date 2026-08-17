import { pgRead } from "#mapx/db";
import { isRoot, isProjectCreator } from "#mapx/authentication";
import { isProjectId } from "@fxi/mx_valid";
import { settings } from "#root/settings";
import { normalizeLanguage } from "./util.js";

/**
 * Shared eligibility check for both the analyze step and the actual
 * delete session : project creators and roots only, never the
 * currently active project, never the configured default project,
 * and only once a project has been explicitly marked legacy.
 *
 * @param {Object} socket Authenticated socket
 * @param {String} idProject Target project id
 * @param {Object} [opt]
 * @param {String} [opt.language] Language for the returned project title
 * @param {Object} [opt.client] PostgreSQL client or pool ( pgRead by default,
 *   pass the transaction's client from inside the delete session for
 *   read-your-own-writes consistency )
 * @return {Promise<{ title: String }>} Resolved project title
 */
export async function assertProjectDeletable(socket, idProject, opt = {}) {
  const client = opt.client || pgRead;
  const language = normalizeLanguage(opt.language);

  if (!isProjectId(idProject)) {
    throw new Error("project_id_invalid");
  }
  if (!isProjectCreator(socket) && !isRoot(socket)) {
    throw new Error("project_delete_access_denied");
  }
  if (idProject === socket?.session?.project_id) {
    throw new Error("project_delete_is_current_forbidden");
  }
  if (idProject === settings.project.default) {
    throw new Error("project_delete_default_forbidden");
  }

  const res = await client.query(
    `SELECT
       legacy,
       coalesce(NULLIF(title #>> ARRAY[$2], ''), NULLIF(title #>> '{en}', ''), id) AS title
     FROM mx_projects
     WHERE id = $1 AND active IS TRUE`,
    [idProject, language],
  );

  const project = res.rows[0];
  if (!project) {
    throw new Error("project_not_found");
  }
  if (project.legacy !== true) {
    throw new Error("project_delete_not_legacy_forbidden");
  }

  return { title: project.title };
}
