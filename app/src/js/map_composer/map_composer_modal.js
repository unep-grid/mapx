import { getDictItem } from "./../language";
import { modalMarkdown } from "./../modal_markdown/index.js";
import { modal } from "./../mx_helper_modal.js";
import { el, elSpanTranslate as tt } from "./../el_mapx";
import {
  getMap,
  getLayerNamesByPrefix,
  getViewDescription,
  getViewLegend,
  getViewTitle,
} from "./../map_helpers/index.js";
import { objectToArray, getContentSize } from "./../mx_helper_misc.js";

export class MapComposerModal {
  constructor() {
    const mcm = this;
    const oldComposer = window._mc;
    if (oldComposer) {
      console.warn("Map Composer already active");
      return false;
    }
    return mcm.init().catch(console.error);
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
            return modalMarkdown({
              title: getDictItem("btn_help"),
              wiki: "Map-composer",
            });
          },
        },
      },
      getDictItem("btn_help")
    );

    /**
     * Create initial config
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
      options: {},
    });

    for (const id of vVisible) {
      const title = getViewTitle(id);
      const description = getViewDescription(id);

      const elTitle = el("div", [el("h1", title), el("p", description)]);

      const elLegend = getViewLegend(id, {
        clone: true,
        input: false,
        class: true,
        style: false,
      });

      const dimLegend = getContentSize(elLegend);
      const dimTitle = getContentSize(elTitle);

      config.items.push({
        type: "legend",
        element: elLegend,
        width: dimLegend.width,
        height: dimLegend.height,
        editable: true,
      });

      config.items.push({
        type: "element",
        element: elTitle,
        width: dimTitle.width,
        height: dimTitle.height,
        editable: true,
      });
    }

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
      onDestroy: () => {},
    });

    modal({
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
      mc.destroy();
      delete window._mc;
    }

    window._mc = mc;
    return true;
  }
}

