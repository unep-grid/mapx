import { readJSON } from "#mapx/helpers";
import { Validator } from "#mapx/schema";
export const schemaFull = await readJSON("./schemas/full.json", import.meta.url);
export const schemaMeta = await readJSON("./schemas/meta.json", import.meta.url);

export const validatorFull = new Validator(schemaFull);
export const validatorMeta = new Validator(schemaMeta);

export async function validateFull(theme) {
  const errors = await validatorFull.validate(theme);
  return errors || [];
}

export async function validateMeta(theme) {
  const errors = await validatorMeta.validate(theme);
  return errors || [];
}
