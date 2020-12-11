const {getRule} = require('./rules.js');
const {stop} = require('@mapx/helpers');
const settings = {
  required: [],
  expected: []
};

module.exports = {
  getParamsValidator,
  paramsValidator
};

/**
 * Validate object according to rules
 * @param {Object} obj Object to test
 * @param {Object} opt Options / settings
 * @param {Array} opt.required Key required
 * @param {Array} opt.expected Key expected
 * @returns {Object} out Validation
 * @returns {Array} out.missing Missing params
 * @returns {Array} out.unexpected Unexpected params
 * @returns {Array} out.invalid Invalid params
 */
function paramsValidator(obj, opt) {
  opt = Object.assign({}, settings, opt);
  opt.expected = Array.from(new Set(opt.expected.concat(opt.required)));
  const out = {
    unexpected: [],
    missing: [],
    invalid: [],
    ok: false
  };

  /**
   * Validate expected param
   */
  Object.keys(obj).forEach((k) => {
    if (opt.expected.indexOf(k) === -1) {
      out.unexpected.push(k);
    }
  });

  /**
   * Validate each param
   */
  opt.expected.forEach((k) => {
    let isRequired = opt.required.indexOf(k) > -1;
    let rule = getRule(k);
    let value = obj[k];
    let missing = !value && isRequired;
    let result = {};
    if (missing) {
      out.missing.push(k);
    }

    if (rule && rule.test) {
      // at least validated empty string (required by validator);
      try{
        result = rule.test(value || '');
        if (!result.valid && isRequired) {
          out.invalid.push(k);
        }
      }catch(e){
        out.invalid.push(k);
      }
      /**
       * Invalid and not required are handled by the default
       * values set in checkRouteParams_rules
       */
      obj[k] = result.value;
    } else {
      obj[k] = null;
    }
  });

  out.ok =
    out.missing.length === 0 &&
    out.unexpected.length === 0 &&
    out.invalid.length === 0;

  return out;
}

/**
 * Get a custom validator middleware
 */
function getParamsValidator(opt) {
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

      const result = paramsValidator(body, opt);

      if (result.invalid.length > 1) {
        return stop(
          `Invalid parameters found : ${JSON.stringify(result.invalid)}`
        );
      }
      if (result.missing.length > 1) {
        return stop(`Missing input:  ${JSON.stringify(result.missing)}`);
      }

      if (result.unexpected.length > 1) {
        return stop(`Unexpected input:  ${JSON.stringify(result.unexpected)}`);
      }

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
}
