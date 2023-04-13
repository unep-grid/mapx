import { EventSimple } from "./../event_simple";
import { el } from "./../el/src/index.js";
import { elButtonFa, elSelect, tt } from "./../el_mapx";
import chroma from "chroma-js";
import { layer_resolver, css_resolver } from "./mapx_style_resolver.js";
import { bindAll } from "../bind_class_methods";
import { isJson, isEmpty } from "../is_test";
import { onNextFrame } from "../animation_frame/index.js";
import { modalPrompt } from "../mx_helper_modal";
import { isElement, makeSafeName, isStringRange } from "../is_test";
import { settings } from "../settings";
import { downloadJSON } from "../download";
import { TextFilter } from "../text_filter_simple";
import { default as classic_light } from "./themes/classic_light.json";
import { default as classic_dark } from "./themes/classic_dark.json";
import { default as water_dark } from "./themes/water_dark.json";
import { default as water_light } from "./themes/water_light.json";
import switchOn from "./sound/switch-on.mp3";
import switchOff from "./sound/switch-off.mp3";
import waterDrops from "./sound/water-drops.mp3";
import { fileSelectorJSON } from "../mx_helper_misc";
import { isNotEmpty } from "../is_test";
import { fontFamilies, fonts } from "./fonts.js";
import { validate } from "./validator.js";

import "./style.less";

/**
 * Set globals
 */
const global = {
  elStyle: null,
  elInputsContainer: null,
  map: null,
  themes: [classic_light, classic_dark, water_light, water_dark],
  fonts_enabled: {
    css: ["mx_ui_text"],
    map: [
      "mx_map_text_place",
      "mx_map_text_road",
      "mx_map_text_water",
      "mx_map_text_bathymetry",
      "mx_map_text_country_0_0",
      "mx_map_text_country_0_1",
      "mx_map_text_country_0_2",
      "mx_map_text_country_0_3",
      "mx_map_text_country_0_4",
      "mx_map_text_country_0_5",
      "mx_map_text_country_0_99",
      "mx_map_text_country_1_1",
    ],
  },
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
    t.init().catch((e) => {
      console.warn(e);
    });
  }
  /**
   * Init
   * see also init_themes.js
   */
  async init() {
    const t = this;
    if (!global.elStyle) {
      global.elStyle = el("style");
      document.head.appendChild(global.elStyle);
    }
    for (const k in Object.keys(t._opt.on)) {
      t.on(k, t._opt.on[k]);
    }
    const id_saved = localStorage.getItem("theme@id");
    const ok = await t.set(t._opt.id || id_saved || t._opt.id_default, {
      sound: false,
      save: false,
      save_url: false,
    });
    return ok;
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

  /**
   * Add new theme
   * @param {Object} theme - Theme
   * @param {Object} opt - Options passed to `set`
   * @return {Boolean} the set value
   */
  async addTheme(theme, opt) {
    const t = this;
    const ok = await validate(theme);
    const ids = t.ids();
    if (!ok) {
      throw new Error("Invalid theme");
    }
    if (ids.includes(theme.id)) {
      const pos = ids.indexOf(theme.id);
      t._opt.themes.splice(pos, 1);
    }
    t._opt.themes.push(theme);
    return await t.set(theme.id, opt);
  }

  /**
   * Set the theme with the provided ID and options.
   * @async
   * @param {string} id - The theme ID to set.
   * @param {Object} [opt] - Optional settings for the theme.
   * @param {boolean} [opt.sound=false] - Whether to play the theme sound.
   * @param {boolean} [opt.force=false] - Whether force settting.
   * @param {boolean} [opt.save=false] - Whether to save the theme ID to localStorage.
   * @param {boolean} [opt.save_url=false] - Whether to save the theme ID in the URL.
   * @returns {Promise<boolean>} Returns true if the theme was successfully set, otherwise false.
   * @throws {Error} If there is an error while setting the theme.
   */
  async set(id, opt) {
    const t = this;
    let ok = false;

    if (!opt.force && t._is_setting) {
      console.warn("Theme : can't set theme, probably too fast");
      return ok;
    }
    try {
      t._is_setting = true;
      let { sound = false, save = false, save_url = false } = opt || {};
      const valid = t.isValidId(id);

      if (!valid) {
        id = t._opt.id_default;
        // probably set in url or localStorage : overwrite that
        save_url = true;
        save = true;
      }
      const theme = t.get(id);

      t._id = theme.id;
      t._theme = theme;

      if (sound && theme.sound) {
        await t.sound(theme.sound);
      }

      if (save) {
        localStorage.setItem("theme@id", id);
      }

      if (save_url) {
        t.setThemeUrl(id);
      }

      await t.setColors(theme.colors);

      await t.buildInputs();

      ok = true;
      t.fire("mode_changed", t.mode());
    } catch (e) {
      console.warn(e);
    } finally {
      t._is_setting = false;
      return ok;
    }
  }

  setThemeUrl(id) {
    const t = this;
    const url = new URL(location.href);
    url.searchParams.set("theme", id || t._opt.id_default);
    history.replaceState(null, null, url);
  }

  async sanitizeColors(colors) {
    const t = this;
    const isValidInputColors = await t.validateColors(colors);

    /* case valid */
    if (isValidInputColors) {
      return colors;
    }

    /* case json text */
    if (!isValidInputColors && isJson(colors)) {
      const colors_json = JSON.stringify(colors);
      if (await t.validateColors(colors_json)) {
        return colors_json;
      }
    }

    /* case encoded json text */
    if (!isValidInputColors && isBase64Json(colors)) {
      const colors_b64 = b64ToJson(colors);
      if (await t.validateColors(colors_b64)) {
        return colors_b64;
      }
    }
    return null;
  }

  async validateColors(colors) {
    const t = this;
    const start = performance.now();
    try {
      const valid =
        colors instanceof Object &&
        Object.keys(colors).reduce((a, cid) => {
          return a && chroma.valid(colors[cid].color || colors[cid]);
        }, true) &&
        layer_resolver(colors) &&
        (await css_resolver(colors)) &&
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

  async next(opt) {
    const t = this;
    const ids = t.ids();
    const id = t.id();
    const last = ids.length - 1;
    const pos = ids.indexOf(id);
    const useFirst = pos + 1 > last;
    const id_new = ids[useFirst ? 0 : pos + 1];
    const ok = await t.set(id_new, opt);
    return ok;
  }

  async previous(opt) {
    const t = this;
    const ids = t.ids();
    const id = t.id();
    const last = ids.length - 1;
    const pos = ids.indexOf(id);
    const useLast = pos - 1 < 0;
    const id_new = ids[useLast ? last : pos - 1];
    const ok = await t.set(id_new, opt);
    return ok;
  }

  async setColors(colors) {
    const t = this;
    const default_theme = t.theme();
    const new_colors = Object.assign(
      {},
      default_theme.colors,
      colors || t._opt.colors
    );
    const validColors = await t.validateColors(new_colors);
    if (validColors) {
      t._colors = new_colors;
      await t.updateCss();
      await t.updateMap();
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

  async updateCss() {
    const t = this;
    global.elStyle.textContent = await css_resolver(t._colors);
    return true;
  }

  async linkMap(map) {
    const t = this;
    t._map = map;
    await t.updateMap();
  }

  async updateMap() {
    const t = this;
    const map = t._map;
    if (!map) {
      return;
    }
    /*    const isMapStyleLoaded = map.isStyleLoaded();*/

    /*if (!isMapStyleLoaded) {*/
    /*await map.once("load", t.updateMap.bind(t));*/
    /*return false;*/
    /*}*/

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

    await map.once("idle");
    return true;
  }

  async updateFromInput() {
    try {
      const t = this;
      const colors = t.getColorsFromInputs();
      await t.setColors(colors);
    } catch (e) {
      console.warn("Update from input", e);
    }
  }

  buildInputGroup(cid) {
    const t = this;
    const colors = t._colors;
    const inputType = ["checkbox", "color", "range"];
    const conf = colors[cid];
    const color = chroma(conf.color);
    const visible = conf.visibility === "visible";
    const isTextMap = t._opt.fonts_enabled.map.includes(cid);
    const isTextCss = t._opt.fonts_enabled.css.includes(cid);

    const elLabel = el(
      "label",
      {
        class: ["mx-theme--color-label", "hint--right"],
        dataset: { lang_key: cid },
        "aria-label": cid,
      },
      tt(cid)
    );

    /**
     * Color, checkbox, range
     */
    const elInputTable = el(
      "table",
      {
        class: ["mx-theme--items"],
      },
      inputType.map((type) => {
        const id = `${cid}_inputs_${type}`;
        const isRange = type === "range";
        const isCheck = type === "checkbox";

        /**
         * input
         */
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
          config.step = 0.01;
        } else {
          config.style = { maxWidth: "60px" };
        }

        const elInput = el("input", config);

        elInput.value = isRange
          ? color.alpha()
          : isCheck
          ? true
          : color.hex("rgb");

        if (isCheck) {
          elInput.checked = visible;
        }

        t._inputs.push(elInput);

        /**
         * Label
         */
        const elLabel = el(
          "div",
          {
            for: id,
            "aria-label": cid,
          },
          tt(`mx_theme_input_${type}`)
        );

        /**
         * Column
         */
        const elRow = el(
          "tr",
          {
            id: `${cid}_inputs_wrap_${type}`,
          },
          el("td", elLabel),
          el("td", elInput)
        );

        return elRow;
      })
    );

    /**
     * Font selector
     */
    if (isTextCss) {
      const elFontFamilies = fontFamilies.map((n) => {
        const elOption = el("option", n);
        if (n === conf.font) {
          elOption.setAttribute("selected", "selected");
        }
        return elOption;
      });

      const elSelectFont = elSelect(`${cid}_font`, {
        keyLabel: "mx_theme_input_font_family",
        items: elFontFamilies,
        asRow: true,
        value: conf.font,
      });
      const elInput = elSelectFont.querySelector("select");
      elInputTable.appendChild(elSelectFont);
      elInput.dataset.param = "font";
      elInput.dataset.id = cid;
      t._inputs.push(elInput);
    }

    if (isTextMap) {
      const elFonts = fonts.map((n) => {
        const elOption = el("option", n);
        if (n === conf.font) {
          elOption.setAttribute("selected", "selected");
        }
        return elOption;
      });

      const elSelectFontMap = elSelect(`${cid}_font`, {
        keyLabel: "mx_theme_input_font",
        items: elFonts,
        asRow: true,
        value: conf.font,
      });

      const elInput = elSelectFontMap.querySelector("select");
      elInput.dataset.param = "font";
      elInput.dataset.id = cid;
      elInputTable.appendChild(elSelectFontMap);
      t._inputs.push(elInput);
    }

    return el(
      "div",
      {
        id: cid,
        class: ["mx-theme--inputs"],
      },
      elLabel,
      elInputTable
    );
  }

  async linkInputs(elInputsContainer) {
    const t = this;
    const elContainer = elInputsContainer || t._opt.elInputsContainer;
    if (t._elInputsContainer) {
      return;
    }
    if (!elContainer instanceof Element) {
      return;
    }
    t._elContainer = elContainer;
    t._elContainer.addEventListener("input", t.updateFromInput);
    t.buildManager();
    await t.buildInputs();
    t.buildSearchTool();
  }

  buildManager() {
    const t = this;
    t._elContainer.classList.add("mx-theme--manager");
    t._elInputsContainer = el("div");
    const elBtnExport = elButtonFa("mx_theme_export_button", {
      icon: "cloud-download",
      action: t.exportThemeDownload,
    });
    const elBtnImport = elButtonFa("mx_theme_import_button", {
      icon: "cloud-upload",
      action: t.importTheme,
    });
    const elInputFilter = el("input", {
      type: "text",
      class: ["form-control", "mx-theme--manager-filter"],
      placeholder: "Filter items...",
    });
    t._elInputFilter = elInputFilter;

    const elGroup = el("div", { class: "mx-theme--manager-bar" }, [
      el("div", { class: ["btn-group", "mx-theme--manager-buttons"] }, [
        elBtnExport,
        elBtnImport,
      ]),
      elInputFilter,
    ]);

    const elTools = el("div", { class: "well" }, elGroup);
    t._elContainer.appendChild(elTools);
    t._elContainer.appendChild(t._elInputsContainer);
  }

  async buildInputs() {
    return new Promise((resolve, reject) => {
      try {
        const t = this;
        const colors = t._colors;
        const elContainer = t._elInputsContainer;
        const elFrag = new DocumentFragment();
        if (!isElement(elContainer)) {
          return resolve(false);
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
          return resolve(true);
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  buildSearchTool() {
    const t = this;
    const valid =
      isElement(t._elInputsContainer) && isNotEmpty(t._elInputsContainer);

    if (!valid) {
      return;
    }
    /**
     * Filter helper
     */
    t._filter = new TextFilter({
      selector: ".mx-theme--inputs",
      elInput: t._elInputFilter,
      elContent: t._elInputsContainer,
      timeout: 10,
    });
  }

  async importTheme() {
    const t = this;
    try {
      const data = await fileSelectorJSON({ multiple: false });

      if (isEmpty(data)) {
        return;
      }
      await t.addTheme(data[0]);
    } catch (e) {
      console.error(e);
    }
  }

  async exportThemeDownload() {
    try {
      const t = this;
      const theme = await t.exportStyle();
      await downloadJSON(theme, `mx_theme_${makeSafeName(theme.id)}.json`);
    } catch (e) {
      console.error(e);
    }
  }

  async exportStyle() {
    try {
      const t = this;
      const config = {};
      const theme = t.get();

      const colors = t.getColorsFromInputs();

      if (isNotEmpty(colors)) {
        theme.colors = colors;
      }

      const isValid = await validate(theme);

      if (!isValid) {
        throw new Error(`Theme not valid`);
      }

      for (const item of ["id", "description", "author"]) {
        let value;
        switch (item) {
          case "id":
            value = theme.id;
            break;
          case "description":
            value = theme?.description?.en;
            break;
          case "author":
            value = settings?.user?.email || "Guest";
            break;
          default:
            value = "na";
        }

        const res = await modalPrompt({
          label: tt(`mx_theme_export_${item}`),
          confirm: tt("mx_theme_export_next"),
          inputOptions: {
            type: "text",
            value: value,
          },
          onInput: (value, _, elMsg, elInput) => {
            const max = item === "id" ? 20 : 100;
            const min = 3;
            const valid = isStringRange(value, min, max);
            if (valid && item === "id") {
              elInput.value = makeSafeName(value);
            }
            if (!valid) {
              elMsg.innerText = `Not in range min: ${min} max: ${max}`;
            }
            console.log(valid);
            return valid;
          },
        });

        if (!res) {
          return;
        }

        if (item === "description") {
          config[item] = { en: res };
        } else {
          config[item] = res;
        }
      }

      const out = Object.assign({}, theme, config);
      return out;
    } catch (e) {
      console.error(e);
    }
  }

  getColorsFromInputs() {
    /**
     * NOTE: this could have been a form ?
     */
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

    /**
     * Build color
     */
    for (const cid in out) {
      const hex = out[cid].hex;
      const alpha = out[cid].alpha * 1;
      const font = out[cid].font;
      out[cid] = {
        visibility: out[cid].visibility === true ? "visible" : "none",
        color: chroma(hex).alpha(alpha).css(),
      };
      if (font) {
        out[cid].font = font;
      }
    }
    return out;
  }

  /**
   * Sound
   */
  async sound(id) {
    try {
      const t = this;
      if (t._playing) {
        return;
      }
      t._playing = true;
      t._elAudio = t._elAudio || el("audio");
      t._elAudio.setAttribute("src", t._opt.sounds[id]);
      await t._elAudio.play();
      t._playing = false;
    } catch (e) {
      console.warn(e);
    }
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
