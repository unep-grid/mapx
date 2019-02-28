const utils = require('./utils.js');
const toRes = utils.toRes;
const isLayerValid = require('./db.js').isLayerValid;
const authenticateHandler = require("./authentification.js").authenticateHandler;

/**
 * Upload's middleware
 */
module.exports.get = [
  authenticateHandler,
  validateHandler
];

function validateHandler(req, res, next) {
  var idSource = req.query.idSource;
  var useCache = req.query.useCache;
  var autoCorrect = req.query.autoCorrect;

  res.setHeader('Content-Type', 'application/json');
  useCache = utils.toBoolean(useCache,true);
  autoCorrect = utils.toBoolean(autoCorrect,false);

  res.write(
    toRes({
      type: 'message',
      msg:
        'Check geometry validity for ' + idSource + '. This could take a while.'
    })
  );

  isLayerValid(idSource, useCache, autoCorrect)
    .then((validity) => {
      res.write(
        toRes({
          type: 'result',
          msg: validity
        })
      );

      res.status(200).end();
    })
    .catch(function(err) {
      var msgError = 'Unable to validate layer. Error : ' + err;
      res.write(
        toRes({
          type: 'error',
          msg: msgError
        })
      );

      res.status('403').end();
    });
}
