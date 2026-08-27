import { getSourceEditors } from "#mapx/source";
import { getSourceEditPermission } from "../permissions.js";

/**
 * Edit permission checks for the table editor.
 */
export async function isUserAllowedToEditSource({
  idTable,
  isAuthenticated,
  idUser,
  rolesGroup = [],
}) {
  if (!isAuthenticated) {
    return false;
  }
  const sourceData = await getSourceEditors(idTable);
  const isEditor = sourceData.editor === idUser;
  const isGroupMember = sourceData.editors.some((group) => {
    return rolesGroup.includes(group);
  });
  return isEditor || isGroupMember;
}

export async function isSocketAllowedToEditSource(socket, idTable) {
  const session = socket.session || {};
  return isUserAllowedToEditSource({
    idTable,
    isAuthenticated: session.user_authenticated || false,
    idUser: session.user_id,
    rolesGroup: session.user_roles?.group || [],
  });
}

/**
 * Resolve geometry-edit permission from current server-side roles and source
 * ACL. The supplied client may be the transaction that will write geometry.
 */
export async function isSocketAllowedToEditGeometry(
  socket,
  idTable,
  client,
) {
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
