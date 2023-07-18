import { getRule } from "./rules.js";
import { stop } from "#mapx/helpers";
const settings = {
  required: [],
  expected: [],
};

export { getParamsValidator, paramsValidator };

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
  opt = {
    ...settings,
    ...opt,
  };
  opt.expected = Array.from(new Set(opt.expected.concat(opt.required)));
  const out = {
    unexpected: [],
    missing: [],
    invalid: [],
    ok: false,
  };

  /**
   * Validate expected param
   */
  for (const k of Object.keys(obj)) {
    if (!opt.expected.includes(k)) {
      out.unexpected.push(k);
    }
  }

  /**
   * Validate each param
   */
  for (const k of opt.expected) {
    let isRequired = opt.required.indexOf(k) > -1;
    let rule = getRule(k);
    let value = obj[k];
    let missing = !value && isRequired;
    let result = {};
    if (missing) {
      out.missing.push(k);
    }

    if (rule?.test) {
      // at least validated empty string (required by validator);
      try {
        result = rule.test(value || "", k);
        if (!result.valid && isRequired) {
          out.invalid.push(k);
        }
      } catch {
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
  }

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
  return (req, res, next) => {
    req = req || {};
    try {
      /**
       * Input can be an object, a query or a body if used with body-parser or express-json;
       */
      const body =
        typeof req.body === "object"
          ? req.body
          : typeof req.query === "object"
          ? req.query
          : req;

      const result = paramsValidator(body, opt);

      if (result.missing.length > 0) {
        return stop(`Missing parameter:  ${JSON.stringify(result.missing)}`);
      }

      if (result.unexpected.length > 0) {
        return stop(
          `Unexpected parameter:  ${JSON.stringify(result.unexpected)}`
        );
      }

      if (result.invalid.length > 0) {
        return stop(`Invalid parameter: ${JSON.stringify(result.invalid)}`);
      }

      if (next) {
        next();
      }
    } catch (e) {
      if (res) {
        res.send({
          type: "error",
          message: e.message,
        });
      }
      next(e);
    }
  };
}
