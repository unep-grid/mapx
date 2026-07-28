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
