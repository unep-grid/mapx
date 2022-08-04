import { pgRead } from "#mapx/db";
import { getTableDimension, tableExists } from "#mapx/db-utils";

export { ioSourceListEdit };

async function ioSourceListEdit(socket, request) {
  try {
    if (!socket._mx_user_authenticated || !socket._mx_user_roles.publisher) {
      throw new Error("Unautorized");
    }
    const def = {
      idUser: socket._id_user,
      idProject: socket._id_project,
      groupMax: socket._mx_user_roles.group_max,
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
  const { idProject, idUser, groupMax, input } = options;
  const { language } = input;
  const qSql = `
  SELECT 
  pid,
  id,
  project,
  date_modified,
  coalesce(
  data #>> '{meta,text,title,${language}}',
  data #>> '{meta,text,title,en}',
  '') as title,
  coalesce(
  data #>> '{meta,text,abstract,${language}}',
  data #>> '{meta,text,abstract,en}',
  '') as abstract,
  editor,
  readers,
  editors,
  services
  FROM mx_sources
  WHERE project = $1 
  AND (
    editor = $2
    OR
    editors ? $3 
  ) 
  `;

  const res = await pgRead.query({
    text: qSql,
    values: [idProject, idUser, groupMax],
  });

  /**
   * Validation
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
