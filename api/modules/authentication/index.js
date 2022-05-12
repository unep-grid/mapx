import { pgWrite } from "#mapx/db";
import { sendError } from "#mapx/helpers";
import { templates } from "#mapx/template";
import { decrypt } from "#mapx/db-utils";
import { isEmail } from "@fxi/mx_valid";
import { settings } from "#root/settings";

/**
 * Validate / authenticate user
 */
export async function validateTokenHandler(req, res, next) {
  let idUser;
  let userToken;
  const hasBody = typeof req.body === "object";

  if (hasBody) {
    idUser = req.body.idUser;
    userToken = req.body.token;
  } else {
    idUser = req.query.idUser;
    userToken = req.query.token;
  }

  const tokenData = { isValid: false };
  const userData = { isValid: false };

  try {
    /**
     * Validate token
     */
    const tokenData = await validateToken(userToken);
    /**
     * Validate user
     */
    const userData = await validateUser(idUser, tokenData.key);

    /**
     * Handle validation
     */
    if (tokenData.isValid && userData.isValid) {
      /**
       * Some methods require email that does not match
       * userData.email. e.g. download source for unlogged session
       */
      if (hasBody) {
        if (!isEmail(req.body.email)) {
          req.body.email = userData.email;
        }
      } else {
        if (!isEmail(req.query.email)) {
          req.query.email = userData.email;
        }
      }
      next();
    } else {
      throw Error("Token not valid");
    }
  } catch (e) {
    /**
     * Log error
     */
    console.log(e);
    /**
     * Failed, stop here
     */

    sendError(
      res,
      {
        reason: "authentication failed",
        status: {
          token_is_valid: tokenData.isValid,
          user_is_valid: userData.isValid,
        },
      },
      403
    );
  }
}

export function validateRoleSuperUserHandler(req, res, next) {
  let idUser;
  const hasBody = typeof req.body === "object";

  try {
    if (hasBody) {
      idUser = req.body.idUser;
    } else {
      idUser = req.query.idUser;
    }

    if (!isRootUser(idUser)) {
      throw new Error("Require root privileges");
    }

    next();
  } catch (e) {
    sendError(res, "Validate root failed", 403);
  }
}

export function validateRoleHandlerFor(role) {
  return async function (req, res, next) {
    let roles;
    let idUser;
    let idProject;
    const hasBody = typeof req.body === "object";

    try {
      if (hasBody) {
        idUser = req.body.idUser;
        idProject = req.body.idProject || req.body.project;
      } else {
        idUser = req.query.idUser;
        idProject = req.query.idProject || req.query.project;
      }

      roles = await getUserRole(idUser, idProject);

      if (!roles[role]) {
        throw Error("Unautorized role");
      }

      next();
    } catch (e) {
      sendError(
        res,
        {
          reason: "authentication failed",
          status: {
            roleRequested: role,
            roles: roles.list,
            idProject: idProject,
            idUser: idUser,
            err: e,
          },
        },
        403
      );

      res.status("403").end();
    }
  };
}

/**
 * Get user roles
 * @param {Numeric} idUser User id
 * @param {Character} idProject Project id
 * @return {Object} list with keys like {list:roles,admin:boolean,...}
 */
async function getUserRole(idUser, idProject) {
  idUser = idUser * 1 || null;
  const sqlProject = templates.getUserRoles;
  const res = await pgWrite.query(sqlProject, [idProject]);

  const roles = {
    list: [],
    admin: false,
    publisher: false,
    member: false,
    guest: false,
  };

  if (res.rowCount === 0) {
    return roles;
  }

  /**
   * Eval roles
   */
  const [pData] = res.rows;

  const hasAdminRole = pData.admins.includes(idUser);
  const hasPublisherRole = pData.publishers.includes(idUser);
  const hasMemberRole = pData.members.includes(idUser);
  const hasGuestRole =
    pData.public && !hasMemberRole && !hasPublisherRole && !hasAdminRole;

  if (hasAdminRole) {
    roles.list.push("admin");
  }
  if (hasPublisherRole) {
    roles.list.push("publisher");
  }
  if (hasMemberRole) {
    roles.list.push("member");
  }
  if (hasGuestRole) {
    roles.list.push("guest");
  }

  roles.admin = hasAdminRole;
  roles.publisher = hasAdminRole || hasPublisherRole;
  roles.member = hasAdminRole || hasPublisherRole || hasMemberRole;
  roles.guest = hasGuestRole;

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
