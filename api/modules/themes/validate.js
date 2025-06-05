import { clone } from "#mapx/helpers";
import { Validator } from "#mapx/schema";
import { getSchema } from "./schemas/combined.js";

const schemaFull = getSchema("en", true);
const schemaMeta = getSchema("en", false);

export const validatorFull = new Validator(schemaFull);
export const validatorMeta = new Validator(schemaMeta);

export async function validateFull(theme) {
  const errors = await validatorFull.validate(theme);
  return errors || [];
}

export async function validateMeta(theme) {
  theme = clone(theme);
  const keys = schemaMeta.required;
  const tkeys = Object.keys(theme);

  /**
   * Ignore non meta keys
   * -> could be solved by additionalProperties: true, but.. we don't want
   *    additional properties in json editor. MAybe could be solved client side
   */
  for (const key of tkeys) {
    if (!keys.includes(key)) {
      delete theme[key];
    }
  }

  const errors = await validatorMeta.validate(theme);
  return errors || [];
}
