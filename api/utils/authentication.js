/**
 * Helpers
 */
var pgWrite = require.main.require('./db').pgWrite;
var utils = require('./utils.js');
var toRes = utils.toRes;
/**
 * Exports
 */
exports.validateTokenHandler = validateTokenHandler;
exports.validateRoleHandlerFor = validateRoleHandlerFor;

/**
 * Validate / authenticate user
 */
function validateTokenHandler(req, res, next) {
  var idUser, userToken;
  var hasBody = typeof req.body === 'object';

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

  /**
   * Validate token
   */
  validateToken(userToken)
    .then((tData) => {
      tokenData = tData;
      /**
       * Validate user
       */
      return validateUser(idUser, tokenData.key);
    })
    .then((uData) => {
      userData = uData;
      if (tokenData.isValid && userData.isValid) {
        if (hasBody) {
          req.body.email = userEmail || userData.email;
        } else {
          req.query.email = userEmail || userData.email;
        }
        next();
      } else {
        throw new Error('Token not valid');
      }
    })
    .catch((err) => {
      /**
      * Log error
      */
      console.log(err);
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
    });
}

function validateRoleHandlerFor(role) {
  return function(req, res, next) {
    var idUser, idProject;
    var hasBody = typeof req.body === 'object';
    var roles = {};

    if (hasBody) {
      idUser = req.body.idUser;
      idProject = req.body.idProject || req.body.project;
    } else {
      idUser = req.query.idUser;
      idProject = req.query.idProject || req.query.project;
    }
    getUserRole(idUser, idProject)
      .then((r) => {
        roles = r;
        if (roles[role] !== true) {
          throw new Error('Unautorized role');
        } else {
          next();
        }
      })
      .catch((err) => {
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
                err: err
              }
            }
          })
        );

        res.status('403').end();
      });
  };
}

function getUserRole(idUser, idProject) {
  idUser = idUser * 1 || null;
  var sqlProject = `SELECT admins, publishers, members, public
  FROM mx_projects
  WHERE
  id = $1::text`;

  return pgWrite.query(sqlProject, [idProject]).then((res) => {
    if (res.rows.length === 0) {
      return {
        list : [],
        admin : false,
        publisher: false,
        member : false,
        guest : false
      };
    }
    var pData = res.rows[0];

    var hasAdminRole = pData.admins.indexOf(idUser) > -1;
    var hasPublisherRole = pData.publishers.indexOf(idUser) > -1;
    var hasMemberRole = pData.members.indexOf(idUser) > -1;
    var hasGuestRole = pData.public === true && !hasMemberRole && !hasPublisherRole && !hasAdminRole;

    var roles = [];

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
  });
}

function validateToken(userToken) {
  if (!userToken) {
    return Promise.resolve({isValid: false});
  }
  return utils.db.decrypt(userToken).then((tokenData) => {
    return {
      isGuest: tokenData.is_guest,
      key: tokenData.token,
      isValid: tokenData.valid_until * 1 > new Date().getTime() / 1000
    };
  });
}

function validateUser(idUser, userToken, userEmail) {
  idUser = idUser * 1 || null;
  var isValid;
  var hasEmail;
  var out = {};
  var sqlUser = `
  SELECT id, email
  FROM mx_users
  WHERE 
  id = $1::integer AND 
  key = $2::text`;

  return pgWrite.query(sqlUser, [idUser * 1, userToken]).then((res) => {
    isValid =
      res && res.rows && res.rows.length === 1 && res.rows[0].id === idUser;
    hasEmail = isValid && res.rows[0].email;
    out = {
      idUser: idUser,
      email: isValid
        ? userEmail
          ? userEmail
          : hasEmail
          ? res.rows[0].email
          : ''
        : '',
      isValid: isValid
    };
    return out;
  });
}
