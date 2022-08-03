import { pgRead } from "#mapx/db";

export { ioSourceListEdit };

async function ioSourceListEdit(socket, request) {
  const def = {
    idUser: socket._id_user,
    idProject: socket._id_project,
    groupMax: socket._mx_user_roles.group_max,
  };
  request = Object.assign({}, def, request);

  try {
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
  const { idProject, idUser, groupMax } = options;
  const qSql = `
  SELECT * 
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

  return res.rows;
}
