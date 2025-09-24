import {
  getDocumentHostname,
  getQueryParameter,
  isNested,
} from "./url_utils";
import { Worker } from "./sdk/src/index.js";
import { settings } from "./settings";
import {
  MapxResolversApp,
  MapxResolversStatic,
} from "./sdk/src/mapx_resolvers";
import { events } from "./mx";

console.log("INIT SDK");

window.addEventListener("load", () => {
  const nested = isNested();

  const hostnameSdk = getQueryParameter("sdkHostname")[0];
  const hostname = getDocumentHostname();

  settings.integration.hostname = hostnameSdk || hostname;

  events.once({
    type: ["mapx_ready"],
    idGroup: "sdk_binding",
    callback: () => {
      if (!nested) {
        return;
      }

      const isStatic = settings.mode.static;
      const resolvers = isStatic
        ? new MapxResolversStatic()
        : new MapxResolversApp();
      const sdkToken = getQueryParameter("sdkToken")[0];

      window.mxsdkworker = new Worker({
        resolvers: resolvers,
        events: events,
        sdkToken: sdkToken,
      });
    },
  });
});
