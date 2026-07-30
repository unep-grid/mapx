// @ts-check
import { pgRead } from "#mapx/db";
import {
  getUserRoles,
  validateRoleHandlerFor,
  validateTokenHandler,
} from "#mapx/authentication";
import { isSourceId, isViewId } from "@fxi/mx_valid";

const MAX_RESULTS = 50;
const ALLOWED_TYPES = new Set([
  "vector",
  "join",
  "tabular",
  "raster",
  "image",
  "pmtiles",
  "document",
]);
const ALLOWED_SORTS = new Set([
  "relevance",
  "editor",
  "uploaded",
  "modified",
  "title",
]);
const ALLOWED_CAPABILITIES = new Set(["geometry"]);

/**
 * @typedef {Object} SourcePickerRequest
 * @property {string} [query]
 * @property {string[]} [acceptedTypes]
 * @property {string[]} [geometryTypes]
 * @property {string[]} [requiredCapabilities]
 * @property {string[]} [tags]
 * @property {string[]} [access]
 * @property {string[]} [selectedIds]
 * @property {string[]} [excludeIds]
 * @property {string} [sort]
 * @property {number} [limit]
 * @property {number} [offset]
 * @property {boolean} [includeFacets]
 * @property {string} [language]
 * @property {string} [viewId]
 */

const sourceBrowserSql = `
WITH view_sources AS (
  SELECT referenced.id_source
  FROM mx_views_latest v
  CROSS JOIN LATERAL unnest(ARRAY[
    v.data #>> '{source,layerInfo,name}',
    v.data #>> '{source,layerInfo,maskName}'
  ]) AS referenced(id_source)
  WHERE v.id = $6
    AND v.project = $1
    AND (
      v.editor = $2::integer
      OR v.editors ? $2::text
      OR v.editors ?| $3::text[]
    )
),
revisions AS (
  SELECT id, min(date_modified) AS date_uploaded
  FROM mx_sources
  GROUP BY id
),
view_counts AS (
  SELECT
    data #>> '{source,layerInfo,name}' AS id_source,
    count(*)::integer AS view_count
  FROM mx_views_latest
  WHERE project = $1
    AND type = 'vt'
  GROUP BY data #>> '{source,layerInfo,name}'
),
accessible AS (
SELECT
  s.id,
  s.type,
  s.date_modified,
  revisions.date_uploaded,
  coalesce(NULLIF(s.data #>> ARRAY['meta','text','title',$4], ''),
           NULLIF(s.data #>> '{meta,text,title,en}', ''), s.id) AS title,
  coalesce(u.email, '') AS editor_email,
  CASE WHEN s.global THEN 'global'
       WHEN s.editor = $2::integer OR s.editors ? $2::text OR s.editors ?| $3::text[]
         THEN 'editable'
       ELSE 'readable'
  END AS access,
  coalesce(
    CASE jsonb_typeof(s.data #> '{meta,text,keywords,keys}')
      WHEN 'array' THEN s.data #> '{meta,text,keywords,keys}'
      WHEN 'string' THEN jsonb_build_array(s.data #> '{meta,text,keywords,keys}')
      ELSE '[]'::jsonb
    END,
    '[]'::jsonb
  ) AS tags,
  coalesce(physical.geometry_types, '[]'::jsonb) AS geometry_types,
  coalesce(view_counts.view_count, 0) AS view_count,
  CASE
    WHEN physical.row_estimate >= 0 THEN physical.row_estimate::bigint
    ELSE NULL
  END AS row_estimate,
  physical.column_count,
  s.id IN (SELECT id_source FROM view_sources) AS is_current
FROM mx_sources_latest s
LEFT JOIN mx_users u ON u.id = s.editor
LEFT JOIN revisions ON revisions.id = s.id
LEFT JOIN view_counts ON view_counts.id_source = s.id
LEFT JOIN LATERAL (
  SELECT
    c.reltuples AS row_estimate,
    CASE
      WHEN geom.attnum IS NULL THEN '[]'::jsonb
      WHEN lower(postgis_typmod_type(geom.atttypmod)) LIKE '%point%'
        THEN '["point"]'::jsonb
      WHEN lower(postgis_typmod_type(geom.atttypmod)) LIKE '%line%'
        THEN '["line"]'::jsonb
      WHEN lower(postgis_typmod_type(geom.atttypmod)) LIKE '%polygon%'
        THEN '["polygon"]'::jsonb
      ELSE '["unspecified"]'::jsonb
    END AS geometry_types,
    (
      SELECT count(*)::integer
      FROM pg_attribute a
      WHERE a.attrelid = c.oid
        AND a.attnum > 0
        AND NOT a.attisdropped
    ) AS column_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_attribute geom
    ON geom.attrelid = c.oid
   AND geom.attname = 'geom'
   AND NOT geom.attisdropped
  WHERE n.nspname = 'public'
    AND c.relname = CASE
      WHEN s.type = 'join' THEN s.data #>> '{join,base,id_source}'
      ELSE s.id
    END
    AND c.relkind IN ('r', 'p')
  LIMIT 1
) physical ON TRUE
WHERE s.type = ANY($5::text[])
  AND (
    (s.project = $1 AND (
      s.editor = $2::integer
      OR s.editors ? $2::text
      OR s.editors ?| $3::text[]
      OR s.readers ? $2::text
      OR s.readers ?| $3::text[]
    ))
    OR s.global IS TRUE
    OR s.id IN (SELECT id_source FROM view_sources)
  )
  AND (
    s.type <> 'join'
    OR coalesce(s.data #>> '{join,base,id_source}', '') <> ''
  )
),
filtered AS (
  SELECT *
  FROM accessible
  WHERE
    (
      NOT $9::boolean
      OR id = ANY($8::text[])
    )
    AND NOT id = ANY($18::text[])
    AND (
      $7::text = ''
      OR id ILIKE '%' || $7 || '%'
      OR title ILIKE '%' || $7 || '%'
      OR editor_email ILIKE '%' || $7 || '%'
      OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(tags) tag(value)
        WHERE tag.value ILIKE '%' || $7 || '%'
      )
    )
    AND (
      NOT $10::boolean
      OR jsonb_array_length(geometry_types) > 0
    )
    AND (
      cardinality($11::text[]) = 0
      OR geometry_types ?| $11::text[]
    )
    AND (
      cardinality($12::text[]) = 0
      OR tags ?& $12::text[]
    )
    AND (
      cardinality($13::text[]) = 0
      OR access = ANY($13::text[])
    )
),
ordered AS (
  SELECT
    filtered.*,
    row_number() OVER (
      ORDER BY
        is_current DESC,
        CASE
          WHEN $14 = 'relevance' AND $7 <> '' AND title ILIKE '%' || $7 || '%'
            THEN 0
          WHEN $14 = 'relevance' AND $7 <> ''
            THEN 1
          ELSE 0
        END,
        CASE WHEN $14 = 'editor' THEN editor_email END ASC,
        CASE WHEN $14 = 'uploaded' THEN date_uploaded END DESC NULLS LAST,
        CASE WHEN $14 = 'modified' THEN date_modified END DESC NULLS LAST,
        title ASC,
        id ASC
    ) AS result_order
  FROM filtered
),
paged AS (
  SELECT *
  FROM ordered
  ORDER BY result_order
  LIMIT $15
  OFFSET $16
),
facet_tags AS (
  SELECT tag.value, count(*)::integer AS count
  FROM accessible
  CROSS JOIN LATERAL jsonb_array_elements_text(tags) tag(value)
  WHERE tag.value <> ''
  GROUP BY tag.value
  ORDER BY count DESC, tag.value
  LIMIT 40
),
facet_geometry AS (
  SELECT geometry.value, count(*)::integer AS count
  FROM accessible
  CROSS JOIN LATERAL jsonb_array_elements_text(geometry_types) geometry(value)
  WHERE geometry.value <> ''
  GROUP BY geometry.value
  ORDER BY count DESC, geometry.value
  LIMIT 40
),
facet_types AS (
  SELECT type AS value, count(*)::integer AS count
  FROM accessible
  GROUP BY type
  ORDER BY count DESC, type
  LIMIT 40
),
facet_access AS (
  SELECT access AS value, count(*)::integer AS count
  FROM accessible
  GROUP BY access
  ORDER BY count DESC, access
  LIMIT 40
)
SELECT
  coalesce(
    (
      SELECT jsonb_agg(
        to_jsonb(paged) - 'result_order'
        ORDER BY result_order
      )
      FROM paged
    ),
    '[]'::jsonb
  ) AS items,
  (SELECT count(*)::integer FROM filtered) AS total,
  CASE
    WHEN $17::boolean AND NOT $9::boolean THEN jsonb_build_object(
      'tags',
      coalesce(
        (
          SELECT jsonb_agg(
            jsonb_build_object('value', value, 'count', count)
            ORDER BY count DESC, value
          )
          FROM facet_tags
        ),
        '[]'::jsonb
      ),
      'geometryTypes',
      coalesce(
        (
          SELECT jsonb_agg(
            jsonb_build_object('value', value, 'count', count)
            ORDER BY count DESC, value
          )
          FROM facet_geometry
        ),
        '[]'::jsonb
      ),
      'sourceTypes',
      coalesce(
        (
          SELECT jsonb_agg(
            jsonb_build_object('value', value, 'count', count)
            ORDER BY count DESC, value
          )
          FROM facet_types
        ),
        '[]'::jsonb
      ),
      'access',
      coalesce(
        (
          SELECT jsonb_agg(
            jsonb_build_object('value', value, 'count', count)
            ORDER BY count DESC, value
          )
          FROM facet_access
        ),
        '[]'::jsonb
      )
    )
    ELSE '{}'::jsonb
  END AS facets
`;

function requirePickerSession(socket) {
  const session = socket?.session;
  if (
    !session?.user_authenticated ||
    !session?.user_roles?.publisher ||
    !session?.project_id
  ) {
    throw new Error("source_picker_access_denied");
  }
  return {
    idProject: session.project_id,
    idUser: Number(session.user_id),
    groups: Array.isArray(session.user_roles.group)
      ? session.user_roles.group
      : [],
  };
}

function normalizeLanguage(language) {
  return /^[a-z]{2}$/i.test(language || "") ? language.toLowerCase() : "en";
}

function normalizeStringArray(value, allowed, fallback = []) {
  if (!Array.isArray(value)) return fallback;
  return [...new Set(value.filter((item) => allowed.has(item)))];
}

function normalizePositiveInteger(value, fallback) {
  const number = Math.trunc(Number(value));
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

/** @param {SourcePickerRequest} [request] */
function normalizeRequest(request = {}) {
  const types = normalizeStringArray(request.acceptedTypes, ALLOWED_TYPES, [
    "vector",
    "join",
  ]);
  const hasSelectedIds = Array.isArray(request.selectedIds);
  const exactSelection = hasSelectedIds;
  const offset = exactSelection
    ? 0
    : normalizePositiveInteger(request.offset, 0);
  return {
    query: String(request.query || "")
      .trim()
      .toLocaleLowerCase()
      .slice(0, 200),
    types: types.length ? types : ["vector", "join"],
    geometryTypes: Array.isArray(request.geometryTypes)
      ? request.geometryTypes.map(String).slice(0, 10)
      : [],
    requiredCapabilities: normalizeStringArray(
      request.requiredCapabilities,
      ALLOWED_CAPABILITIES,
    ),
    tags: Array.isArray(request.tags)
      ? request.tags.map(String).slice(0, 20)
      : [],
    access: Array.isArray(request.access)
      ? request.access.filter((item) =>
          ["editable", "readable", "global"].includes(item),
        )
      : [],
    selectedIds: hasSelectedIds
      ? [
          ...new Set(
            request.selectedIds
              .filter((id) => typeof id === "string" && isSourceId(id))
              .slice(0, 20),
          ),
        ]
      : [],
    excludeIds: Array.isArray(request.excludeIds)
      ? [
          ...new Set(
            request.excludeIds
              .filter((id) => typeof id === "string" && isSourceId(id))
              .slice(0, 20),
          ),
        ]
      : [],
    exactSelection,
    sort: ALLOWED_SORTS.has(request.sort) ? request.sort : "relevance",
    limit: Math.min(
      MAX_RESULTS,
      Math.max(1, normalizePositiveInteger(request.limit, MAX_RESULTS)),
    ),
    offset,
    includeFacets:
      !exactSelection && offset === 0 && request.includeFacets !== false,
    language: normalizeLanguage(request.language),
    viewId: isViewId(request.viewId) ? request.viewId : null,
  };
}

/**
 * @param {any} socket
 * @param {SourcePickerRequest} [request]
 * @param {any} [client]
 */
export async function searchSources(socket, request = {}, client = pgRead) {
  const auth = requirePickerSession(socket);
  const normalized = normalizeRequest(request);
  const result = await client.query(sourceBrowserSql, [
    auth.idProject,
    auth.idUser,
    auth.groups,
    normalized.language,
    normalized.types,
    normalized.viewId,
    normalized.query,
    normalized.selectedIds,
    normalized.exactSelection,
    normalized.requiredCapabilities.includes("geometry"),
    normalized.geometryTypes,
    normalized.tags,
    normalized.access,
    normalized.sort,
    normalized.limit,
    normalized.offset,
    normalized.includeFacets,
    normalized.excludeIds,
  ]);
  const row = result.rows[0] || {};
  const items = Array.isArray(row.items) ? row.items : [];
  const total = Number(row.total) || 0;
  return {
    items,
    total,
    facets: row.facets || {},
    offset: normalized.offset,
    limit: normalized.limit,
    hasMore: normalized.offset + items.length < total,
  };
}

export async function sourceIsAccessible(
  socket,
  idSource,
  client = pgRead,
  viewId = null,
) {
  const auth = requirePickerSession(socket);
  const check = await client.query(
    `SELECT EXISTS (
       SELECT 1 FROM mx_sources_latest s
       WHERE s.id = $1
       AND (
         (s.project = $2 AND (
           s.editor = $3::integer OR s.editors ? $3::text
           OR s.editors ?| $4::text[] OR s.readers ? $3::text
           OR s.readers ?| $4::text[]
         ))
         OR s.global IS TRUE
         OR s.id IN (
           SELECT referenced.id_source
           FROM mx_views_latest v
           CROSS JOIN LATERAL unnest(ARRAY[
             v.data #>> '{source,layerInfo,name}',
             v.data #>> '{source,layerInfo,maskName}'
           ]) AS referenced(id_source)
           WHERE v.id = $5
             AND v.project = $2
             AND (
               v.editor = $3::integer
               OR v.editors ? $3::text
               OR v.editors ?| $4::text[]
             )
         )
       )
     ) AS allowed`,
    [idSource, auth.idProject, auth.idUser, auth.groups, viewId],
  );
  return check.rows[0]?.allowed === true;
}

export async function ioSourceSearch(socket, request, cb) {
  const response = {};
  try {
    Object.assign(response, await searchSources(socket, request));
    response.success = true;
  } catch (error) {
    response.error = error?.message || String(error);
  } finally {
    cb(response);
  }
}

export async function validateSourceSelection(
  { idUser, idProject, idSources, idView },
  client = pgRead,
) {
  const ids = arrayValue(idSources);
  const uniqueIds = new Set(ids);
  if (
    !ids.length ||
    ids.length > 20 ||
    uniqueIds.size !== ids.length ||
    ids.some((id) => typeof id !== "string" || !isSourceId(id))
  ) {
    return { valid: false, ids: [] };
  }
  const roles = await getUserRoles(idUser, idProject, client);
  const result = await client.query(
    `SELECT id
     FROM mx_sources_latest s
     WHERE id = ANY($1::text[])
       AND type IN ('vector', 'join')
       AND (type <> 'join' OR coalesce(data #>> '{join,base,id_source}', '') <> '')
       AND (
         (project = $2 AND (
           editor = $3::integer OR editors ? $3::text
           OR editors ?| $4::text[] OR readers ? $3::text
         OR readers ?| $4::text[]
        ))
        OR global IS TRUE
        OR id IN (
          SELECT referenced.id_source
          FROM mx_views_latest v
          CROSS JOIN LATERAL unnest(ARRAY[
            v.data #>> '{source,layerInfo,name}',
            v.data #>> '{source,layerInfo,maskName}'
          ]) AS referenced(id_source)
          WHERE v.id = $5
            AND v.project = $2
            AND (
              v.editor = $3::integer
              OR v.editors ? $3::text
              OR v.editors ?| $4::text[]
            )
        )
       )`,
    [
      ids,
      idProject,
      Number(idUser),
      roles.group || [],
      isViewId(idView) ? idView : null,
    ],
  );
  const allowed = result.rows.map((row) => row.id);
  return { valid: allowed.length === ids.length, ids: allowed };
}

function arrayValue(value) {
  if (Array.isArray(value)) return value;
  return typeof value === "string" ? value.split(",") : [];
}

async function sourceSelectionHandler(req, res) {
  try {
    const validation = await validateSourceSelection(req.query);
    res.status(200).json(validation);
  } catch (error) {
    res
      .status(400)
      .json({ valid: false, error: error?.message || String(error) });
  }
}

export const mwValidateSourceSelection = [
  validateTokenHandler,
  validateRoleHandlerFor("publisher"),
  sourceSelectionHandler,
];

export const sourceBrowserInternals = {
  MAX_RESULTS,
  normalizeRequest,
  sourceBrowserSql,
};
