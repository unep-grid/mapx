import { isProjectId } from "@fxi/mx_valid";
import { isRoot } from "#mapx/authentication";
import { pgRead, pgWrite } from "#mapx/db";
import { templates } from "#mapx/template";

const MAX_LOGOS_PER_REQUEST = 20;

const accessibleProjectsSql = templates.getAccessibleProjects;
const favoriteSetSql = templates.setFavoriteProject;
const legacySetSql = templates.setLegacyProject;
const projectLogosSql = templates.getAccessibleProjectLogos;

function getSessionUserId(socket) {
  const session = socket?.session || {};
  return session.user_authenticated ? Number(session.user_id) || 0 : 0;
}

function requireAuthenticatedUserId(socket) {
  if (socket?.session?.user_is_guest === true) {
    throw new Error("authentication_required");
  }
  const idUser = getSessionUserId(socket);
  if (!idUser) {
    throw new Error("authentication_required");
  }
  return idUser;
}

function validateProjectId(idProject) {
  if (!isProjectId(idProject)) {
    throw new Error("project_id_invalid");
  }
  return idProject;
}

function validateFeaturedRank(rank) {
  if (!Number.isInteger(rank) || rank <= 0) {
    throw new Error("project_featured_rank_invalid");
  }
  return rank;
}

function normalizeLanguage(language) {
  return /^[a-z]{2}$/i.test(language || "") ? language.toLowerCase() : "en";
}

function normalizeProjectIds(ids) {
  if (!Array.isArray(ids)) {
    return [];
  }
  return [...new Set(ids)]
    .filter((id) => typeof id === "string" && /^[A-Z0-9_-]{1,40}$/i.test(id))
    .slice(0, MAX_LOGOS_PER_REQUEST);
}

export async function getAccessibleProjects(socket, language) {
  const idUser = getSessionUserId(socket);
  const result = await pgRead.query(accessibleProjectsSql, [
    idUser,
    normalizeLanguage(language),
  ]);
  return result.rows;
}

export async function getAccessibleProjectLogos(socket, ids) {
  const projectIds = normalizeProjectIds(ids);
  if (projectIds.length === 0) {
    return {};
  }
  const idUser = getSessionUserId(socket);
  const result = await pgRead.query(projectLogosSql, [idUser, projectIds]);
  return Object.fromEntries(result.rows.map(({ id, logo }) => [id, logo]));
}

export async function ioProjectList(socket, data, cb) {
  data = data || {};
  try {
    data.projects = await getAccessibleProjects(socket, data.language);
    data.can_curate_featured = isRoot(socket);
    data.can_curate_legacy = isRoot(socket);
    data.success = true;
  } catch (error) {
    data.error = error?.message || error;
  } finally {
    cb(data);
  }
}

export async function setFavoriteProject(socket, idProject, favorite) {
  const idUser = requireAuthenticatedUserId(socket);
  validateProjectId(idProject);
  if (typeof favorite !== "boolean") {
    throw new Error("project_favorite_value_invalid");
  }
  const result = await pgWrite.query(favoriteSetSql, [
    idUser,
    idProject,
    favorite,
  ]);
  if (result.rowCount !== 1) {
    throw new Error(
      favorite ? "project_favorite_access_denied" : "user_not_found",
    );
  }
  return result.rows[0].favorite_projects || [];
}

export async function ioProjectFavoriteSet(socket, data, cb) {
  data = data || {};
  try {
    data.favorite_projects = await setFavoriteProject(
      socket,
      data.id_project,
      data.favorite,
    );
    data.success = true;
  } catch (error) {
    data.error = error?.message || error;
  } finally {
    cb(data);
  }
}

export async function setFeaturedProject(socket, idProject, featured, rank) {
  if (!isRoot(socket)) {
    throw new Error("project_featured_access_denied");
  }
  validateProjectId(idProject);
  if (typeof featured !== "boolean") {
    throw new Error("project_featured_value_invalid");
  }
  if (rank !== undefined && rank !== null && rank !== "") {
    rank = validateFeaturedRank(rank);
  } else {
    rank = null;
  }

  const client = await pgWrite.connect();
  try {
    await client.query("BEGIN");
    await client.query("LOCK TABLE mx_projects IN SHARE ROW EXCLUSIVE MODE");
    const result = featured
      ? await client.query(
          `UPDATE mx_projects
           SET featured_rank = COALESCE(
             $2::integer,
             (SELECT COALESCE(max(featured_rank), 0) + 1000 FROM mx_projects)
           )
           WHERE id = $1 AND active IS TRUE
           RETURNING featured_rank`,
          [idProject, rank],
        )
      : await client.query(
          `UPDATE mx_projects
           SET featured_rank = NULL
           WHERE id = $1
           RETURNING featured_rank`,
          [idProject],
        );
    if (result.rowCount !== 1) {
      throw new Error("project_not_found");
    }
    await client.query("COMMIT");
    return result.rows[0].featured_rank;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function ioProjectFeaturedSet(socket, data, cb) {
  data = data || {};
  try {
    data.featured_rank = await setFeaturedProject(
      socket,
      data.id_project,
      data.featured,
      data.rank,
    );
    data.success = true;
  } catch (error) {
    data.error = error?.message || error;
  } finally {
    cb(data);
  }
}

export async function setLegacyProject(socket, idProject, legacy) {
  if (!isRoot(socket)) {
    throw new Error("project_legacy_access_denied");
  }
  validateProjectId(idProject);
  if (typeof legacy !== "boolean") {
    throw new Error("project_legacy_value_invalid");
  }
  const result = await pgWrite.query(legacySetSql, [idProject, legacy]);
  if (result.rowCount !== 1) {
    throw new Error("project_not_found");
  }
  return result.rows[0].legacy === true;
}

export async function ioProjectLegacySet(socket, data, cb) {
  data = data || {};
  try {
    data.legacy = await setLegacyProject(
      socket,
      data.id_project,
      data.legacy,
    );
    data.success = true;
  } catch (error) {
    data.error = error?.message || error;
  } finally {
    cb(data);
  }
}

export async function ioProjectLogosGet(socket, data, cb) {
  data = data || {};
  try {
    data.logos = await getAccessibleProjectLogos(socket, data.ids);
    data.success = true;
  } catch (error) {
    data.error = error?.message || error;
  } finally {
    cb(data);
  }
}

export const projectBrowserInternals = {
  favoriteSetSql,
  legacySetSql,
  normalizeLanguage,
  normalizeProjectIds,
  validateFeaturedRank,
  validateProjectId,
};
