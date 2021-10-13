WITH flat AS (
  SELECT
  id,
  title #>> '{"{{language}}"}' title,
  description #>> '{"{{language}}"}' description
  FROM
  mx_projects
  WHERE
  public = true
),
sub AS (
 SELECT
 *
 FROM
 flat
 WHERE
 title ~ '{{titleRegex}}'
 OR id IN {{idProjects}}
),
count_sub  as (
  SELECT
  count(*) n
  FROM
  sub
),
count_all  as (
  SELECT count(id) n
  FROM flat
),
hits as (
  SELECT
  json_build_object(
    'id', id,
    'title',title,
    'description',description
  ) hits
  FROM sub
  ORDER BY title DESC
  LIMIT {{limit}}
  OFFSET {{offset}}
),
hits_agg as (
  SELECT
  json_agg(h.hits) hits
  FROM
  hits h
),
built as (
  SELECT
  json_build_object(
    'hits',h.hits,
    'n_total',ca.n,
    'n_found',cs.n,
    'n_pages', ceiling(cs.n::float / {{limit}}),
    'page', {{offset}}/{{limit}} + 1
  ) res
  FROM hits_agg h, count_all ca, count_sub cs
)

SELECT * FROM built;





