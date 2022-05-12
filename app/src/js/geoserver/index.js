import { getApiUrl } from "./../api_routes/index.js";

export const geoserver = {
  rebuild: async (opt) => {
    opt = Object.assign(
      {},
      {
        recalcStyle: false,
      },
      opt
    );

    mx.nc.panel.open();
    const url = new URL(getApiUrl("updateGeoserver"));
    const idSocket = mx.ws?.io?.id;
    url.searchParams.set("idSocket", idSocket);
    url.searchParams.set("idUser",mx.settings.user.id);
    url.searchParams.set("token",mx.settings.user.token);

    if (opt.recalcStyle) {
      url.searchParams.set("overwriteStyle", true);
    }
    await fetch(url);
  },
};
