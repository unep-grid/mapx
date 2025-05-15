import { default as global } from "./settings.json";
import { EventSimple } from "./../event_simple";
import { el } from "./../el/src/index.js";
import { elButtonFa, elSelect, tt } from "./../el_mapx";
import chroma from "chroma-js";
import { layer_resolver, css_resolver } from "./mapx_style_resolver.js";
import { bindAll } from "../bind_class_methods";
import { isJson, isEmpty } from "../is_test";
import { onNextFrame, waitFrameAsync } from "../animation_frame/index.js";
import { modalPrompt } from "../mx_helper_modal";
import { isElement, makeSafeName, isStringRange } from "../is_test";
import { settings } from "../settings";
import { downloadJSON } from "../download";
import { TextFilter } from "../text_filter_simple";
import {
  custom_themes,
  inverseResolver,
  resolver,
  themes,
} from "./themes/index.js";
import { fileSelectorJSON } from "../mx_helper_misc";
import { isNotEmpty } from "../is_test";
import { fontFamilies, fonts, loadFontFace } from "./fonts.js";
import { validate } from "./validator.js";
import { Button } from "./../panel_controls/button.js";
import { sounds } from "./sound/index.js";
import { MapScaler } from "../map_scaler";

import "./style.less";
import { jsonDiff } from "../mx_helper_utils_json";
import { ThemeService } from "./services";

/**
 * Set globals
 */
class Theme extends EventSimple {
  constructor(opt) {
    super();
    const t = this;
    bindAll(t);

    t._opt = Object.assign(
      {},
      { themes: Object.keys(themes), custom_themes },
      global,
      opt,
    );

    t._btns = {
      dark: null,
      tree: null,
      water: null,
    };
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
    t._s = new ThemeService();

    for (const k in Object.keys(t._opt.on)) {
      t.on(k, t._opt.on[k]);
    }
    let id_saved = localStorage.getItem("theme@id");

    if (!t.isValidId(id_saved)) {
      id_saved = t._opt.id_default;
    }

    const ok = await t.set(t._opt.id || id_saved || t._opt.id_default, {
      sound: false,
      save: false,
      save_url: true,
    });
    return ok;
  }

  async updateThemeByButton() {
    const t = this;
    const s = {};
    for (const k in t._btns) {
      s[k] = t._btns[k].isActive();
    }
    const theme = resolver(s);
    await t.set(theme, {
      sound: true,
      save: true,
      save_url: true,
      update_buttons: false,
    });
  }

  updateButtons() {
    const t = this;
    const s = inverseResolver(t.id());
    for (const k in s) {
      if (t._btns[k]) {
        t._btns[k].activate(s[k]);
      }
    }
  }

  /**
   * Register dark/mono buttons
   */
  registerButton(btn, type) {
    const t = this;
    if ((!btn) instanceof Button) {
      console.warn("registerButton expects a Button instance");
      return;
    }
    t._btns[type] = btn;
    btn.setAction(async () => {
      btn.toggle();
      await t.updateThemeByButton();
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
    if (t._elManagerInputs) {
      t._elManagerInputs.off("change", t.updateFromInput);
      t._elManagerInputs.replaceChildren();
    }
  }

  id() {
    return this.theme().id;
  }

  theme() {
    return this._theme || {};
  }

  colors() {
    return this.theme().colors || {};
  }

  mode() {
    return this.isDark() ? "dark" : "light";
  }

  isDark() {
    return !!this.theme().dark;
  }

  isDarkMode() {
    const t = this;
    return t.isDark();
  }

  ids() {
    return Object.values(themes).map((theme) => theme.id);
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
    return themes[id];
  }

  getAll() {
    return themes;
  }

  /**
   * Add new theme
   * @param {Object} theme - Theme
   * @param {Object} opt - Options passed to `set`
   * @return {Promise<Boolean>} the set value
   */
  async addTheme(theme, opt) {
    const t = this;
    opt = Object.assign({}, opt);
    const ok = await validate(theme);
    if (!ok) {
      throw new Error("Invalid theme");
    }
    themes[theme.id] = theme;
    return await t.set(theme, opt);
  }

  /**
   * Set the theme with the provided ID and options.
   * colors: 947.512939453125 ms
   *inputs: 0.02978515625 ms
   * sound: 0.085693359375 ms
   * @async
   * @param {string|Object} theme - The theme or theme id
   * @param {Object} [opt] - Optional settings for the theme.
   * @param {boolean} [opt.sound=false] - Whether to play the theme sound.
   * @param {boolean} [opt.save=false] - Whether to save the theme ID to localStorage.
   * @param {boolean} [opt.save_url=false] - Whether to save the theme ID in the URL.
   * @returns {Promise<boolean>} Returns true if the theme was successfully set, otherwise false.
   * @throws {Error} If there is an error while setting the theme.
   */
  async set(theme, opt) {
    const t = this;
    opt = Object.assign(
      {},
      {
        sound: false,
        save: false,
        save_url: false,
        update_buttons: true,
      },
      opt,
    );
    let { sound, save, save_url, update_buttons } = opt;

    try {
      const isId = t.isValidId(theme);

      if (!isId && isJson(theme)) {
        theme = JSON.parse(theme);
      }

      if (isId) {
        theme = t.get(theme);
      }

      if (!validate(theme)) {
        throw new Error("Invalid theme");
      }

      const oldTheme = t.theme();
      const newTheme = theme;
      const diff = await jsonDiff(newTheme, oldTheme, opt);
      const hasDiff = isNotEmpty(diff);

      if (!hasDiff) {
        return;
      }

      t._id = theme.id;
      t._theme = theme;

      if (sound) {
        const idSound =
          oldTheme.dark && !newTheme.dark
            ? "switch_on"
            : !oldTheme.dark && newTheme.dark
              ? "switch_off"
              : "click";

        await t.sound(idSound);
      }

      await t.setColors(theme.colors);
      await t.buildInputs();

      if (save) {
        localStorage.setItem("theme@id", theme.id);
      }

      if (save_url) {
        t.setThemeUrl(theme.id);
      }
      if (update_buttons) {
        t.updateButtons();
      }

      t.fire("mode_changed", t.mode());

      return true;
    } catch (e) {
      console.warn(e);
    } finally {
      t._is_setting = false;
    }
    return false;
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
      colors || t._opt.colors,
    );
    const validColors = await t.validateColors(new_colors);
    if (!validColors) {
      console.warn("Invalid colors", new_colors);
      return;
    }
    t._theme.colors = new_colors;
    await t.updateCss();
    await t.updateMap();
    t.fire("set_colors", new_colors);
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
    global.elStyle.textContent = await css_resolver(t.colors());
    return true;
  }

  async linkMap(map) {
    const t = this;
    t._map = map;
    t._map_scaler = new MapScaler(map);
    await t.updateMap();
  }

  async updateMap() {
    const t = this;
    const map = t._map;
    if (!map) {
      return;
    }

    if (t._update_map_when_calm) {
      // Map is busy, command postponed
      return;
    }

    if (!map.isStyleLoaded()) {
      t._update_map_when_calm = true;
      await map.once("idle");
    }
    t._update_map_when_calm = false;

    /**
     * Get latest colors and state
     */
    const isDark = t.isDarkMode();
    const colors = t.colors();
    const layers = layer_resolver(colors);

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

    if (isDark) {
      map.setFog(t._opt.fog.dark);
    } else {
      map.setFog(t._opt.fog.light);
    }
    return true;
  }

  async updateFromInput() {
    try {
      const t = this;
      await waitFrameAsync();
      const colors = t.getColorsFromInputs();
      await t.setColors(colors);
    } catch (e) {
      console.warn("Update from input", e);
    }
  }

  buildInputGroup(cid) {
    const t = this;
    const colors = t.colors();
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
      tt(cid),
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
          tt(`mx_theme_input_${type}`),
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
          el("td", elInput),
        );

        return elRow;
      }),
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
      elInputTable,
    );
  }

  /**
   * Expose loadFontFace method
   * -> not used directly here
   * -> could be used in cc, widget
   */
  loadFontFace(name) {
    loadFontFace(name);
  }

  async initManager(elTarget) {
    const t = this;

    if (t._elManager) {
      return;
    }

    t._elManager = elTarget || t._opt.elManager;

    if (!isElement(t._elManager)) {
      return;
    }

    t.buildManager();
    await t.buildInputs();
  }

  buildManager() {
    const t = this;
    t._elManager.classList.add("mx-theme--manager");
    t._elManagerInputs = el("div", {
      class: "well",
      style: {
        maxHeight: "400px",
        overflowY: "auto",
      },
    });
    t._elManagerBtnRemoteSave = elButtonFa("mx_theme_remote_save_button", {
      icon: "cloud-upload",
      action: t.saveToRemote,
    });
    t._elManagerBtnRemoteLoad = elButtonFa("mx_theme_remote_load_button", {
      icon: "cloud-download",
      action: t.loadRemoteThemesDialog,
    });

    t._elManagerBtnExport = elButtonFa("mx_theme_export_button", {
      icon: "cloud-download",
      action: t.exportThemeDownload,
    });
    t._elManagerBtnImport = elButtonFa("mx_theme_import_button", {
      icon: "cloud-upload",
      action: t.importTheme,
    });
    t._elManagerInputFilter = el("input", {
      type: "text",
      class: ["form-control", "mx-theme--manager-filter"],
      placeholder: "Filter items...",
    });

    t._elManagerTools = el("div", { class: "mx-theme--manager-bar" }, [
      el("div", { class: ["btn-group", "mx-theme--manager-buttons"] }, [
        t._elManagerBtnExport,
        t._elManagerBtnImport,
        t._elManagerBtnRemoteSave,
        t._elManagerBtnRemoteLoad,
      ]),
      t._elManagerInputFilter,
    ]);

    t._elManagerToolsWrapper = el("div", { class: "well" }, t._elManagerTools);
    t._elManager.appendChild(t._elManagerToolsWrapper);
    t._elManager.appendChild(t._elManagerInputs);
    t._elManagerInputs.addEventListener("input", t.updateFromInput);

    /**
     * Filter helper
     */
    t._filter = new TextFilter({
      modeFlex: true,
      selector: ".mx-theme--inputs",
      elInput: t._elManagerInputFilter,
      elContent: t._elManagerInputs,
      timeout: 10,
    });
  }

  async buildInputs() {
    return new Promise((resolve, reject) => {
      try {
        const t = this;
        const colors = t.colors();
        const elManagerInputs = t._elManagerInputs;
        const elFrag = new DocumentFragment();
        if (!isElement(elManagerInputs)) {
          return resolve(false);
        }
        elManagerInputs.replaceChildren();

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
          elManagerInputs.replaceChildren(elFrag);
          t._filter.update();
          return resolve(true);
        });
      } catch (e) {
        reject(e);
      }
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
      if (!theme) {
        return;
      }
      await downloadJSON(theme, `${makeSafeName(theme.id)}.json`);
    } catch (e) {
      console.error(e);
    }
  }

  async getFromInput() {
    const t = this;
    const theme = t.get();
    const colors = t.getColorsFromInputs();

    if (isNotEmpty(colors)) {
      theme.colors = colors;
    }

    const isValid = await validate(theme);

    if (!isValid) {
      throw new Error(`Theme not valid`);
    }
    return theme;
  }

  async exportStyle() {
    try {
      const t = this;
      const config = {};
      const theme = await t.getFromInput();

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
    await sounds[id].play();
  }

  /**
   * Services
   */

  async registerThemes(idsThemes) {
    custom_themes.length = 0;
    for (const id of idsThemes) {
      const theme = await this._s.get(id);
      custom_themes.push(theme);
    }
  }

  async listRemoteThemes() {
    const response = await this._s.list();
    if (response.error) {
      console.warn("Failed to list remote themes:", response.error);
      return [];
    }
    return response.themes || [];
  }

  async saveToRemote() {
    try {
      const theme = await this.getFromInput();
      const response = await this._s.create(theme);

      if (response.error) {
        throw new Error(response.error);
      }

      return response.success;
    } catch (e) {
      console.error("Failed to save theme to remote:", e);
      return false;
    }
  }

  async loadRemoteThemesDialog() {
    const t = this;
    try {
      const themes = await t.listRemoteThemes();

      if (themes.length === 0) {
        await modalPrompt({
          title: tt("mx_theme_remote_empty"),
          content: tt("mx_theme_remote_empty_message"),
          confirm: tt("btn_ok"),
        });
        return;
      }

      // Build theme selection UI...
      // This would be similar to your existing modals but with theme selection
      // Once selected, load the theme with t.set(theme)
    } catch (e) {
      console.error("Failed to load remote themes:", e);
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
