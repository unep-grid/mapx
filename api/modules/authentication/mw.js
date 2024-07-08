import { sendError } from "#mapx/helpers";
import { isEmail, isEmpty } from "@fxi/mx_valid";
import {
  validateToken,
  validateUser,
  isUserRoot,
  getUserRoles,
} from "./helpers.js";
/**
 * Validate / authenticate user
 */
export async function validateTokenHandler(req, res, next) {
  let tokenData = { isValid: false };
  let userData = { isValid: false };
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

  try {
    /**
     * Validate token
     */
    tokenData = await validateToken(userToken);
    /**
     * Validate user
     */
    userData = await validateUser(idUser, tokenData.key);

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
    next(e);
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

    if (!isUserRoot(idUser)) {
      throw new Error("Require root privileges");
    }

    next();
  } catch (e) {
    sendError(res, "Validate root failed", 403);
    next(e);
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

      roles = await getUserRoles(idUser, idProject);

      if (isEmpty(roles) || isEmpty(!roles[role])) {
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
            roles: roles?.list,
            idProject: idProject,
            idUser: idUser,
            err: e,
          },
        },
        403
      );
      next(e);
    }
  };
}
