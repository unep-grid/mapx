import { pgRead } from "#mapx/db";
import { getTableDimension, tableExists } from "#mapx/db_utils";
import { templates } from "#mapx/template";
import { parseTemplate } from "#mapx/helpers";
import { isEmpty, isSourceId } from "@fxi/mx_valid";
import { validateTokenHandler, getUserRoles } from "#mapx/authentication";
import { getParamsValidator } from "#mapx/route_validation";

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
 * Get list of sources id, including join + base source id
 * @param {String} idSource
 * @param {String} idProject
 * @returns {Promise<Array>} Array of sources ids
 */
export async function getSourceIdsIncludingJoin(idSource, idProject) {
  if (!isSourceId(idSource)) {
    throw new Error("Missing source id");
  }
  const res = await pgRead.query(templates.getSourcesIdIncludingJoin, [
    idSource,
    idProject,
  ]);

  return res.rows.map((r) => r.id_source);
}

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
