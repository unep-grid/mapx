import { pgRead } from "#mapx/db";
import { getTableDimension, tableExists } from "#mapx/db_utils";
import { templates } from "#mapx/template";
import { parseTemplate } from "#mapx/helpers";
import { isSourceId } from "@fxi/mx_valid";

export { ioSourceListEdit };

async function ioSourceListEdit(socket, request, cb) {
  const session = socket.session;

  try {
    if (!session) {
      throw new Error("No session");
    }

    if (!session.user_authenticated || !session.user_roles.publisher) {
      throw new Error("Unautorized");
    }

    const options = {
      language: "en",
      types: ["tabular", "vector", "raster", "join"],
    };

    // can't be changed by options
    const auth = {
      idUser: socket.session.user_id,
      idProject: socket.session.project_id,
      groups: socket.session.user_roles.group,
    };

    Object.assign(options, request, auth);

    const list = await getSourcesListEdit(options);
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

async function getSourcesListEdit(options) {
  const { idProject, idUser, groups, types, language } = options;
  const qSqlTemplate = templates.getSourcesListByRoles;
  const qSql = parseTemplate(qSqlTemplate, { language });
  const groupsStr = JSON.stringify(groups);

  const res = await pgRead.query({
    text: qSql,
    values: [idProject, idUser, groupsStr, types],
  });

  /**
   * Add
   * - table dimension
   * - linked views
   *
   */
  for (const row of res.rows) {
    row.exists = await tableExists(row.id);
    if (row.exists) {
      const dim = await getTableDimension(row.id);
      row.nrow = dim.nrow;
      row.ncol = dim.ncol;
    }
  }

  return res.rows;
}
