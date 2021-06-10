WITH sim AS (
  SELECT
  type,
  concept,
  text,
  similarity('{{text}}', text) s
  FROM
  mx_gemet
  WHERE
  language = '{{language}}'
),
sub AS (
  SELECT
  *
  FROM
  sim
  WHERE
  s > 0.10
),
count_sim  as (
  SELECT
  count(*) n
  FROM
  sub
),
count_all  as (
  SELECT count(id) n
  FROM mx_gemet
  WHERE language = '{{language}}'
),
hits as (
  SELECT
  json_build_object(
    'type',type,
    'concept',concept,
    'text',text,
    'score',s
  ) hits
  FROM sub
  ORDER BY s DESC
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
  FROM hits_agg h, count_all ca, count_sim cs
)

SELECT * FROM built;





