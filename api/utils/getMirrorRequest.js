const request = require('request');
const auth = require('./authentication.js');
/**
 * Request handler / middleware
 */

module.exports.get = [auth.validateTokenHandler, mirrorHandler];

function mirrorHandler(req, res) {
  var query = req.query;

  var options = {
    url: query.url,
    method: 'GET',
    headers: JSON.parse(query.headers || null),
    qs: JSON.parse(query.query || null)
  };

  return new Promise((resolve) => {
    request(options, function(error, response, body) {
      if (error) {
        throw new Error(error);
      }
      resolve(body);
    });
  })
    .then((body) => {
      return res.send(body);
    })
    .catch((e) => {
      return res.send({
        type: 'error',
        msg: e
      });
    });
}
