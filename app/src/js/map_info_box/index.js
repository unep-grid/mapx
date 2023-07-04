import { el } from "./../el/src/index.js";
import { getDictItem } from "../language";
import { isNotEmpty } from "../is_test/index.js";
import "./style.less";


const debug = false;

/**
 * MapInfoBpx
 * - if `mx_info_box` attribute exist when hovering the map, this module will display an infobox
 */
export class MapInfoBox {
  constructor(map) {
    const mib = this;
    mib.init(map);
  }

  /**
   * Init
   * @param {mapboxgl.Map} map
   */
  init(map) {
    const mib = this;
    mib._map = map;
    mib._map.on("mousemove", mib.onmousemove.bind(mib));
    mib._map.on("move", mib.hide.bind(mib));
    mib.build();
    mib.hide();
  }

  /**
   * Move listener
   * @param {mapboxgl.Evented} e
   */
  async onmousemove(e) {
    try {
      const mib = this;
      const map = mib._map;
      /**
       * Display a message when hovering special elements
       */
      const triggerName = ["mx_info_box"];
      const featuresAll = map.queryRenderedFeatures(e.point);
      const ids = [];

      for (const f of featuresAll) {
        const lId = f?.layer?.id;
        for (const key in f.properties) {
          if(debug){
            console.log(`${lId}. k:${key} v:${f.properties[key]}`);
          }
          if (triggerName.includes(key)) {
            ids.push(f.properties[key]);
          }
        }
      }

      mib.clear();
      if (isNotEmpty(ids)) {
        mib.show();
        mib.setPos(e.point);
        await mib.setContent(ids);
      } else {
        mib.hide();
      }
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * Clear the box
   */
  clear() {
    const mib = this;
    while (mib._el_box.firstElementChild) {
      mib._el_box.firstElementChild.remove();
    }
  }

  /**
   * Display the box
   */
  show() {
    const mib = this;
    mib._el_box.style.display = "block";
  }

  /**
   * Hide the box
   */
  hide() {
    const mib = this;
    mib._el_box.style.display = "none";
  }

  /**
   * Update position
   * @param {mapboxgl.PointLike} Point
   */
  setPos(point) {
    const mib = this;
    mib._el_box.style.top = `${point.y}px`;
    mib._el_box.style.left = `${point.x}px`;
  }

  /**
   * Build the box
   */
  build() {
    const mib = this;
    /**
     * Mouse move handling
     */
    mib._el_box = el("span", {
      class: "map_info_box",
    });
    document.body.appendChild(mib._el_box);
  }

  /**
   * Update box content
   * @param {Array} ids Arary of ids : if no translation found, use id
   */
  async setContent(ids) {
    const mib = this;
    const txtArr = await getDictItem(ids);
    for (const txt of txtArr) {
      mib._el_box.appendChild(el("p", txt));
    }
  }
}
