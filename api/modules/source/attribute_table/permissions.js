import { getSourceEditors } from "#mapx/source";

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
