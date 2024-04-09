import { pgRead } from "#mapx/db";
import { getTableDimension, tableExists } from "#mapx/db_utils";
import { templates } from "#mapx/template";
import { parseTemplate } from "#mapx/helpers";
import { isNotEmpty, isEmpty, isSourceId } from "@fxi/mx_valid";
import { validateTokenHandler, getUserRoles } from "#mapx/authentication";
import { getParamsValidator } from "#mapx/route_validation";
import { getViewsTableBySource } from "#mapx/view";

const validateParamsHandler = getParamsValidator({
  expected: [
    "idUser",
    "idProject",
    "idSources",
    "language",
    "token",
    "types",
    "add_global",
    "add_views",
    "editable",
    "readable",
    "exclude_empty_join",
  ],
});

export const mwGetSourcesList = [
  validateParamsHandler,
  validateTokenHandler,
  sourcesListHandler,
];

async function sourcesListHandler(req, res) {
  try {
    const { query } = req;
    const sourceList = await getSourcesList(query);
    return res.status(200).json(sourceList);
  } catch (error) {
    console.error("Error fetching source list:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function ioSourceList(socket, request, cb) {
  const session = socket.session;

  try {
    if (!session) {
      throw new Error("No session");
    }

    if (!session.user_authenticated || !session.user_roles.publisher) {
      throw new Error("Unautorized");
    }

    const options = {};

    // can't be changed by options
    const auth = {
      idUser: socket.session.user_id,
      idProject: socket.session.project_id,
      groups: socket.session.user_roles.group,
    };

    Object.assign(options, request, auth);

    const list = await getSourcesList(options);
    const response = Object.assign({}, request, { list });

    cb(response);
  } catch (e) {
    cb(false);
    console.error(e);
    await socket.notifyInfoError({
      message: e.message,
    });
  }
}

/**
 * Check if a source have dependencies : views or
 * @param {String} id_source
 * @param {PgClient} client
 *
 */
export async function hasSourceDependencies(id_source, client) {
  const idSources = await getSourceDependencies(id_source, "en", client);
  if (isNotEmpty(idSources)) {
    return true;
  }
  const views = await getViewsTableBySource(id_source, null, client);
  if (isNotEmpty(views)) {
    return true;
  }
  return false;
}

/**
 * Get list of sources id, including join + base source id
 * @param {String} idSource
 * @param {String} idProject
 * @returns {Promise<Array>} Array of sources ids
 */
export async function getSourceIdsIncludingJoin(
  idSource,
  idProject,
  client = pgRead
) {
  if (!isSourceId(idSource)) {
    throw new Error("Missing source id");
  }
  const res = await client.query(templates.getSourcesIdIncludingJoin, [
    idSource,
    idProject,
  ]);

  return res.rows.map((r) => r.id_source);
}

/**
 *  Get source dependencies ( pg views, low level )
 * @param {String} idSource
 * @param {String} language
 * @return {Arary} List of dependencies
 */
export async function getSourceDependencies(
  idSource,
  language = "en",
  client = pgRead
) {
  if (!isSourceId(idSource)) {
    throw new Error("Missing source id");
  }
  const sql = parseTemplate(templates.getSourceDependencies, { language });
  const res = await client.query(sql, [idSource]);
  return res.rows;
}

/**
 *  Get source list
 */
async function getSourcesList(options) {
  const def = {
    idProject: null,
    idUser: null,
    groups: [],
    types: ["tabular", "vector", "raster", "join"],
    language: "en",
    idSources: [],
    editable: false,
    readable: false,
    add_global: false,
    add_views: false,
    exclude_empty_join: false,
  };

  const config = Object.assign({}, def, options);

  if (isEmpty(config.groups)) {
    const roles = await getUserRoles(config.idUser, config.idProject);
    config.groups = roles.group;
  }

  const {
    idProject,
    idUser,
    groups,
    types,
    language,
    idSources,
    editable,
    readable,
    add_views,
    add_global,
    exclude_empty_join,
  } = config;

  if (editable && readable) {
    throw new Error("Editable and readable are exclusive");
  }
  if (add_global && editable) {
    throw new Error("Editable and global are exclusive");
  }
  if (!add_global && !readable && !editable) {
    throw new Error(
      "At least one of Global, Editable or Readable should be true"
    );
  }

  const qSqlTemplate = templates.getSourcesListByRoles;
  const qSql = parseTemplate(qSqlTemplate, { language });


  const res = await pgRead.query({
    text: qSql,
    values: [
      idProject,
      idUser,
      groups,
      types,
      add_global,
      editable,
      readable,
      add_views,
      idSources,
      exclude_empty_join,
    ],
  });

  /**
   * Add table dimensions
   */
  for (const row of res.rows) {
    row.exists = await tableExists(row.id);
    if (row.exists) {
      const dim = await getTableDimension(row.id);
      row.nrow = dim.nrow;
      row.ncol = dim.ncol;
    } else {
      row.nrow = 0;
      row.ncol = 0;
    }
  }

  return res.rows;
}
