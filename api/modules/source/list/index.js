import { pgRead } from "#mapx/db";
import { getTableDimension, tableExists } from "#mapx/db-utils";
import { templates } from "#mapx/template";
import { parseTemplate } from "#mapx/helpers";

export { ioSourceListEdit };

async function ioSourceListEdit(socket, request) {
  const session = socket.session;

  try {
    if (!session) {
      throw new Error("No session");
    }

    if (!session.user_authenticated || !session.user_roles.publisher) {
      throw new Error("Unautorized");
    }

    const options = {
      types: ["tabular", "vector", "raster"],
    };

    // can't be changed by options
    const auth = {
      idUser: socket.session.user_id,
      idProject: socket.session.project_id,
      groups: socket.session.user_roles.group,
    };

    Object.assign(options, request.input, auth);

    const list = await getSourcesListEdit(options);
    const response = request;
    response.list = list;
    socket.emit("response", response);
  } catch (e) {
    console.error(e);
    await socket.notifyInfoError({
      message: e.message,
    });
  }
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