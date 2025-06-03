import { readJSON } from "#mapx/helpers";
import { Validator } from "#mapx/schema";

export const schemaFull = await readJSON("./schemas/combined.json", import.meta.url);
export const schemaMeta = await readJSON("./schemas/combined.json", import.meta.url);

schemaFull.required = [
  ...schemaFull.required,
  "colors",
  "creator",
  "last_editor",
  "date_modified",
];

for (const key of ["colors", "creator", "last_editor", "date_modified"]) {
  delete schemaMeta.properties[key];
}

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
