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

/**
 * @typedef {Object} SourcePickerRequest
 * @property {string} [query]
 * @property {string[]} [acceptedTypes]
 * @property {string[]} [geometryTypes]
 * @property {string[]} [tags]
 * @property {string[]} [access]
 * @property {string[]} [selectedIds]
 * @property {string} [sort]
 * @property {number} [limit]
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
)
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

/** @param {SourcePickerRequest} [request] */
function normalizeRequest(request = {}) {
  const types = normalizeStringArray(request.acceptedTypes, ALLOWED_TYPES, [
    "vector",
    "join",
  ]);
  const hasSelectedIds = Array.isArray(request.selectedIds);
  return {
    query: String(request.query || "")
      .trim()
      .toLocaleLowerCase()
      .slice(0, 200),
    types: types.length ? types : ["vector", "join"],
    geometryTypes: Array.isArray(request.geometryTypes)
      ? request.geometryTypes.map(String).slice(0, 10)
      : [],
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
    exactSelection: hasSelectedIds,
    sort: ALLOWED_SORTS.has(request.sort) ? request.sort : "relevance",
    limit: Math.min(
      MAX_RESULTS,
      Math.max(1, Number(request.limit) || MAX_RESULTS),
    ),
    language: normalizeLanguage(request.language),
    viewId: isViewId(request.viewId) ? request.viewId : null,
  };
}

function includesFolded(value, query) {
  return String(value || "")
    .toLocaleLowerCase()
    .includes(query);
}

function compareNullableDates(a, b, field) {
  return new Date(b[field] || 0).getTime() - new Date(a[field] || 0).getTime();
}

function makeFacets(rows) {
  const facetFields = {
    tags: "tags",
    geometryTypes: "geometry_types",
    sourceTypes: "type",
    access: "access",
  };
  return Object.fromEntries(
    Object.entries(facetFields).map(([name, field]) => {
      const counts = new Map();
      for (const row of rows) {
        const values = Array.isArray(row[field]) ? row[field] : [row[field]];
        for (const value of values.filter(Boolean)) {
          counts.set(value, (counts.get(value) || 0) + 1);
        }
      }
      return [
        name,
        [...counts.entries()]
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
          .slice(0, 40),
      ];
    }),
  );
}

/**
 * Apply picker search semantics to already-authorized compact rows.
 * Exported separately so filtering and payload bounds can be tested without DB.
 */
/**
 * @param {Array<Record<string, any>>} rows
 * @param {SourcePickerRequest} [rawRequest]
 */
export function filterAndSortSources(rows, rawRequest = {}) {
  const request = normalizeRequest(rawRequest);
  const accessible = rows.filter((row) => request.types.includes(row.type));
  const facets = request.exactSelection ? {} : makeFacets(accessible);
  const selectedIds = new Set(request.selectedIds);
  const filtered = accessible.filter((row) => {
    if (request.exactSelection && !selectedIds.has(row.id)) return false;
    if (
      request.query &&
      ![row.id, row.title, row.editor_email, ...(row.tags || [])].some(
        (value) => includesFolded(value, request.query),
      )
    )
      return false;
    if (
      request.geometryTypes.length &&
      !request.geometryTypes.some((type) => row.geometry_types?.includes(type))
    )
      return false;
    if (
      request.tags.length &&
      !request.tags.every((tag) => row.tags?.includes(tag))
    )
      return false;
    if (request.access.length && !request.access.includes(row.access))
      return false;
    return true;
  });

  const sorters = {
    editor: (a, b) =>
      a.editor_email.localeCompare(b.editor_email) ||
      a.title.localeCompare(b.title),
    uploaded: (a, b) =>
      compareNullableDates(a, b, "date_uploaded") ||
      a.title.localeCompare(b.title),
    modified: (a, b) =>
      compareNullableDates(a, b, "date_modified") ||
      a.title.localeCompare(b.title),
    title: (a, b) => a.title.localeCompare(b.title),
    relevance: (a, b) => {
      if (!request.query) return a.title.localeCompare(b.title);
      const aTitle = includesFolded(a.title, request.query) ? 0 : 1;
      const bTitle = includesFolded(b.title, request.query) ? 0 : 1;
      return aTitle - bTitle || a.title.localeCompare(b.title);
    },
  };
  filtered.sort(
    (a, b) =>
      Number(b.is_current === true) - Number(a.is_current === true) ||
      sorters[request.sort](a, b),
  );
  return {
    items: filtered.slice(0, request.limit),
    total: filtered.length,
    facets,
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
  ]);
  return filterAndSortSources(result.rows, request);
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
