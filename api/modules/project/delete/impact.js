import { pgRead } from "#mapx/db";
import { getSourceDependencies } from "#mapx/source";
import { getViewsTableBySource } from "#mapx/view";
import { normalizeLanguage } from "./util.js";

function dedupById(rows) {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    if (seen.has(row.id)) {
      continue;
    }
    seen.add(row.id);
    out.push(row);
  }
  return out;
}

/**
 * Compute what deleting a project removes : the project's own
 * sources / views / themes, plus any cross-project view or
 * join-type source built on top of one of the project's *global*
 * sources ( same cascade the legacy R implementation performed via
 * mxDbGetTableDependencies / mxDbGetViewsTableBySourceId ).
 *
 * Used both by the read-only "analyze" step ( pgRead ) and, re-run
 * against the transaction's own client, at the start of the actual
 * delete session for read-your-own-writes consistency.
 *
 * @param {String} idProject
 * @param {String} [language]
 * @param {Object} [client] PostgreSQL client or pool
 */
export async function getProjectDeleteImpact(
  idProject,
  language,
  client = pgRead,
) {
  const lang = normalizeLanguage(language);

  const [sourcesRes, viewsRes, themesRes] = await Promise.all([
    client.query(
      `SELECT id, type,
         coalesce(NULLIF(data #>> ARRAY['meta','text','title',$2], ''),
                  NULLIF(data #>> '{meta,text,title,en}', ''), id) AS title,
         global
       FROM mx_sources_latest
       WHERE project = $1`,
      [idProject, lang],
    ),
    client.query(
      `SELECT id,
         coalesce(NULLIF(data #>> ARRAY['title',$2], ''),
                  NULLIF(data #>> '{title,en}', ''), id) AS title
       FROM mx_views_latest
       WHERE project = $1`,
      [idProject, lang],
    ),
    client.query(`SELECT id, label FROM mx_themes WHERE id_project = $1`, [
      idProject,
    ]),
  ]);

  const sources = sourcesRes.rows;
  const views = viewsRes.rows;
  const themes = themesRes.rows;

  const globalSourceIds = sources.filter((s) => s.global).map((s) => s.id);

  const dependentSourceRows = [];
  const dependentViewRows = [];
  for (const idSource of globalSourceIds) {
    const [sourceDeps, viewDeps] = await Promise.all([
      getSourceDependencies(idSource, lang, client),
      getViewsTableBySource(idSource, null, client),
    ]);
    dependentSourceRows.push(...sourceDeps);
    dependentViewRows.push(...viewDeps);
  }

  const sourcesDependent = dedupById(
    dependentSourceRows.filter((row) => row.id_project !== idProject),
  );
  const viewsDependent = dedupById(
    dependentViewRows.filter((row) => row.project !== idProject),
  );

  return { sources, views, themes, sourcesDependent, viewsDependent };
}
