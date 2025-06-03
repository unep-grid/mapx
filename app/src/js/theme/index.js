import { default as global } from "./settings.json";
import { EventSimple } from "./../event_simple";
import { el } from "./../el/src/index.js";
import { elSelect, tt } from "./../el_mapx";
import chroma from "chroma-js";
import { layer_resolver, css_resolver } from "./mapx_style_resolver.js";
import { bindAll } from "../bind_class_methods";
import { isJson, isEmpty } from "../is_test";
import { waitFrameAsync } from "../animation_frame/index.js";
import { themes_custom, themes_orig, themes } from "./themes/index.js";
import { isNotEmpty } from "../is_test";
import { fontFamilies, fonts, loadFontFace } from "./fonts.js";
import { Button } from "./../panel_controls/button.js";
import { sounds } from "./sound/index.js";
import { MapScaler } from "../map_scaler";

import "./style.less";
import { jsonDiff } from "../mx_helper_utils_json";
import { ThemeService } from "./services";
import { ThemeModal } from "./theme_modal"; // Import the new modal class
import {
  itemFlashCancel,
  itemFlashSave,
  itemFlashWarning,
  patchObject,
} from "../mx_helper_misc";
import { modalConfirm } from "../mx_helper_modal";
import { settings } from "../settings";

const def = {
  tree: true,
  water: true,
  dark: false,
};

/**
 * Set globals
 */
class Theme extends EventSimple {
  constructor(opt) {
    super();
    const t = this;
    bindAll(t);
    t._opt = Object.assign({}, global, opt);

    t._btns = {
      dark: null,
      tree: null,
      water: null,
    };
    t._inputs = [];
    t.resetThemesOrig();
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

    if (settings.mode.app) {
      // load project's theme
      await t.updateThemes();
    }

    for (const k in Object.keys(t._opt.on)) {
      t.on(k, t._opt.on[k]);
    }

    const ok = await t.set(t._opt.id, {
      sound: false,
      save_url: true,
    });
    return ok;
  }

  async getSchema(full) {
    return this._s.getSchema(full);
  }

  async getAllIds() {
    const { ids } = await this._s.getAllIds();
    return ids || [];
  }

  async getRemote(idTheme) {
    try {
      const resp = await this._s.get(idTheme);
      return resp.theme;
    } catch (e) {
      console.error(e);
      return;
    }
  }

  getCustom(id) {
    return themes_custom.find((t) => t.id == id);
  }

  async save(theme) {
    try {
      const t = this;
      await t.stopIfInvalid(theme);
      await t._s.save(theme);
      await t.addOrUpdateTheme(theme);
      itemFlashSave();
    } catch (e) {
      console.error("Failed to save theme:", e);
      itemFlashWarning();
    }
  }

  resetThemesOrig() {
    themes.length = 0;
    themes.push(...this.clone(themes_orig));
  }
  reset() {
    const t = this;
    t.resetThemesOrig();
    t.set(t.id());
  }

  clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  async validate(theme, full = false) {
    return this._s.validate(theme, full);
  }

  async validateId(idTheme) {
    return this._s.validateId(idTheme);
  }

  async stopIfInvalid(data, full = false, colors = true, debug = "") {
    const { issues } = await this.validate(data, full);

    if (isNotEmpty(issues)) {
      console.warn(`Invalid theme (full:${full}) `, issues);
      throw new Error("Invalid theme");
    }
    if (colors) {
      const validColors = this.validateColors(data);
      if (!validColors) {
        console.trace("invalid clors" + debug);
        throw new Error("Invalid theme colors");
      }
    }
    return true;
  }

  /**
   * Update themes from remote server
   */
  async updateThemes() {
    const t = this;
    try {
      const remoteThemes = await t.listRemote();
      await t.addThemes(remoteThemes);
    } catch (e) {
      console.warn("Failed to load remote themes:", e);
    }
  }

  setButtonManager(selectorButton) {
    const t = this;

    if (t._elButtonManager) {
      return;
    }

    t._elButtonManager = document.querySelector(selectorButton);

    if (!t._elButtonManager) {
      console.warn(`Theme manager: button not found ${selectorButton}`);
      return;
    }

    t._elButtonManager.addEventListener("click", t.openThemeManager);
  }

  async updateThemeByButton() {
    const t = this;
    const s = {};
    for (const k in t._btns) {
      s[k] = t._btns[k].isActive();
    }
    const theme = t.resolver(s);
    await t.set(theme, {
      sound: true,
      save_url: true,
      update_buttons: false,
    });
  }

  updateButtons() {
    const t = this;
    const s = t.inverseResolver(t.id());
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
    if (t._elThemeManagerButton) {
      t._elThemeManagerButton.remove();
      t._elThemeManagerButton = null;
    }
    t.fire("close");
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

  isExistingId(id) {
    const t = this;
    // Check if ID exists in either built-in or custom themes
    return t.ids().includes(id);
  }

  isExistingIdLocal(id) {
    const t = this;
    // Check if ID exists in either built-in or custom themes
    return t
      .listLocal()
      .map((t) => t.id)
      .includes(id);
  }

  get(id) {
    const t = this;
    if (!id) {
      id = t.id();
    }
    return t.list().find((t) => t.id === id);
  }

  /**
   * Registered custom themes ids
   */
  idsCustom() {
    return themes_custom.map((t) => t.id);
  }

  /**
   * Registered themes ids
   */
  ids() {
    return this.list().map((t) => t.id);
  }

  /**
   *
   * @returns array of themes
   */
  list() {
    const all = [...themes_custom, ...themes];
    return all;
  }

  listLocal() {
    return themes;
  }
  /**
   * Services
   */
  async listRemote(onlyPublic = true) {
    const response = await this._s.list(onlyPublic);
    return response.themes || [];
  }

  /**
   * Clear custom themes
   * Called when switching projects
   */
  clearCustomThemes() {
    themes_custom.length = 0;
    t.fire("list_updated");
  }

  /**
   * Add themes - batch
   * @param {Array<Object>} themes- Array of themes
   * @param {Boolean} skipEvent - skipEvent
   */
  async addThemes(themes = [], skipEvent = false) {
    const t = this;
    const p = [];
    for (const theme of themes) {
      p.push(t.addOrUpdateTheme(theme, true));
    }
    await Promise.all(p);
    if (!skipEvent) {
      t.fire("list_updated");
    }
  }

  /**
   * Add new theme
   * @param {Object} theme - Theme
   * @param {Boolean} skipEvent - skipEvent
   * @return {Promise<Boolean>} the set value
   */
  async addOrUpdateTheme(theme, skipEvent = false) {
    const t = this;
    await t.stopIfInvalid(theme);
    const oldTheme = t.getCustom(theme.id);

    if (oldTheme) {
      patchObject(oldTheme, theme);
    } else {
      themes_custom.push(theme);
    }

    await t.set(theme);

    if (!skipEvent) {
      t.fire("list_updated");
    }

    return true;
  }

  async deleteTheme(theme, skipEvent = false) {
    try {
      const t = this;

      await t.stopIfInvalid(theme);
      const oldTheme = t.getCustom(theme.id);

      if (!oldTheme) {
        itemFlashCancel();
        console.warn("Theme not found");
        return;
      }

      const confirmed = await modalConfirm({
        title: tt("mx_theme_delete_button"),
        content: `Are you sure you want to delete theme "${oldTheme.id}"?`,
        confirm: tt("btn_delete"),
        cancel: tt("btn_cancel"),
      });

      if (!confirmed) {
        itemFlashCancel();
        return;
      }

      await t._s.delete(oldTheme.id);

      const pos = themes_custom.indexOf(oldTheme);
      themes_custom.splice(pos, 1);

      await t.set(t.getDefault());

      if (!skipEvent) {
        t.fire("list_updated");
      }
      itemFlashSave();
    } catch (e) {
      console.error("Failed to delete theme:", e);
      itemFlashWarning();
    }
  }

  updateBrowserThemeColor(color) {
    let metaThemeColor = document.querySelector("meta[name=theme-color]");
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", color);
    } else {
      metaThemeColor = document.createElement("meta");
      metaThemeColor.name = "theme-color";
      metaThemeColor.content = color;
      document.head.appendChild(metaThemeColor);
    }
  }

  /**
   * Set the theme with the provided ID and options.
   * @async
   * @param {string|Object} theme - The theme or theme id
   * @param {Object} [opt] - Optional settings for the theme.
   * @param {boolean} [opt.sound=false] - Whether to play the theme sound.
   * @param {boolean} [opt.save=false] - [deprecated] Whether to save the theme ID to localStorage.
   * @param {boolean} [opt.save_url=false] - Whether to save the theme ID in the URL.
   * @returns {Promise<boolean>} Returns true if the theme was successfully set, otherwise false.
   * @throws {Error} If there is an error while setting the theme.
   */
  async set(theme, opt) {
    const t = this;

    if (isEmpty(theme)) {
      theme = t.id();
      if (isEmpty(theme)) {
        theme = t.getDefault();
      }
    }

    opt = Object.assign(
      {},
      {
        sound: false,
        save_url: true,
        update_buttons: true,
      },
      opt,
    );
    let { sound, save_url, update_buttons } = opt;

    try {
      const isId = t.isExistingId(theme);

      if (!isId && isJson(theme)) {
        theme = JSON.parse(theme);
      }

      if (isId) {
        if (theme === t.id()) {
          console.log('Set theme: no changes');
          return;
        }
        theme = t.get(theme);
      }

      if (!theme?.id) {
        theme = await t.getRemote(theme);

        if (theme) {
          t.addOrUpdateTheme(theme, true);
        }
      }

      if (!theme?.id) {
        console.warn("Invalid theme, use default");
        theme = t.getDefault();
      }

      await t.stopIfInvalid(theme);

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

      if (save_url) {
        t.setThemeUrl(theme.id);
      }
      if (update_buttons) {
        t.updateButtons();
      }

      t.fire("mode_changed", t.mode());
      t.fire("theme_changed", t.get());

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
      const colors_json = JSON.parse(colors);
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

  /**
   * Open the Theme Manager Modal
   */
  openThemeManager() {
    const t = this;
    if (t._themeModal) {
      console.log("Theme manager modal already open");
      return;
    }
    t._themeModal = new ThemeModal({
      theme: t,
      onClose: () => {
        t.off("list_updated", updateList);
        t.off("theme_changed", updateSelected);
        delete t._themeModal;
        t.reset();
      },
    });
    t._themeModal.init().catch(console.error);

    t.on("list_updated", updateList);
    t.on("theme_changed", updateSelected);
    function updateList() {
      t._themeModal.update();
    }
    function updateSelected() {
      t._themeModal.update();
    }
    t.on("close", t._themeModal.destroy);
  }

  /**
   * Sound
   */
  async sound(id) {
    await sounds[id].play();
  }

  /**
   * Resolve theme based on criteria : tree / dark / water
   * Prioritizes custom themes over built-in themes
   */
  resolver(opt) {
    const t = this;
    const themes = t.list();
    const theme = themes.find((theme) => {
      return t.filterTheme(theme, opt);
    });
    if (theme) {
      return theme;
    }
    console.warn("resolver failed, use default");
    return t.getDefault();
  }

  getDefault() {
    const t = this;
    return themes.find((theme) => theme.id === t._opt.id_default);
  }

  filterTheme(theme, opt) {
    const { tree, water, dark } = Object.assign({}, def, opt);
    if (theme.tree === tree && theme.dark === dark && theme.water === water) {
      return theme;
    }
  }

  inverseResolver(idTheme) {
    const t = this;
    const theme = t.get(idTheme);
    if (!theme) {
      return def;
    }
    const { tree, dark, water } = theme;
    return { tree, dark, water };
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
