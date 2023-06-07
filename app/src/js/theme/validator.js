import Ajv from "ajv";
import { default as schema } from "./schema.json";

const ajv = new Ajv();

const validate = ajv.compile(schema);

export { validate };
