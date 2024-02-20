import { Validator } from "#mapx/schema";
import { getSchema } from "./schema.js";

const schema = getSchema();
export const validator = new Validator(schema);
