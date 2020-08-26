const request = require('request');
/**
 * Request handler / middleware
 */

module.exports.get = [mirrorHandler];

function mirrorHandler(req, res) {
  const query = req.query;

  const options = {
    url: query.url,
    method: 'GET',
    headers: JSON.parse(query.headers || null),
    qs: JSON.parse(query.query || null)
  };

  try {
    request(options, (error, response, body) => {
      if (error) {
        throw new Error(error);
      }
      Object.keys(response.headers).forEach((k) =>
        res.setHeader(k, response.headers[k])
      );
      return res.send(body);
    });
  } catch (e) {
    return res.send({
      type: 'error',
      msg: e
    });
  }
}
