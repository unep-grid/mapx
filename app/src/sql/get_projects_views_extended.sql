WITH
  views_external as (
    SELECT
      id,
      jsonb_array_elements_text(p.views_external) id_view
    FROM
      mx_projects p
    WHERE
      p.id != '%1$s'
  ),
  projects_by_view as (
    SELECT
      id_view,
      to_jsonb(array_agg(id)) as projects_a
    FROM
      views_external
    GROUP BY
      id_view
  ),
  story_views as (
    SELECT
      v.id as story_id,
      jsonb_array_elements(
        COALESCE(v.data -> 'story' -> 'steps', '[]'::jsonb)
      ) -> 'views' as story_view
    FROM
      mx_views_latest v
    WHERE
      v.type = 'sm'
  ),
  story_views_clean_array AS (
    SELECT
      story_id,
       jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(story_view) = 'string' THEN 
          jsonb_build_array(story_view)
        WHEN jsonb_typeof(story_view) = 'array' THEN
          story_view
        ELSE
          '[]'::jsonb
      END ) AS story_view
    FROM
      story_views
  ),
  story_views_clean as (
    SELECT
      story_id,
	  CASE
	  WHEN
	  jsonb_typeof(story_view) = 'object' THEN story_view ->> 'view'
	  ELSE
	  -- story_view::text
          story_view ->> 0
	  END as story_view
    FROM
      story_views_clean_array
  ),
  project_view as (
    SELECT
      v.id,
      v.data #>> '{title,en}' as title,
      CASE
        WHEN jsonb_typeof(v.data -> 'projects') = 'array' THEN data -> 'projects'
        WHEN jsonb_typeof(v.data -> 'projects') = 'string' THEN jsonb_build_array(v.data -> 'projects')
        ELSE '[]'::jsonb
      END as projects_b,
      COALESCE(p.projects_a, '[]'::jsonb) as projects_a
    FROM
      mx_views_latest v
      LEFT JOIN projects_by_view p ON v.id = p.id_view
    WHERE
      v.project = '%1$s'
  ),
  view_stories as (
    SELECT
      pv.id,
      COALESCE(jsonb_agg(s.story_id) FILTER (WHERE s.story_id IS NOT NULL), '[]'::jsonb) as stories
    FROM
      project_view pv
    LEFT JOIN
      story_views_clean s ON s.story_view = pv.id
    GROUP BY
      pv.id
  )
SELECT
  pv.id,
  pv.title,
  jsonb_array_length(pv.projects_b) as n_share,
  jsonb_array_length(pv.projects_a) as n_external,
  jsonb_array_length(sv.stories) as n_story
FROM
  project_view pv
  LEFT JOIN view_stories sv ON pv.id = sv.id
  ORDER BY 
  n_share DESC,
  n_external DESC,
  n_story DESC
