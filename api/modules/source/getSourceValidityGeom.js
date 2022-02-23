import {toRes,toBoolean} from '#mapx/helpers';
import {isLayerValid} from '#mapx/db-utils';
import {validateTokenHandler, validateRoleHandlerFor} from '#mapx/authentication';

/**
 * Upload's middleware
 */
export const mwGetGeomValidate = [
  validateTokenHandler,
  validateRoleHandlerFor('member'),
  validateLayerHandler
];

async function validateLayerHandler(req, res) {
  var idSource = req.query.idSource;
  var useCache = req.query.useCache;
  var autoCorrect = req.query.autoCorrect;
  var analyze = req.query.analyze;

  try {
    res.setHeader('Content-Type', 'application/json');
    useCache = toBoolean(useCache, true);
    autoCorrect = toBoolean(autoCorrect, false);
    analyze = toBoolean(analyze,true);

    res.write(
      toRes({
        type: 'message',
        msg:
          'Check geometry validity for ' +
          idSource +
          '. This could take a while.'
      })
    );

    const validity = await isLayerValid(idSource, useCache, autoCorrect, analyze);

    res.write(
      toRes({
        type: 'result',
        msg: validity
      })
    );

    res.status(200).end();
  } catch (e) {
    var msgError = 'Unable to validate layer. Error : ' + e;
    res.write(
      toRes({
        type: 'error',
        msg: msgError
      })
    );

    res.status('403').end();
  }
}
