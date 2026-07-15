import { pgRead } from "#mapx/db";

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
  )
  SELECT
    p.id,
    COALESCE(NULLIF(p.title ->> $2, ''), NULLIF(p.title ->> 'en', ''), p.id) AS title,
    COALESCE(NULLIF(p.description ->> $2, ''), NULLIF(p.description ->> 'en', ''), '') AS description,
    COALESCE(p.org_name, '') AS org_name,
    COALESCE(p.themes, '{}'::text[]) AS themes,
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
  WHERE p.public OR p.user_is_admin OR p.user_is_publisher OR p.user_is_member
  ORDER BY p.date_modified DESC NULLS LAST, title ASC
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
  normalizeLanguage,
  normalizeProjectIds,
};
