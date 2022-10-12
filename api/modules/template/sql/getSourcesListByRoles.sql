WITH 
/**
* Table of sources
*/ 
sources as (
SELECT
  pid,
  id,
  project,
  type,
  date_modified,
  coalesce(
    NULLIF(data #>> '{meta,text,title,{{language}}}',''),
    NULLIF(data #>> '{meta,text,title,en}',''),
    id
  ) as title,
  coalesce(
    NULLIF(data #>> '{meta,text,title,abstract,{{language}}}',''),
    NULLIF(data #>> '{meta,text,abstract,en}',''),
    id
  ) as abstract,
  editor,
  readers,
  editors,
  services
FROM
  mx_sources
WHERE
  /* $1 idProject */
  project = $1
  AND (
    /* $2 idUser */ 
    editor = $2
    OR editors ? $2::varchar
    /* $3 user groups as stringified array e.g. '["admins","publishers"]' */
    OR editors ?| ARRAY(SELECT jsonb_array_elements_text($3::jsonb)) 
  )
  AND 
  type = ANY ($4)
ORDER BY title ASC
),
/**
* Table of sources id, with views title 
*/ 
views_agg as (
  SELECT 
  s.id,
  array_agg(
   coalesce(
     NULLIF(v.data #>> '{title,{{language}}}',''),
     NULLIF(v.data #>> '{title,en}',''),
     v.id
   )
  ) titles
  FROM sources s 
  JOIN mx_views_latest v 
  ON v.data #>> '{source,layerInfo,name}' = s.id
  WHERE
  v.project = $1 
  AND v.type = 'vt'
  AND (
    v.editor = $2
    OR v.editors ? $2::varchar 
    OR v.editors ?| ARRAY(SELECT jsonb_array_elements_text($3::jsonb))
  )
  GROUP BY s.id
),
/**
* Tables combined 
*/ 
grouped as (
  SELECT s.*, v.titles as views  
  FROM sources s 
  LEFT OUTER JOIN views_agg v 
  ON s.id = v.id 
)


select * from grouped
