import { isProjectId } from "@fxi/mx_valid";
import { isRoot } from "#mapx/authentication";
import { pgRead, pgWrite } from "#mapx/db";

const MAX_LOGOS_PER_REQUEST = 20;

const accessibleProjectsSql = `
  WITH accessible AS (
    SELECT
      p.*,
      p.admins @> jsonb_build_array($1::integer) AS user_is_admin,
      p.publishers @> jsonb_build_array($1::integer) AS user_is_publisher,
      p.members @> jsonb_build_array($1::integer) AS user_is_member
    FROM mx_projects p
    WHERE p.active IS TRUE
  ),
  view_counts AS (
    SELECT project, count(*)::integer AS view_count
    FROM mx_views_latest
    GROUP BY project
  ),
  favorites AS (
    SELECT DISTINCT jsonb_array_elements_text(
      CASE
        WHEN jsonb_typeof(u.data #> '{user,preferences,favorite_projects}') = 'array'
          THEN u.data #> '{user,preferences,favorite_projects}'
        ELSE '[]'::jsonb
      END
    ) AS id
    FROM mx_users u
    WHERE u.id = $1
  )
  SELECT
    p.id,
    COALESCE(NULLIF(p.title ->> $2, ''), NULLIF(p.title ->> 'en', ''), p.id) AS title,
    COALESCE(NULLIF(p.description ->> $2, ''), NULLIF(p.description ->> 'en', ''), '') AS description,
    COALESCE(p.org_name, '') AS org_name,
    COALESCE(p.themes, '{}'::text[]) AS themes,
    p.featured_rank,
    (f.id IS NOT NULL) AS is_favorite,
    CASE
      WHEN p.user_is_admin THEN 'admin'
      WHEN p.user_is_publisher THEN 'publisher'
      WHEN p.user_is_member THEN 'member'
      ELSE 'public'
    END AS role,
    (p.user_is_admin OR p.user_is_publisher OR p.user_is_member) AS is_member,
    p.public,
    p.allow_join,
    COALESCE(length(p.logo), 0) > 0 AS has_logo,
    p.date_modified,
    COALESCE(v.view_count, 0) AS view_count,
    (
      SELECT count(DISTINCT collaborator)::integer
      FROM (
        SELECT jsonb_array_elements_text(COALESCE(p.admins, '[]'::jsonb)) AS collaborator
        UNION ALL
        SELECT jsonb_array_elements_text(COALESCE(p.publishers, '[]'::jsonb))
        UNION ALL
        SELECT jsonb_array_elements_text(COALESCE(p.members, '[]'::jsonb))
      ) collaborators
    ) AS collaborator_count
  FROM accessible p
  LEFT JOIN view_counts v ON v.project = p.id
  LEFT JOIN favorites f ON f.id = p.id
  WHERE p.public OR p.user_is_admin OR p.user_is_publisher OR p.user_is_member
  ORDER BY p.date_modified DESC NULLS LAST, title ASC
`;

const favoriteSetSql = `
  WITH current_preferences AS (
    SELECT
      u.id,
      CASE
        WHEN jsonb_typeof(u.data #> '{user,preferences,favorite_projects}') = 'array'
          THEN u.data #> '{user,preferences,favorite_projects}'
        ELSE '[]'::jsonb
      END AS favorites
    FROM mx_users u
    WHERE u.id = $1
    FOR UPDATE
  ),
  next_preferences AS (
    SELECT
      id,
      CASE
        WHEN $3::boolean THEN (
          SELECT jsonb_agg(value ORDER BY ordinal)
          FROM (
            SELECT DISTINCT ON (value) value, ordinal
            FROM (
              SELECT value, ordinal
              FROM jsonb_array_elements_text(favorites) WITH ORDINALITY item(value, ordinal)
              UNION ALL
              SELECT $2::text, 2147483647
            ) values_with_new
            ORDER BY value, ordinal
          ) deduplicated
        )
        ELSE COALESCE((
          SELECT jsonb_agg(value ORDER BY ordinal)
          FROM (
            SELECT DISTINCT ON (value) value, ordinal
            FROM jsonb_array_elements_text(favorites) WITH ORDINALITY item(value, ordinal)
            WHERE value <> $2
            ORDER BY value, ordinal
          ) deduplicated
        ), '[]'::jsonb)
      END AS favorites
    FROM current_preferences
  )
  UPDATE mx_users u
  SET data = jsonb_set_nested(
    COALESCE(u.data, '{}'::jsonb),
    ARRAY['user', 'preferences', 'favorite_projects'],
    COALESCE(n.favorites, '[]'::jsonb)
  )
  FROM next_preferences n
  WHERE u.id = n.id
    AND (
      $3::boolean IS FALSE
      OR EXISTS (
        SELECT 1
        FROM mx_projects p
        WHERE p.id = $2
          AND p.active IS TRUE
          AND (
            p.public
            OR p.admins @> jsonb_build_array($1::integer)
            OR p.publishers @> jsonb_build_array($1::integer)
            OR p.members @> jsonb_build_array($1::integer)
          )
      )
    )
  RETURNING u.data #> '{user,preferences,favorite_projects}' AS favorite_projects
`;

const projectLogosSql = `
  SELECT p.id, p.logo
  FROM mx_projects p
  WHERE p.active IS TRUE
    AND p.id = ANY($2::text[])
    AND COALESCE(length(p.logo), 0) > 0
    AND (
      p.public
      OR p.admins @> jsonb_build_array($1::integer)
      OR p.publishers @> jsonb_build_array($1::integer)
      OR p.members @> jsonb_build_array($1::integer)
    )
`;

function getSessionUserId(socket) {
  const session = socket?.session || {};
  return session.user_authenticated ? Number(session.user_id) || 0 : 0;
}

function requireAuthenticatedUserId(socket) {
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
  normalizeLanguage,
  normalizeProjectIds,
  validateFeaturedRank,
  validateProjectId,
};
