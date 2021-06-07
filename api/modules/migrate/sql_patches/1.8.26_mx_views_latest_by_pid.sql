/**
* Quick access to latest views version of MapX
* NOTE: CTE subviews improve a lot (12-14X) the performance for some requests.
*/ 
CREATE OR REPLACE VIEW public.mx_views_latest
AS
WITH 
latest_pid AS (
  SELECT id,
  max(v.pid) AS pid
  FROM mx_views v
  GROUP BY id
),
subviews AS (
  SELECT v.pid
  FROM 
  mx_views v,
  latest_pid l
  WHERE v.id = l.id AND v.pid = l.pid
)
SELECT v.id,
v.editor,
v.target,
v.date_modified,
v.data,
v.type,
v.pid,
v.project,
v.readers,
v.editors
FROM mx_views v,
subviews l
WHERE v.pid = l.pid;

ALTER TABLE public.mx_views_latest
OWNER TO mapxw;

GRANT SELECT ON TABLE public.mx_views_latest TO readonly;
GRANT ALL ON TABLE public.mx_views_latest TO readwrite;
