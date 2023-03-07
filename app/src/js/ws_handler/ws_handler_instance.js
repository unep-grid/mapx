import { WsHandler } from "./../ws_handler";
import { getLoginInfo } from "./../map_helpers/index.js";
import { getApiUrl } from "./../api_routes";
import { bindAll } from "../bind_class_methods";
import { routes, tests } from "./routes.js";

/**
 * Create a configured instance of WsHandler
 * Defines :
 * - emit type handlers
 * - tests
 * - job request handlers
 */
export class WsHandlerMapx extends WsHandler {
  constructor() {
    super({
      url: getApiUrl,
      auth: getLoginInfo, // evaluated for each connect
      handlers: routes,
      tests: tests,
    });
    bindAll(this);
  }
}
