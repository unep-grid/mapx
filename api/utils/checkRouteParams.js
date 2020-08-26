const getRule = require('./checkRouteParams_rules.js').getRule;
const u = require('./utils.js');

const settings = {
  required: [],
  expected: []
};

module.exports.getParamsValidator = function(opt) {
  opt = Object.assign({}, settings, opt);
  opt.expected = Array.from(new Set(opt.expected.concat(opt.required)));

  return function(req, res, next) {
    req = req || {};
    try {
      /**
       * Input can be an object, a query or a body if used with body-parser or express-json;
       */
      const body =
        typeof req.body === 'object'
          ? req.body
          : typeof req.query === 'object'
          ? req.query
          : req;

      /**
       * Validate expected param
       */
      Object.keys(body).forEach((k) => {
        if (opt.expected.indexOf(k) === -1) {
          return u.stop(`Invalid parameter found : ${k}`);
        }
      });

      /**
       * Validate each param
       */
      opt.expected.forEach((k) => {
        let isRequired = opt.required.indexOf(k) > -1;
        let rule = getRule(k);
        let value = body[k];
        let missing = !value && isRequired;

        if (missing) {
          return u.stop(`Missing input ${k} : ${body[k]}`);
        }

        if (rule && rule.test) {
          // at least validated empty string (required by validator);
          result = rule.test(value || ''); 
          if (!result.valid && isRequired) {
            return u.stop(`Invalid required input ${k} : ${body[k]}`);
          }
          /**
           * Invalid and not required are handled by the default
           * values set in checkRouteParams_rules
           */
          body[k] = result.value;
        } else {
          body[k] = null;
        }
      });

      if (next) {
        next();
      }
    } catch (e) {
      if (res) {
        res.send({
          type: 'error',
          message: e.message
        });
      }
    }
  };
};
