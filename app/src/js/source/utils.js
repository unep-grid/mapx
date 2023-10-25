import { ws } from "./../mx.js";
import { getApiRoute } from "../api_routes/index.js";
import { getLanguageCurrent } from "./../language/index.js";

/**
 * Get a list of editable source
 */
export async function wsGetSourcesListEdit(config) {
  const route = getApiRoute("sourceGetListEdit");
  const language = getLanguageCurrent();
  const data = { language };
  Object.assign(data, config);
  return ws.emitAsync(route, data);
}
