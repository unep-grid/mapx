import { ws } from "./../mx.js";
import { getApiRoute } from "../api_routes/index.js";

const defaults = {};


/**
* Get a list of editable source
*/ 
export async function wsGetSourcesListEdit(config) {
  const route = getApiRoute("sourceGetListEdit");
  const request = Object.assign({}, config, defaults);
  return ws.emitGet(route, request);
}
