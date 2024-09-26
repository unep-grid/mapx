import { getDictItem } from "./../language";
import { modal } from "./../mx_helper_modal.js";
import { el, elSpanTranslate as tt } from "./../el_mapx";
import {
  getMap,
  getLayerNamesByPrefix,
  getViewDescription,
  getViewLegend,
  getViewTitle,
  getView,
} from "./../map_helpers/index.js";
import { getViewMetaToHtml } from "../metadata/utils";
import { objectToArray, getContentSize } from "./../mx_helper_misc.js";
import { modalIframe } from "../modal_iframe";

const store = {
  mc: null,
};

export class MapComposerModal {
  constructor() {
    const oldComposer = store.mc;
    if (oldComposer) {
      console.warn("Map Composer already active");
      return false;
    }
  }

  async init() {
    /**
     * Run map composer
     */
    const { MapComposer } = await import("./map_composer");
    const elContainer = el("div");
    const map = getMap();
    const config = {
      predefined_dim: "A5",
      items: [],
      files: [],
    };
    const style = map.getStyle();
    if (style.terrain) {
      /*
       * Bug listed here : https://github.com/mapbox/mapbox-gl-js/issues/11553
       */
      delete style.terrain;
    }

    /**
     * Modal button
     */
    const elBtnHelp = el(
      "div",
      {
        class: "btn btn-default",
        on: {
          click: () => {
            return modalIframe({
              title: getDictItem("btn_help"),
              doc_id: "doc_map_composer",
            });
          },
        },
      },
      getDictItem("btn_help"),
    );

    /**
     * Create initial config
     * - Use views with layers
     * - For views active -> getViewsActive
     */
    const vVisible = getLayerNamesByPrefix({
      id: map.id,
      prefix: "MX-",
      base: true,
    });

    config.items.push({
      type: "map",
      width: 500,
      height: 500,
      removable: false,
      options: {},
    });

    for (const id of vVisible) {
      const view = getView(id);
      const title = getViewTitle(id);
      const description = getViewDescription(id);
      const elTitle = el("div", [el("h1", title), el("p", description)]);

      const isVt = view.type === "vt";

      const elLegend = getViewLegend(id, {
        clone: true,
        input: false,
        class: true,
        style: isVt ? false : true,
      });

      const dimLegend = getContentSize(elLegend);
      const dimTitle = getContentSize(elTitle);

      config.items.push({
        type: "legend",
        element: elLegend,
        width: dimLegend.width + 30,
        height: dimLegend.height + 30,
        editable: true,
        removable: true,
      });

      config.items.push({
        type: "element",
        element: elTitle,
        editable: true,
        removable: true,
        width: dimTitle.width + 30,
        height: dimTitle.height + 30,
      });

      /**
       * Provide metadata as files
       */
      const meta = await getViewMetaToHtml(id);

      config.files.push({
        type: "file",
        content: new Blob([meta], { type: "text/html" }),
        name: `view_metadata_${id}.html`,
      });
    }

    /**
     * Add disclaimer and atribution
     */
    const { default: disclaimer } = await import("./../../md/disclaimer.md");
    config.files.push({
      type: "file",
      content: new Blob([disclaimer], { type: "text/markdown" }),
      name: "disclaimer.md",
    });

    const { default: attribution } = await import("./../../md/attribution.md");
    config.files.push({
      type: "file",
      content: new Blob([attribution], { type: "text/markdown" }),
      name: "attribution.md",
    });

    /**
     * Remove canvas source and layers
     */
    const styleSources = objectToArray(style.sources, true);
    const srcToRemove = styleSources.filter((r) => r.value.type === "canvas");

    for (const src of srcToRemove) {
      const id = src.key;
      delete style.sources[id];
      let i = style.layers.length;
      while (i--) {
        const layer = style.layers[i];
        if (layer.source === id) {
          style.layers.splice(i, 1);
        }
      }
    }

    for (const item of config.items) {
      if (item.type === "map") {
        Object.assign(item.options, {
          attributionControl: false,
          style: style,
          center: map.getCenter(),
          zoom: map.getZoom(),
          pitch: map.getPitch(),
          bearing: map.getBearing(),
          projection: map.getProjection(),
          terrain: map.getTerrain(),
        });
      }
    }

    /**
     * Init map composer
     */
    const mc = new MapComposer(elContainer, config, {
      onDestroy: destroy,
    });

    let closed = false;

    const modalComposer = modal({
      id: "map_composer",
      title: tt("mc_title"),
      buttons: [elBtnHelp],
      content: elContainer,
      addSelectize: false,
      onClose: destroy,
      addBackground: true,
      style: {
        position: "absolute",
        width: "80%",
        height: "100%",
      },
      styleContent: {
        padding: "0px",
      },
    });

    function destroy() {
      if (closed) {
        return;
      }
      closed = true;
      modalComposer.close();
      mc.destroy();
      delete store.mc;
    }

    store.mc = mc;
    return true;
  }
}
