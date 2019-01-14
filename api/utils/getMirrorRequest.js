const request = require('request');
const authenticateHandler = require('./authentification.js')
  .authenticateHandler;
/**
 * Request handler / middleware
 */

module.exports.get = [authenticateHandler, mirrorHandler];

function mirrorHandler(req, res) {
  var query = req.query;

  var options = {
    url: query.url,
    method: 'GET',
    headers: JSON.parse(query.headers || null),
    qs: JSON.parse(query.query || null),
  };

  return new Promise((resolve, reject) => {
    request(options, function(error, response, body) {
      if(error) throw new Error(error);
      resolve(body);
    });
  })
    .then( body => {
      return res.send(body);
    })
    .catch(e => {
      return res.send({
        type: 'error',
        msg: e
      });
    });
}
