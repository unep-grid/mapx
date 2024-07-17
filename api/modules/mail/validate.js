import { paramsValidator } from "#mapx/route_validation";
/**
 * Use existing parameters to validate email config
 * @param {Object} config Mail config
 * @param {Array} required Additional required param names
 * @returns {Object} Validation result, .e.g validation.ok => true
 */
export function mailValidate(config, required = []) {
  return paramsValidator(config, {
    expected: [
      "from",
      "to",
      "subject",
      "title",
      "subtitle",
      "content",
      "validUntil",
      "subjectPrefix",
      "encrypt",
    ],
    required: ["from", "to", "subject", "content", ...required],
  });
}
