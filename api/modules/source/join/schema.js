import { readJSON } from "#mapx/helpers";
// Load schema
export const schema = await readJSON("./schema.json", import.meta.url);
