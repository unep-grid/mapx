import { pgRead } from "#mapx/db";
import { getSourceEditPermission } from "../permissions.js";

/**
 * Edit permission checks for the table editor.
 */
export async function isUserAllowedToEditSource({
  idTable,
  isAuthenticated,
  idUser,
  idProject,
  client = pgRead,
}) {
  if (!isAuthenticated || !idProject) {
    return false;
  }
  const permission = await getSourceEditPermission({
    client,
    idSource: idTable,
    idUser,
    idProject,
  });
  return permission.allowed === true;
}

export async function isSocketAllowedToEditSource(socket, idTable) {
  const session = socket.session || {};
  if (!session.user_authenticated || !session.project_id) {
    return false;
  }
  const permission = await getSourceEditPermission({
    client: pgRead,
    idSource: idTable,
    idUser: session.user_id,
    idProject: session.project_id,
  });
  const roles = permission.roles || {};
  if (Object.keys(roles).length > 0) {
    session.user_roles = roles;
    if (socket.data) {
      socket.data.user_roles = roles;
    }
  }
  return permission.allowed === true;
}

/**
 * Resolve geometry-edit permission from current server-side roles and source
 * ACL. The supplied client may be the transaction that will write geometry.
 */
export async function isSocketAllowedToEditGeometry(socket, idTable, client) {
  const session = socket.session || {};
  if (!session.user_authenticated) {
    return false;
  }
  const permission = await getSourceEditPermission({
    client,
    idSource: idTable,
    idUser: session.user_id,
    idProject: session.project_id,
  });
  const roles = permission.roles || {};
  if (Object.keys(roles).length > 0) {
    session.user_roles = roles;
    if (socket.data) {
      socket.data.user_roles = roles;
    }
  }
  return permission.allowed === true && roles.developer === true;
}
