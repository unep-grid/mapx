import { Sql } from "sql-ts";
const sql = new Sql("postgres");

import { pgRead } from "#mapx/db";
import { project } from "#mapx/db_models";
import { validateTokenHandler } from "#mapx/authentication";
import { getParamsValidator } from "#mapx/route_validation";
import { mwProjectSearchText } from "./search.js";

const validateParamsHandler = getParamsValidator({
  expected: [
    "language",
    "role",
    "title",
    "titlePrefix",
    "titleFuzzy",
    "token",
    "idUser",
  ],
});

const mwGetListByUser = [
  validateParamsHandler,
  validateTokenHandler,
  getProjectsByUserRouteHandler,
];

export default { mwProjectSearchText, mwGetListByUser };

async function getProjectsByUserRouteHandler(req, res) {
  var idUser = req.query.idUser;
  var rq = {
    language: "en",
    role: "any",
    title: null,
    titlePrefix: null,
    titleFuzzy: null,
    ...req.query,
  };

  try {
    const result = await getProjectsByUserHelper(
      idUser,
      rq.language,
      rq.role,
      rq.title,
      rq.titlePrefix,
      rq.titleFuzzy
    );

    /**
     * As it's not done in sql, set title default if empty
     */
    for (const r of result.rows) {
      if (!r.title) {
        r.title = r.title_en;
      }
    }

    res.json(result.rows);
  } catch (e) {
    console.log(e);
    res.status(500);
    res.send("Data query error!");
  }
}

async function getProjectsByUserHelper(
  idUser,
  lc = "en",
  role = "any",
  title = null,
  titlePrefix = null,
  titleFuzzy = null
) {
  if (title && title.indexOf("*") > -1) {
    const starPos = title.indexOf("*");
    titlePrefix = title.substring(0, starPos);
    title = null;
  }

  const hasRole = ["member", "publisher", "admin"].includes(role);
  const roleCondition = hasRole
    ? role
    : `public OR member OR publisher OR admin`;

  const pSql = project
    .select(`id`)
    .select(`title ->> '${lc}' as title`)
    .select(`description ->> '${lc}' as description`)
    .select(`title ->> 'en' as title_en`)
    .select(`description ->> 'en' as description_en`)
    .select(`public`)
    .select(`allow_join`)
    .select(
      `members @> '[${idUser}]' OR publishers @> '[${idUser}]' OR admins @> '[${idUser}]' AS member`
    )
    .select(
      `publishers @> '[${idUser}]' OR admins @> '[${idUser}]' AS publisher`
    )
    .select(`admins @> '[${idUser}]' AS admin`);

  if (title) {
    pSql.where(
      project.title
        .keyText("en")
        .equals(title)
        .or(project.title.keyText(lc).equals(title))
    );
  }

  if (titlePrefix) {
    pSql.where(
      project.title
        .keyText("en")
        .ilike(`${titlePrefix}%`)
        .or(project.title.keyText(lc).ilike(`${titlePrefix}%`))
    );
  }

  if (titleFuzzy) {
    pSql.where(
      sql
        .function("SIMILARITY")(project.title.keyText("en"), titleFuzzy)
        .gt(0)
        .or(
          sql
            .function("SIMILARITY")(project.title.keyText(lc), titleFuzzy)
            .gt(0)
        )
    );
  }
  const sqlStr = `
    WITH project_role AS (${pSql.toString()})
    SELECT * FROM project_role WHERE ${roleCondition}
    `;
  const rows = await pgRead.query(sqlStr);
  return rows;
}

/**
 * Get a list of all projects
 *
 */
export async function getProjectsIdAll() {
  const req = project.select("id").from(project).toQuery();
  const res = await pgRead.query(req);
  const ids = res.rows.map((r) => r.id);
  return ids;
}
