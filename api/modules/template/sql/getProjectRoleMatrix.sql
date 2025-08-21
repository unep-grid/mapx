WITH
  user_roles AS (
    SELECT
      u.id,
      u.email,
      CASE
        WHEN COALESCE(p.contacts, '[]'::jsonb) @> jsonb_build_array(u.id) THEN 4
        WHEN COALESCE(p.admins, '[]'::jsonb) @> jsonb_build_array(u.id) THEN 3
        WHEN COALESCE(p.publishers, '[]'::jsonb) @> jsonb_build_array(u.id) THEN 2
        WHEN COALESCE(p.members, '[]'::jsonb) @> jsonb_build_array(u.id) THEN 1
        ELSE 0
      END AS role_level
    FROM
      mx_users u
      JOIN mx_projects p ON p.id = $1
    WHERE
      u.id IN (
        SELECT
          jsonb_array_elements_text(
            COALESCE(p.contacts, '[]'::jsonb) || COALESCE(p.admins, '[]'::jsonb) || COALESCE(p.publishers, '[]'::jsonb) || COALESCE(p.members, '[]'::jsonb)
          )::integer
      )
  )
SELECT
  id,
  email,
  role_level >= 4 AS is_contact,
  role_level >= 3 AS is_admin,
  role_level >= 2 AS is_publisher,
  role_level >= 1 AS is_member,
  CASE role_level
    WHEN 4 THEN 'contact'
    WHEN 3 THEN 'admin'
    WHEN 2 THEN 'publisher'
    WHEN 1 THEN 'member'
    ELSE 'none'
  END AS highest_role
FROM
  user_roles
ORDER BY
  role_level DESC,
  email;
