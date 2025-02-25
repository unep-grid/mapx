import { Geocoder } from ".";
import { modal } from "../mx_helper_modal";
import { isFunction } from "../is_test";
import { el } from "../el_mapx";
import { getMap } from "../map_helpers";
import { settings } from "../settings";
import { spatialDataToView } from "../mx_helper_map_dragdrop";
import { viewsListAddSingle } from "../views_list_manager";
import { getDictItem } from "../language";

export class GeocoderModal {
  constructor(config = {}) {
    this._config = {
      ...config,
      ...{
        elTarget: el("div"),
        map: getMap(),
        language: settings.language,
        onGeoJSONSave: settings.mode.app
          ? async function (geojson) {
              if (settings.mode.static) {
                return;
              }
              const view = await spatialDataToView({
                title: `Geocode Result ${new Date().toLocaleDateString()}`,
                fileName: "geocode_result",
                fileType: "geojson",
                data: geojson,
                save: true,
              });
              await viewsListAddSingle(view, {
                open: true,
              });
            }
          : null,
      },
    };
  }

  async init() {
    const gcm = this;

    gcm._gc = new Geocoder();

    gcm._modal = modal({
      title: getDictItem("gc_geocoder"),
      content: gcm.config.elTarget,
      onClose: () => {
        gcm._gc.destroy();
        if (isFunction(gcm.config.onClose)) {
          gcm.config.onClose(gcm);
        }
      },
    });

    await gcm._gc.init(gcm.config);
  }

  close() {
    this._modal.close();
  }

  get config() {
    return this._config;
  }
}
