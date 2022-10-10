import { pgRead } from "#mapx/db";
import { getTableDimension, tableExists } from "#mapx/db-utils";
import { templates } from "#mapx/template";
import { parseTemplate } from "#mapx/helpers";

export { ioSourceListEdit };

async function ioSourceListEdit(socket, request) {
  try {
    if (!socket._mx_user_authenticated || !socket._mx_user_roles.publisher) {
      throw new Error("Unautorized");
    }

    const def = {
      idUser: socket._id_user,
      idProject: socket._id_project,
      groups: socket._mx_user_roles.group,
    };
    request = Object.assign({}, def, request);
    const list = await getSourcesListEdit(request);
    const response = request;
    response.list = list;
    socket.emit("response", response);
  } catch (e) {
    await socket.notifyInfoError({
      message: e.message,
    });
  }
}

async function getSourcesListEdit(options) {
  const { idProject, idUser, groups, input } = options;
  const { language } = input;
  const qSqlTemplate = templates.getSourcesListByRoles;
  const qSql = parseTemplate(qSqlTemplate, { language });

  const res = await pgRead.query({
    text: qSql,
    values: [idProject, idUser, JSON.stringify(groups)],
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
