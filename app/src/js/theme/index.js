import { EventSimple } from "./../event_simple";
import { el } from "./../el/src/index.js";
import { getDictItem } from "./../language";
import chroma from "chroma-js";
import "./style.css";
import { layer_resolver, css_resolver } from "./mapx_style_resolver.js";
import { bindAll } from "../bind_class_methods";
import { isJson } from "../is_test";
import { onNextFrame } from "../animation_frame/index.js";
import * as classic_light from "./themes/classic_light.json";
import * as classic_dark from "./themes/classic_dark.json";
import * as water_dark from "./themes/water_dark.json";
import * as water_light from "./themes/water_light.json";
import switchOn from "./sound/switch-on.mp3";
import switchOff from "./sound/switch-off.mp3";
import waterDrops from "./sound/water-drops.mp3";

const global = {
  elStyle: null,
  elInputsContainer: null,
  map: null,
  themes: [
    classic_light.default,
    classic_dark.default,
    water_light.default,
    water_dark.default,
  ],
  id: "classic_light",
  id_default: "classic_light",
  colors: null,
  debug: false,
  on: {},
  sounds: {
    "switch-on": switchOn,
    "switch-off": switchOff,
    "water-drops": waterDrops,
  },
};

class Theme extends EventSimple {
  constructor(opt) {
    super();
    const t = this;
    bindAll(t);
    t._opt = Object.assign({}, global, opt);
    t._inputs = [];
    t.init();
  }
  /**
   * Init
   */
  init() {
    const t = this;
    if (!global.elStyle) {
      global.elStyle = el("style");
      document.head.appendChild(global.elStyle);
    }
    for (const k in Object.keys(t._opt.on)) {
      t.on(k, t._opt.on[k]);
    }
    const id_saved = localStorage.getItem("theme@id");
    t.set(t._opt.id || id_saved || t._opt.id_default, {
      sound: false,
      save: false,
      save_url: false,
    });
  }

  /**
   * Remove
   */
  remove() {
    const t = this;
    t.destroy();
    if (global.elStyle) {
      global.elStyle.remove();
    }
    if (t._elInputsContainer) {
      t._elInputsContainer.off("change", t.updateFromInput);
      t._elInputsContainer.replaceChildren();
    }
  }

  id() {
    return this._theme.id;
  }

  theme() {
    return this._theme || {};
  }

  colors() {
    return this._theme.colors || {};
  }

  mode() {
    return this._theme.mode;
  }

  ids() {
    const t = this;
    return t._opt.themes.map((theme) => theme.id);
  }

  isValidId(id) {
    const t = this;
    return t.ids().includes(id);
  }

  get(id) {
    const t = this;
    if (!id) {
      id = t.id();
    }
    return t._opt.themes.find((theme) => theme.id === id);
  }

  getAll() {
    const t = this;
    return t._opt.themes;
  }

  set(id, opt) {
    const t = this;
    let { sound = false, save = false, save_url = false } = opt || {};
    const valid = t.isValidId(id);
    if (!valid) {
      id = t._opt.id_default;
      // probably set in url or localStorage : overwrite that 
      save_url = true;
      save = true;
    }
    const theme = t.get(id);

    if (theme.colors) {
      t._id = theme.id;
      t._theme = theme;
      t.setColors(theme.colors);
      t.buildInputs();

      if (save) {
        localStorage.setItem("theme@id", id);
      }

      if (sound && theme.sound) {
        t.sound(theme.sound);
      }

      if (save_url) {
        t.setThemeUrl(id);
      }

      t.fire("mode_changed", t.mode());
      return true;
    }
    return false;
  }

  setThemeUrl(id) {
    const t = this;
    const url = new URL(location.href);
    url.searchParams.set("theme", id || t._opt.id_default);
    history.replaceState(null, null, url);
  }

  sanitizeColors(colors) {
    const t = this;
    const isValidInputColors = t.validateColors(colors);

    /* case valid */
    if (isValidInputColors) {
      return colors;
    }

    /* case json text */
    if (!isValidInputColors && isJson(colors)) {
      const colors_json = JSON.stringify(colors);
      if (t.validateColors(colors_json)) {
        return colors_json;
      }
    }

    /* case encoded json text */
    if (!isValidInputColors && isBase64Json(colors)) {
      const colors_b64 = b64ToJson(colors);
      if (t.validateColors(colors_b64)) {
        return colors_b64;
      }
    }
    return null;
  }

  validateColors(colors) {
    const t = this;
    const start = performance.now();
    try {
      const valid =
        colors instanceof Object &&
        Object.keys(colors).reduce((a, cid) => {
          return a && chroma.valid(colors[cid].color || colors[cid]);
        }, true) &&
        layer_resolver(colors) &&
        css_resolver(colors) &&
        true;
      if (t._opt.debug) {
        console.log(`Validated in ${performance.now() - start} [ms]`);
      }
      return valid;
    } catch (e) {
      console.warn("Invalid colors.", e);
      return false;
    }
  }

  isDarkMode() {
    const t = this;
    return t.mode() === "dark";
  }

  next(opt) {
    const t = this;
    const ids = t.ids();
    const id = t.id();
    const last = ids.length - 1;
    const pos = ids.indexOf(id);
    const useFirst = pos + 1 > last;
    const id_new = ids[useFirst ? 0 : pos + 1];
    return t.set(id_new, opt);
  }

  previous(opt) {
    const t = this;
    const ids = t.ids();
    const id = t.id();
    const last = ids.length - 1;
    const pos = ids.indexOf(id);
    const useLast = pos - 1 < 0;
    const id_new = ids[useLast ? last : pos - 1];
    return t.set(id_new, opt);
  }

  setColors(colors) {
    const t = this;
    const default_theme = t.theme();
    const new_colors = Object.assign(
      {},
      default_theme.colors,
      colors || t._opt.colors
    );
    const validColors = t.validateColors(new_colors);
    if (validColors) {
      t._colors = new_colors;
      t.updateCss();
      t.updateMap();
      t.fire("set_colors", new_colors);
    }
  }

  getColorThemeItem(id) {
    const t = this;
    const item = t.colors()[id];
    if (item) {
      return item.color;
    }
  }

  updateCss() {
    const t = this;
    global.elStyle.textContent = css_resolver(t._colors);
  }

  linkMap(map) {
    const t = this;
    t._map = map;
    t.updateMap();
  }

  updateMap() {
    const t = this;
    const map = t._map;
    if (!map) {
      return;
    }
    const isMapStyleLoaded = map.isStyleLoaded();
    const skipWaitMapLoad = t._map_skip_wait_load;

    if (!isMapStyleLoaded && !skipWaitMapLoad) {
      map.once("load", t._updateMap.bind(t));
      return;
    }

    t._map_skip_wait_load = true;

    const layers = layer_resolver(t._colors);

    for (const grp of layers) {
      for (const id of grp.id) {
        const paint = grp.paint;
        const layer = map.getLayer(id);
        const layout = grp.layout;

        if (!layer) {
          return console.warn(`Layer ${id} not found`);
        }

        if (paint) {
          for (const p in paint) {
            map.setPaintProperty(id, p, paint[p]);
          }
        }

        if (layout) {
          for (const l in layout) {
            map.setLayoutProperty(id, l, layout[l]);
          }
        }
      }
    }
  }

  updateFromInput() {
    const t = this;
    const colors = t.getColorsFromInputs();
    t.setColors(colors);
  }

  buildInputGroup(cid) {
    const t = this;
    const colors = t._colors;
    const inputType = ["checkbox", "color", "range"];
    const color = chroma(colors[cid].color);
    const visible = colors[cid].visibility === "visible";

    return el(
      "div",
      {
        id: cid,
        class: ["mx-theme--color-container"],
      },
      el(
        "span",
        {
          class: ["mx-theme--color-label", "hint--right"],
          dataset: { lang_key: cid },
          "aria-label": cid,
        },
        getDictItem(cid)
      ),
      el(
        "div",
        {
          class: ["mx-theme--colors-input"],
        },
        inputType.map((type) => {
          const isRange = type === "range";
          const isCheck = type === "checkbox";
          const id = `${cid}_inputs_${type}`;
          const config = {
            id: id,
            type: type,
            dataset: {
              action: "update",
              param: isRange ? "alpha" : isCheck ? "visibility" : "hex",
              id: cid,
            },
          };
          if (isRange) {
            config.min = 0;
            config.max = 1;
            config.step = 0.1;
          } else {
            config.style = { maxWidth: "60px" };
          }
          const elInput = el("input", config);
          const elLabel = el(
            "label",
            {
              for: id,
              "aria-label": cid,
              class: "mx-theme--colors-input-wrap",
            },
            `${type} input for ${id}`
          );
          const elWrap = el(
            "div",
            {
              id: `${cid}_inputs_wrap_${type}`,
            },
            elInput,
            elLabel
          );

          elInput.value = isRange
            ? color.alpha()
            : isCheck
            ? true
            : color.hex("rgb");

          if (isCheck) {
            elInput.checked = visible;
          }
          t._inputs.push(elInput);
          return elWrap;
        })
      )
    );
  }

  linkInputs(elInputsContainer) {
    const t = this;
    const elContainer = elInputsContainer || t._opt.elInputsContainer;
    if (t._elInputsContainer) {
      return;
    }
    if (!elContainer instanceof Element) {
      return;
    }
    elContainer.addEventListener("change", t.updateFromInput);
    t._elInputsContainer = elContainer;
    t.buildInputs();
  }

  buildInputs() {
    const t = this;
    const colors = t._colors;
    const elContainer = t._elInputsContainer;
    const elFrag = new DocumentFragment();
    if (!(elContainer instanceof Element)) {
      return;
    }
    elContainer.replaceChildren();
    for (const cid in colors) {
      const elInputGrp = t.buildInputGroup(cid);
      elFrag.appendChild(elInputGrp);
    }
    /**
     * Replacing input is not a priority. In case
     * of theme change, a lot of update is happening
     * at the same time. Building input in the next
     * frame improve performance. That and using
     * fragment require 10ms instead of 28ms.
     */
    onNextFrame(() => {
      elContainer.replaceChildren(elFrag);
    });
  }
  getColorsFromInputs() {
    const t = this;
    const out = {};

    for (const input of t._inputs) {
      const cid = input.dataset.id;
      const isCheck = input.type === "checkbox";
      const value = isCheck ? input.checked : input.value;
      const param = input.dataset.param;
      if (!out[cid]) {
        out[cid] = {};
      }
      out[cid][param] = value;
    }

    for (const cid in out) {
      const hex = out[cid].hex;
      const alpha = out[cid].alpha * 1;
      out[cid] = {
        visibility: out[cid].visibility === true ? "visible" : "none",
        color: chroma(hex).alpha(alpha).css(),
      };
    }
    return out;
  }

  /**
   * Sound
   */
  sound(id) {
    const t = this;
    t._elAudio = t._elAudio || el("audio");
    t._elAudio.setAttribute("src", t._opt.sounds[id]), t._elAudio.play();
  }
}

export { Theme };

function isBase64Json(txt) {
  try {
    const jsonString = Buffer.from(txt, "base64").toString("utf8");
    return isJson(jsonString);
  } catch (e) {
    return false;
  }
}
function b64ToJson(txt) {
  const jsonString = Buffer.from(txt, "base64").toString("utf8");
  return JSON.parse(jsonString);
}
