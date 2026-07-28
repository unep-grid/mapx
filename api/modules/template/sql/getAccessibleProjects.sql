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
