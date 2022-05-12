WITH 
updated_view as (
  select
    id,
    editor,
    target,
    now() as date_modified,
    jsonb_set(
      data,
      '{style,_mapbox}',
      to_jsonb($2::text),
      true
    ) as data,
    type,
    nextval('mx_views_pid_seq'::regclass) as pid,
    project,
    readers,
    editors
  from
    mx_views_latest
  where
    id = $1
  limit
    1
)

-- select * from updated_view;

INSERT into
  mx_views
SELECT
  *
from
  updated_view;
