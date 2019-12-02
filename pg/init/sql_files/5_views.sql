
\connect mapx

--
-- View: public.mx_views_latest
--

CREATE OR REPLACE VIEW public.mx_views_latest AS
 WITH latest_date AS (
         SELECT mx_views_1.id,
            max(mx_views_1.date_modified) AS date_latest
           FROM mx_views mx_views_1
          GROUP BY mx_views_1.id
        ), subviews AS (
         SELECT mx_views_1.pid
           FROM mx_views mx_views_1,
            latest_date
          WHERE mx_views_1.id::text = latest_date.id::text AND mx_views_1.date_modified = latest_date.date_latest
        )
 SELECT mx_views.id,
    mx_views.editor,
    mx_views.target,
    mx_views.date_modified,
    mx_views.data,
    mx_views.type,
    mx_views.pid,
    mx_views.project,
    mx_views.readers,
    mx_views.editors
   FROM mx_views,
    subviews
  WHERE mx_views.pid = subviews.pid;

ALTER TABLE public.mx_views_latest
    OWNER TO mapxw;

GRANT SELECT ON TABLE public.mx_views_latest TO readonly;
GRANT ALL ON TABLE public.mx_views_latest TO mapxw;
