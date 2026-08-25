/*
 * External metadata is owned by RT/CC views. Remove every revision of sources
 * that no current view references, including entries left by the former
 * standalone creation UI and interrupted legacy creation flows.
 */
WITH orphan_external AS (
  SELECT source.id
  FROM mx_sources_latest source
  WHERE source.type = 'external'
    AND NOT EXISTS (
      SELECT 1
      FROM mx_views_latest view
      WHERE view.data #>> '{source,metadataId}' = source.id
    )
)
DELETE FROM mx_sources source
USING orphan_external orphan
WHERE source.id = orphan.id;
