WITH
  /**
   * Table of sources
   * $1 idProject string  
   * $2 idUser integer 
   * $3 user groups as stringified array e.g. '["admins","publishers"]' 
   * $4 types e.g.  ['join']
   * $5 add_global boolean
   * $6 editable boolean
   * $7 readable boolean
   */
  sources as (
    SELECT
      pid,
      id,
      project,
    type,
    date_modified,
    coalesce(
      NULLIF(data #>> '{meta,text,title,{{language}}}', ''),
      NULLIF(data #>> '{meta,text,title,en}', ''),
      id
    ) as title,
    coalesce(
      NULLIF(
        data #>> '{meta,text,title,abstract,{{language}}}',
        ''
      ),
      NULLIF(data #>> '{meta,text,abstract,en}', ''),
      id
    ) as abstract,
    editor,
    readers,
    editors,
    services
    FROM
      mx_sources
    WHERE
      /**
       * Type matching
       */
    type = ANY ($4)
    AND (
      (
        /**
         * Match global source 
         */
        $5::boolean
        AND global
      )
      OR (
        /**
         * Or match project's user roles 
         */
        project = $1
        AND (
          (
            $6::boolean
            AND (
              editors ?| $3
              OR editors ? $2::varchar
            )
          )
          OR (
            $7::boolean
            AND (
              readers ?| $3
              OR readers ? $2::varchar
            )
          )
          OR editor = $2::integer
        )
      )
    )
    ORDER BY
      title ASC
  ),
  /**
   * Table of sources id, with views title 
   */
  views_agg as (
    SELECT
      s.id,
      array_agg(
        coalesce(
          NULLIF(v.data #>> '{title,{{language}}}', ''),
          NULLIF(v.data #>> '{title,en}', ''),
          v.id
        )
      ) titles
    FROM
      sources s
      JOIN mx_views_latest v ON v.data #>> '{source,layerInfo,name}' = s.id
    WHERE
      v.project = $1
      AND v.type = 'vt'
      AND (
        v.editor = $2::integer
        OR v.editors ? $2::varchar
        OR v.editors ?| $3
      )
    GROUP BY
      s.id
  ),
  /**
   * Tables combined 
   */
  grouped as (
    SELECT
      s.*,
      v.titles as views
    FROM
      sources s
      LEFT OUTER JOIN views_agg v ON s.id = v.id
  )
select
  *
from
  grouped
