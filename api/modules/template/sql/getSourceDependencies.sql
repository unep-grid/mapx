SELECT DISTINCT
  dv.relname AS id,
  'view' AS
type,
COALESCE(
  NULLIF(ms.data #>> '{meta,text,title,{{language}}}', ''),
  NULLIF(ms.data #>> '{meta,text,title,en}', ''),
  ms.id
) AS title,
ms.project AS id_project,
COALESCE(
  NULLIF(p.title #>> '{{{language}}}', ''),
  NULLIF(p.title #>> '{en}', ''),
  p.id
) AS title_project,
u.email AS email_editor
FROM
  pg_depend pd
  JOIN pg_rewrite pr ON pd.objid = pr.oid
  JOIN pg_class dv ON pr.ev_class = dv.oid
  JOIN pg_class st ON pd.refobjid = st.oid
  JOIN pg_namespace dns ON dns.oid = dv.relnamespace
  JOIN pg_namespace sns ON sns.oid = st.relnamespace
  JOIN mx_sources ms ON ms.id = dv.relname
  JOIN mx_projects p ON ms.project = p.id
  JOIN mx_users u on ms.editor = u.id
WHERE
  st.relkind = 'r'
  AND dv.relkind = 'v'
  AND st.relname = $1
ORDER BY
  dv.relname;
