import { pgWrite } from "#mapx/db";
import { templates } from "#mapx/template";
import { decrypt } from "#mapx/db-utils";
import { settings } from "#root/settings";

/**
 * Get user roles
 * ⚠️  ONLY FOR AUTHENTICATED USERS ⚠️
 * @param {Numeric} idUser User id
 * @param {Character} idProject Project id
 * @return {Object} list with keys like {list:roles,admin:boolean,...}
 */
export async function getUserRoles(idUser, idProject) {
  idUser = idUser * 1 || null;
  const sqlProject = templates.getUserRoles;
  const res = await pgWrite.query(sqlProject, [idProject]);

  const roles = {
    list: [],
    admin: false,
    publisher: false,
    member: false,
    guest: false,
    root: false,
  };

  /**
   * Eval roles
   */
  const pData = res.rows[0] || {
    public: false,
    admins: [],
    publishers: [],
    members: [],
  };

  /**
   * All non-member of a public project are guests.
   * All root are admin, publisher, member
   * All admin are publisher, member
   * All publisher are member
   */
  roles.root = isRootUser(idUser);
  roles.admin = roles.root || pData.admins.includes(idUser);
  roles.publisher = roles.admin || pData.publishers.includes(idUser);
  roles.member = roles.publisher || pData.members.includes(idUser);
  roles.guest = !roles.member && pData.public;

  if (roles.root) {
    roles.list.push("root");
  }
  if (roles.admin) {
    roles.list.push("admin");
  }
  if (roles.publisher) {
    roles.list.push("publisher");
  }
  if (roles.member) {
    roles.list.push("member");
  }
  if (roles.guest) {
    roles.list.push("guest");
  }

  return roles;
}

/**
 * Is the user in group "root" ? Assumes token validation beforehand.
 * @param {Number} idUser
 * @return {Boolean} User is in root group
 */
export function isRootUser(idUser) {
  return settings.mapx.users.root.includes(idUser);
}

/**
 * Validate token
 * @param {Object} userToken Token object
 * @returns {Object} valid result
 * @returns {Boolean} valid.isGuest Is guest user
 * @returns {String}  valid.key User key
 * @returns {Boolean} valid.isValid Is valid
 */
export async function validateToken(userToken) {
  const now = new Date().getTime() / 1000;
  if (!userToken) {
    return { isValid: false };
  }
  const tokenData = await decrypt(userToken);
  return {
    isGuest: tokenData.is_guest,
    key: tokenData.key,
    isValid: tokenData.valid_until * 1 > now / 1000,
  };
}

/**
 * Validate user
 * @param {Numeric} idUser User id
 * @param {String} keyUser User key
 * @returns {Object} valid result
 * @returns {Numeric} valid.idUser User id
 * @returns {String}  valid.email User email
 * @returns {Boolean} valid.isValid Is valid
 */
export async function validateUser(idUser, keyUser) {
  idUser = idUser * 1 || null;
  var sqlUser = templates.getCheckUserIdKey;
  const res = await pgWrite.query(sqlUser, [idUser * 1, keyUser]);
  const isValid = res.rowCount === 1 && res.rows[0].id === idUser;
  const email = isValid ? res.rows[0].email : null;
  return {
    idUser: idUser,
    email: email,
    isValid: isValid,
  };
}