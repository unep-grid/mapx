import { getQueryParameter } from "./url_utils";
import { Worker } from "./sdk/src/index.js";
import { settings } from "./settings";
import {
  MapxResolversApp,
  MapxResolversStatic,
} from "./sdk/src/mapx_resolvers";

window.addEventListener("load", () => {
  mx.events.once({
    type: ["mapx_ready"],
    idGroup: "sdk_binding",
    callback: () => {
      if (window.parent === window) {
        /*
         * Not nested
         */
        return;
      }

      const isStatic = settings.mode.static;
      const resolvers = isStatic
        ? new MapxResolversStatic()
        : new MapxResolversApp();
      const sdkToken = getQueryParameter("sdkToken")[0];

      window.mxsdkworker = new Worker({
        resolvers: resolvers,
        events: mx.events,
        sdkToken: sdkToken,
      });
    },
  });
});
