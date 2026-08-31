import { isSourceId } from "@fxi/mx_valid";
import { pgRead } from "#mapx/db";
import { getSourceEditPermission } from "../permissions.js";

const EDITABLE_TYPES = new Set(["vector", "tabular", "join"]);
const ACCESS_TARGETS = ["publishers", "admins"];
const PAGE_SIZE_DEFAULT = 25;
const PAGE_SIZE_MAX = 100;

const servicesByType = Object.freeze({
  vector: ["mx_download", "gs_ws_b", "mx_postgis_tiler"],
  tabular: ["mx_download"],
  join: ["mx_download"],
});

export class SourceSettingsError extends Error {
  constructor(message, status = 400, details = null) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function normalizeLanguage(language) {
  return typeof language === "string" && /^[a-z]{2}$/i.test(language)
    ? language.toLowerCase()
    : "en";
}

function pageOptions({ limit, offset } = {}) {
  const parsedLimit = Number(limit);
  const parsedOffset = Number(offset);
  return {
    limit: Number.isInteger(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), PAGE_SIZE_MAX)
      : PAGE_SIZE_DEFAULT,
    offset:
      Number.isInteger(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0,
  };
}

function sourceTitle(source, language) {
  const titles = source?.data?.meta?.text?.title || {};
  return titles[language] || titles.en || source.id;
}

/** Return direct registered source relations depending on a source relation. */
export async function getSourceSettingsDependencies({
  client = pgRead,
  idSource,
  language = "en",
}) {
  const lang = normalizeLanguage(language);
  const { rows } = await client.query(
    `SELECT DISTINCT
       dependent.id,
       dependent.type,
       dependent.project,
       dependent.editor AS id_editor,
       coalesce(NULLIF(dependent.data #>> ARRAY['meta','text','title',$2], ''),
                NULLIF(dependent.data #>> '{meta,text,title,en}', ''),
                dependent.id) AS title,
       coalesce(project.title #>> ARRAY[$2],
                project.title #>> '{en}', project.id) AS title_project,
       coalesce(editor.email, '') AS email_editor
     FROM pg_depend dependency
     JOIN pg_rewrite rewrite ON dependency.objid = rewrite.oid
     JOIN pg_class dependent_relation ON rewrite.ev_class = dependent_relation.oid
     JOIN pg_class source_relation ON dependency.refobjid = source_relation.oid
     JOIN pg_namespace dependent_namespace
       ON dependent_namespace.oid = dependent_relation.relnamespace
     JOIN pg_namespace source_namespace
       ON source_namespace.oid = source_relation.relnamespace
     JOIN mx_sources_latest dependent ON dependent.id = dependent_relation.relname
     JOIN mx_projects project ON project.id = dependent.project
     JOIN mx_users editor ON editor.id = dependent.editor
     WHERE source_namespace.nspname = 'public'
       AND dependent_namespace.nspname = 'public'
       AND source_relation.relname = $1
       AND dependent_relation.relname <> $1
       AND dependent_relation.relkind IN ('v', 'm')
     ORDER BY dependent.id`,
    [idSource, lang],
  );
  return rows;
}

function viewUsageCte() {
  return `WITH affected_sources AS (
      SELECT unnest($1::text[]) AS id
    ), matched AS (
      SELECT v.id, v.project, v.editor, v.data,
        array_remove(ARRAY[
          CASE WHEN v.data #>> '{source,layerInfo,name}' = ANY($1::text[])
            THEN 'layer' END,
          CASE WHEN v.data #>> '{source,layerInfo,maskName}' = ANY($1::text[])
            THEN 'mask' END,
          CASE WHEN v.data #>> '{source,metadataId}' = ANY($1::text[])
            THEN 'external_metadata' END,
          CASE WHEN EXISTS (
            SELECT 1 FROM affected_sources source
            WHERE v.type = 'vt'
              AND coalesce(v.data #>> '{dashboard,widgets}', '')
                  LIKE '%' || source.id || '%'
          ) THEN 'dashboard' END,
          CASE WHEN EXISTS (
            SELECT 1 FROM affected_sources source
            WHERE v.type = 'cc'
              AND coalesce(v.data #>> '{methods}', '')
                  LIKE '%' || source.id || '%'
          ) THEN 'custom_code' END
        ], NULL) AS usage_types
      FROM mx_views_latest v
      WHERE v.data #>> '{source,layerInfo,name}' = ANY($1::text[])
         OR v.data #>> '{source,layerInfo,maskName}' = ANY($1::text[])
         OR v.data #>> '{source,metadataId}' = ANY($1::text[])
         OR EXISTS (
           SELECT 1 FROM affected_sources source
           WHERE v.type = 'vt'
             AND coalesce(v.data #>> '{dashboard,widgets}', '')
                 LIKE '%' || source.id || '%'
         )
         OR EXISTS (
           SELECT 1 FROM affected_sources source
           WHERE v.type = 'cc'
             AND coalesce(v.data #>> '{methods}', '')
                 LIKE '%' || source.id || '%'
         )
    ), used AS (
      SELECT * FROM matched WHERE cardinality(usage_types) > 0
    )`;
}

export async function getSourceSettingsViewSummary({
  client = pgRead,
  idSources,
  idProject,
  idUser,
}) {
  const { rows } = await client.query(
    `${viewUsageCte()}
     SELECT count(*)::integer AS count,
       coalesce(bool_or(project <> $2), false) AS has_other_project,
       coalesce(bool_or(editor <> $3::integer), false) AS has_other_editor
     FROM used`,
    [idSources, idProject, idUser],
  );
  return rows[0];
}

export async function getSourceSettingsViews({
  client = pgRead,
  idSources,
  language = "en",
  limit,
  offset,
}) {
  const lang = normalizeLanguage(language);
  const page = pageOptions({ limit, offset });
  const { rows } = await client.query(
    `${viewUsageCte()}
     SELECT used.id, used.project, used.editor AS id_editor, used.usage_types,
       coalesce(NULLIF(used.data #>> ARRAY['title',$2], ''),
                NULLIF(used.data #>> '{title,en}', ''), used.id) AS title,
       coalesce(project.title #>> ARRAY[$2],
                project.title #>> '{en}', project.id) AS title_project,
       coalesce(editor.email, '') AS email_editor,
       count(*) OVER()::integer AS total
     FROM used
     JOIN mx_projects project ON project.id = used.project
     JOIN mx_users editor ON editor.id = used.editor
     ORDER BY title, used.id
     LIMIT $3 OFFSET $4`,
    [idSources, lang, page.limit, page.offset],
  );
  return {
    rows: rows.map((row) => ({
      id: row.id,
      project: row.project,
      id_editor: row.id_editor,
      usage_types: row.usage_types,
      title: row.title,
      title_project: row.title_project,
      email_editor: row.email_editor,
    })),
    total: rows[0]?.total || 0,
    ...page,
  };
}

async function resolveContext({ client, idSource, idUser, idProject }) {
  if (!isSourceId(idSource)) {
    throw new SourceSettingsError("Invalid source id");
  }
  const permission = await getSourceEditPermission({
    client,
    idSource,
    idUser,
    idProject,
  });
  if (!permission.source) {
    throw new SourceSettingsError("Source not found in current project", 404);
  }
  if (!permission.allowed || !EDITABLE_TYPES.has(permission.source.type)) {
    throw new SourceSettingsError("Source settings access denied", 403);
  }
  return permission;
}

/** Build the authoritative dependency/policy snapshot for one source. */
export async function getSourceSettingsImpact({
  client = pgRead,
  idSource,
  idUser,
  idProject,
  language = "en",
}) {
  const lang = normalizeLanguage(language);
  const dependencies = await getSourceSettingsDependencies({
    client,
    idSource,
    language: lang,
  });
  const idSources = [idSource, ...dependencies.map((row) => row.id)];
  const views = await getSourceSettingsViewSummary({
    client,
    idSources,
    idProject,
    idUser,
  });
  const dependencyOtherProject = dependencies.some(
    (row) => row.project !== idProject,
  );
  const dependencyOtherEditor = dependencies.some(
    (row) => Number(row.id_editor) !== Number(idUser),
  );
  const hasDependencies = dependencies.length > 0 || views.count > 0;
  return {
    dependencies,
    idSources,
    usage: {
      sources: dependencies.length,
      views: views.count,
      hasDependencies,
      hasOtherProject: dependencyOtherProject || views.has_other_project,
      hasOtherEditor: dependencyOtherEditor || views.has_other_editor,
    },
  };
}

/** Build the authorized source settings and dependency context. */
export async function getSourceSettingsContext(options) {
  const client = options.client || pgRead;
  const { source, roles } = await resolveContext({ ...options, client });
  const impact = await getSourceSettingsImpact({
    ...options,
    client,
    idProject: options.idProject || source.project,
  });
  return { source, roles, ...impact };
}

export async function getSourceSettingsOverview(options) {
  const language = normalizeLanguage(options.language);
  const context = await getSourceSettingsContext({ ...options, language });
  const { source, roles, usage } = context;
  return {
    ok: true,
    source: {
      id: source.id,
      type: source.type,
      title: sourceTitle(source, language),
      editorEmail: source.editor_email || "",
      readers: Array.isArray(source.readers) ? source.readers : [],
      editors: Array.isArray(source.editors) ? source.editors : [],
      services: Array.isArray(source.services) ? source.services : [],
      global: source.global === true,
    },
    choices: {
      readers: ACCESS_TARGETS,
      editors: ACCESS_TARGETS,
      services: servicesByType[source.type] || [],
    },
    permissions: { canSetGlobal: roles.root === true },
    usage,
    constraints: {
      forceGlobal: usage.hasOtherProject,
      blockDelete: usage.hasDependencies,
      protectPublisherReaders: !source.global && usage.hasOtherEditor,
    },
  };
}

export async function getSourceSettingsUsage(options) {
  const context = await getSourceSettingsContext(options);
  const page = pageOptions(options);
  if (options.category === "sources") {
    return {
      ok: true,
      category: "sources",
      rows: context.dependencies.slice(page.offset, page.offset + page.limit),
      total: context.dependencies.length,
      ...page,
    };
  }
  if (options.category === "views") {
    return {
      ok: true,
      category: "views",
      ...(await getSourceSettingsViews({
        client: options.client || pgRead,
        idSources: context.idSources,
        language: options.language,
        ...page,
      })),
    };
  }
  throw new SourceSettingsError("Invalid source usage category");
}

function socketOptions(socket, request = {}) {
  const session = socket.session || {};
  if (!session.user_authenticated) {
    throw new SourceSettingsError("Unauthorized", 403);
  }
  return {
    ...request,
    idUser: session.user_id,
    idProject: session.project_id,
  };
}

async function ioReply(socket, callback, task) {
  try {
    callback(await task());
  } catch (error) {
    console.error("Source settings request failed", error);
    await socket.notifyInfoError({ message: error.message });
    callback({ ok: false, error: error.message, status: error.status || 500 });
  }
}

export function ioSourceSettingsGet(socket, request, callback) {
  return ioReply(socket, callback, () =>
    getSourceSettingsOverview(socketOptions(socket, request)),
  );
}

export function ioSourceSettingsUsage(socket, request, callback) {
  return ioReply(socket, callback, () =>
    getSourceSettingsUsage(socketOptions(socket, request)),
  );
}

export const sourceSettingsAllowedValues = Object.freeze({
  readers: ACCESS_TARGETS,
  editors: ACCESS_TARGETS,
  servicesByType,
});
