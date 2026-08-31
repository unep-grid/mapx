/* Support the source-settings impact queries on current view revisions. */
CREATE INDEX IF NOT EXISTS mx_views_id_latest_idx
ON public.mx_views USING btree (id, pid DESC);

CREATE INDEX IF NOT EXISTS mx_views_source_layer_name_idx
ON public.mx_views USING btree ((data #>> '{source,layerInfo,name}'));

CREATE INDEX IF NOT EXISTS mx_views_source_mask_name_idx
ON public.mx_views USING btree ((data #>> '{source,layerInfo,maskName}'));

CREATE INDEX IF NOT EXISTS mx_views_source_metadata_id_idx
ON public.mx_views USING btree ((data #>> '{source,metadataId}'));

CREATE INDEX IF NOT EXISTS mx_views_dashboard_widgets_trgm_idx
ON public.mx_views USING gin (
  (coalesce(data #>> '{dashboard,widgets}', '')) gin_trgm_ops
)
WHERE type = 'vt';

CREATE INDEX IF NOT EXISTS mx_views_methods_trgm_idx
ON public.mx_views USING gin (
  (coalesce(data #>> '{methods}', '')) gin_trgm_ops
)
WHERE type = 'cc';
