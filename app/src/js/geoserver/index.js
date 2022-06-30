import { getApiRoute } from "./../api_routes/index.js";
import { nc, ws } from "./../mx.js";
import { settings } from "./../settings";

export const geoserver = {
  /*
   * `opt` is defined in shiny binding:
   *  - bind("mxGeoserverRebuild", geoserver.rebuild);
   */
  rebuild: (opt) => {
    const route = getApiRoute("updateGeoserver");
    opt = Object.assign(
      {},
      {
        recalcStyle: false,
      },
      opt
    );

    const config = {
      idUser: settings.user.id,
      token: settings.user.token,
    };

    if (opt.recalcStyle) {
      config.overwriteStyle = true;
    }

    nc.panel.open();
    ws.emit(route, config);
    return true;
  },
};
