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
