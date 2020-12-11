const {pgWrite} = require('@mapx/db');
const helpers = require('@mapx/helpers');
const template = require('@mapx/template');
const {decrypt} = require('@mapx/db-utils');
const toRes = helpers.toRes;

/**
 * Exports
 */
module.exports = {
  validateTokenHandler,
  validateRoleHandlerFor,
  validateToken,
  validateUser
};

/**
 * Validate / authenticate user
 */
async function validateTokenHandler(req, res, next) {
  let idUser, userToken;
  const hasBody = typeof req.body === 'object';

  if (hasBody) {
    idUser = req.body.idUser;
    userToken = req.body.token;
    userEmail = req.body.email;
  } else {
    idUser = req.query.idUser;
    userToken = req.query.token;
    userEmail = req.query.email;
  }

  var tokenData = {isValid: false};
  var userData = {isValid: false};

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
      if (hasBody) {
        req.body.email = userData.email;
      } else {
        req.query.email = userData.email;
      }
      next();
    } else {
      throw new Error('Token not valid');
    }
  } catch (e) {
    /**
     * Log error
     */
    console.log(e);
    /**
     * Failed, stop here
     */
    res.write(
      toRes({
        type: 'error',
        msg: {
          reason: 'authentication failed',
          status: {
            token_is_valid: tokenData.isValid,
            user_is_valid: userData.isValid
          }
        }
      })
    );

    res.status('403').end();
  }
}

function validateRoleHandlerFor(role) {
  return async function(req, res, next) {
    let roles, idUser, idProject;
    const hasBody = typeof req.body === 'object';

    try {
      if (hasBody) {
        idUser = req.body.idUser;
        idProject = req.body.idProject || req.body.project;
      } else {
        idUser = req.query.idUser;
        idProject = req.query.idProject || req.query.project;
      }

      roles = await getUserRole(idUser, idProject);

      if (roles[role] !== true) {
        throw new Error('Unautorized role');
      } else {
        next();
      }
    } catch (e) {
      /**
       * Failed, stop here
       */
      res.write(
        toRes({
          type: 'error',
          msg: {
            reason: 'authentication failed',
            status: {
              roleRequested: role,
              roles: roles.list,
              idProject: idProject,
              idUser: idUser,
              err: e
            }
          }
        })
      );
      res.status('403').end();
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
  const sqlProject = template.getUserRoles;
  const res = await pgWrite.query(sqlProject, [idProject]);

  if (res.rowCount === 0) {
    return {
      list: [],
      admin: false,
      publisher: false,
      member: false,
      guest: false
    };
  }

  /**
   * Eval roles
   */
  const pData = res.rows[0];

  const hasAdminRole = pData.admins.indexOf(idUser) > -1;
  const hasPublisherRole = pData.publishers.indexOf(idUser) > -1;
  const hasMemberRole = pData.members.indexOf(idUser) > -1;
  const hasGuestRole =
    pData.public === true &&
    !hasMemberRole &&
    !hasPublisherRole &&
    !hasAdminRole;
  const roles = [];

  if (hasAdminRole) {
    roles.push('admin');
  }
  if (hasPublisherRole) {
    roles.push('publisher');
  }
  if (hasMemberRole) {
    roles.push('member');
  }
  if (hasGuestRole) {
    roles.push('guest');
  }

  return {
    list: roles,
    admin: hasAdminRole,
    publisher: hasAdminRole || hasPublisherRole,
    member: hasAdminRole || hasPublisherRole || hasMemberRole,
    guest: hasGuestRole
  };
}

/**
 * Validate token
 * @param {Object} userToken Token object
 * @returns {Object} valid result
 * @returns {Boolean} valid.isGuest Is guest user
 * @returns {String}  valid.key User key
 * @returns {Boolean} valid.isValid Is valid
 */
async function validateToken(userToken) {
  const now = new Date().getTime() / 1000;
  if (!userToken) {
    return {isValid: false};
  }
  const tokenData = await decrypt(userToken);
  return {
    isGuest: tokenData.is_guest,
    key: tokenData.key,
    isValid: tokenData.valid_until * 1 > now / 1000
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
async function validateUser(idUser, keyUser) {
  idUser = idUser * 1 || null;
  var sqlUser = template.getCheckUserIdKey;
  const res = await pgWrite.query(sqlUser, [idUser * 1, keyUser]);
  const isValid = res.rowCount === 1 && res.rows[0].id === idUser;
  const email = isValid ? res.rows[0].email : null;
  return {
    idUser: idUser,
    email: email,
    isValid: isValid
  };
}

