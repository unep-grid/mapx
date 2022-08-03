import { ws } from "./../mx.js";
import { settings } from "./../settings";
import { getApiRoute } from "../api_routes/index.js";

const defaults = {};

export async function getSourcesListEdit(config) {
  const route = getApiRoute("sourceGetListEdit");
  const request = Object.assign({}, config, defaults);
  return ws.emitGet(route, request);
}
