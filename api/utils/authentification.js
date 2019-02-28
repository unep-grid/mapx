/**
 * Helpers
 */
var settings = require.main.require('./settings');
var pgWrite = require.main.require('./db').pgWrite;
var utils = require('./utils.js');
var toRes = utils.toRes;
/**
 * Exports
 */
exports.authenticateHandler = authenticate;

/**
 * Validate / authenticate user
 */
function authenticate(req, res, next) {
  var msgTitle = 'MapX authentication: ';
  var idUser, userToken, idProject;
  var hasBody = typeof req.body == 'object';

  if (hasBody) {
    idUser = req.body.idUser;
    idProject = req.body.idProject || req.body.project;
    userToken = req.body.token;
    userEmail = req.body.email;
  } else {
    idUser = req.query.idUser;
    idProject = req.query.idProject || req.query.project;
    userToken = req.query.token;
    userEmail = req.query.email;
  }

  var msg =
    msgTitle +
    ' user ' +
    idUser +
    ' authentification in project ' +
    idProject +
    ' ';

  var tokenData = {isValid: false};
  var userData = {isValid: false};
  var projectData = {isValid: false};

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
      /**
       * Validate project
       */
      return validateProject(idProject, idUser);
    })
    .then((pData) => {
      projectData = pData;

      if (!tokenData.isValid || !projectData.isValid || !userData.isValid) {
        throw new Error('not valid');
      } else {
        userEmail = userData.email;
        if (hasBody) {
          req.body.email = userEmail || userData.email;
        } else {
          req.query.email = userEmail || userData.email;
        }

        /**
         * Next middleware
         */
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
              token: tokenData.isValid,
              project: projectData.isValid,
              user: userData.isValid
            }
          }
        })
      );

      res.status('403').end();
    });
}

function validateToken(userToken) {
  return utils.db.decrypt(userToken).then((tokenData) => {
    return {
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
      res && res.rows && res.rows.length == 1 && res.rows[0].id == idUser;
    hasEmail = isValid && res.rows[0].email;
    out = {
      idUser: idUser,
      email: isValid ? userEmail ? userEmail : hasEmail ? res.rows[0].email : '' : '',
      isValid: isValid
    };
    return out;
  });
}

function validateProject(idProject, idUser) {
  idUser = idUser * 1 || null;
  var out = {};
  var sqlProject = `SELECT id 
  FROM mx_projects
  WHERE
  id = $1::text AND (
    admins @> $2::jsonb OR
    publishers @> $2::jsonb
  )`;

  return pgWrite.query(sqlProject, [idProject, idUser]).then((res) => {
    out = {
      idUser: idUser,
      idProject: idProject,
      isValid: res && res.rows.length == 1 && res.rows[0].id == idProject
    };
    return out;
  });
}
