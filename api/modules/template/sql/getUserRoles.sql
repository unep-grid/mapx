SELECT admins, publishers, members, public
  FROM mx_projects
  WHERE
  id = $1::text
