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
   * $8 add related views title boolean
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
    services,
    global
    FROM
      mx_sources
    WHERE
      /**
       * At least read or edit mode
       */
      (
        $6::boolean
        OR $7::boolean
      )
      AND
      /**
       * Type matching
       */
    type = ANY ($4)
    AND (
      (
        /**
         * Match readable AND global source 
         */
        $7::boolean
        AND $5::boolean
        AND global
      )
      OR (
        /**
         * Or match project's user roles 
         */
        project = $1
        AND (
          /**
           * In case of edit mode
           */
          (
            $6::boolean
            AND (
              editor = $2::integer
              OR editors ?| $3
              OR editors ? $2::varchar
            )
          )
          OR
          /**
           * In case of read mode
           */
          (
            $7::boolean
            AND (
              editor = $2::integer
              OR readers ?| $3
              OR readers ? $2::varchar
            )
          )
        )
      )
    )
    OR (
      /**
       * Includes predefined id 
       */
      id = ANY ($9)
    )
    ORDER BY
      title ASC
  ),
  /**
   * Table of sources id, with views title 
   */
  views_agg as (
    SELECT
      s.id id_source,
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
      $8::boolean
      AND v.project = $1
      AND v.type = 'vt'
      AND (
        v.editor = $2::integer
        OR v.editors ? $2::varchar
        OR v.editors ?| $3
        OR v.readers ? $2::varchar
        OR v.readers ?| $3
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
      coalesce(v.titles, array[]::text[]) AS views
    FROM
      sources s
      LEFT OUTER JOIN views_agg v ON s.id = v.id_source
  )
  /**
   * Return source list with or without related views title
   */
SELECT
  *
FROM
  grouped
