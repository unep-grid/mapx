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
import { objectToArray } from "./../mx_helper_misc.js";

export async function mapComposerModalAuto() {
  const oldComposer = window._mc;

  if (oldComposer) {
    console.warn("Map Composer already active");
    return false;
  }

  /**
   * Run map composer
   */
  const { MapComposer } = await import("./map_composer");
  const elContainer = el("div");
  const map = getMap();
  const state = { items: [] };
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
   * Create initial state
   */
  const vVisible = getLayerNamesByPrefix({
    id: map.id,
    prefix: "MX-",
    base: true,
  });

  state.items.push({
    type: "map",
    width: 600,
    height: 400,
    options: {},
  });

  for (const id of vVisible) {
    const title = getViewTitle(id);
    const description = getViewDescription(id);
    const elLegend = getViewLegend(id, {
      clone: true,
      input: false,
      class: true,
      style: false,
    });

    state.items.push({
      type: "legend",
      element: elLegend,
      width: 300,
      height: 400,
      editable: true,
    });

    state.items.push({
      type: "title",
      text: title,
      width: 300,
      height: 100,
      editable: true,
    });

    state.items.push({
      type: "text",
      text: description,
      width: 300,
      height: 100,
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

  for (const item of state.items) {
    if (item.type === "map") {
      Object.assign(item.options, {
        attributionControl: false,
        style: style,
        center: map.getCenter(),
        zoom: map.getZoom(),
        pitch: map.getPitch(),
        bearing: map.getBearing(),
        projection: map.getProjection(),
      });
    }
  }

  /**
   * Init map composer
   */
  const mc = new MapComposer(elContainer, state, {
    onDestroy: () => {
      map.resize();
    },
  });

  modal({
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