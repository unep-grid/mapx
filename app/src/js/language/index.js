import {
  isArray,
  isMap,
  isElement,
  isStringRange,
  isNotEmpty,
  isString,
  isEmpty,
} from "./../is_test";
import { path, parseTemplate, objectToArray } from "./../mx_helper_misc.js";
import {
  getViews,
  getMap,
  getLayerNamesByPrefix,
} from "./../map_helpers/index.js";
import { getArrayDistinct } from "../array_stat";
import { settings } from "./../settings";
import { LegendVt } from "../legend_vt";
import { events, mapboxgl } from "../mx.js";

/**
 * Add synonyms
 */
import countries_syn from "./synonyms/countries.json";
const syn = new Map();
for (const country of countries_syn) {
  syn.set(country.alt, country.id);
}

/**
 * Set current language ( for updating ui/views, use updateLanguage )
 * @param {String} lang Iso2 language code
 * @return {String} matched language
 */
export function setLanguageCurrent(lang) {
  const languages = getLanguagesAll();
  if (!languages.includes(lang)) {
    lang = languages[0];
  }
  settings.language = lang;
  return lang;
}

/**
 * Get current language
 * @return {String} language code
 */
export function getLanguageCurrent() {
  const language = settings.language || getLanguagesAll()[0];
  return language;
}

/**
 * Get all languages
 * @return {Array} languages code
 */
export function getLanguagesAll() {
  const languages = settings.languages || ["en"];
  return getArrayDistinct(languages);
}

/**
 * Get default language
 * @return {String} language code
 */
export function getLanguageDefault() {
  return getLanguagesAll()[0];
}

/**
 * Update language : Elements, view list and map
 * @param {String} Language code
 */
export async function updateLanguage(language) {
  const currentLanguage = getLanguageCurrent();
  const validLang = isStringRange(language, 2, 2);

  if (!validLang) {
    language = currentLanguage;
  }
  const newLanguage = setLanguageCurrent(language);

  /**
   * Fire language_change if required
   */
  if (currentLanguage !== newLanguage) {
    events.fire({
      type: "language_change",
      data: {
        new_language: newLanguage,
      },
    });
  }

  /*
   * Set language for the document
   */
  document.querySelector("html").setAttribute("lang", newLanguage);

  /**
   * Update lang of interface
   */
  await updateLanguageElements();

  /**
   * Update map language
   */
  await updateLanguageMap();

  /**
   * Update views language : labels, desc, title
   */
  await updateLanguageViewsList();
}

/**
 * Split strings in multiple line
 * e.g. for tooltype.
 * @param {String} str Input string
 * @retur {String} string separated by new line (\n)
 */
export function splitnwords(str) {
  return str
    .split(/((?:\w+ ){6})/g)
    .filter(Boolean)
    .join("\n");
}

/**
 * Get Full dictionnary for a language
 * @param {String} lang Language code (e.g. 'en')
 * @return {Promise<Object>} Full dictionnary object
 */
const _dict_cache = {};
export async function getDict(lang) {
  lang = lang || getLanguageCurrent();
  let out;

  if (_dict_cache[lang]) {
    return _dict_cache[lang];
  }

  switch (lang) {
    case "en":
      out = await import("../../data/dict/_built/dict_en.json");
      break;
    case "fr":
      out = await import("../../data/dict/_built/dict_fr.json");
      break;
    case "es":
      out = await import("../../data/dict/_built/dict_es.json");
      break;
    case "de":
      out = await import("../../data/dict/_built/dict_de.json");
      break;
    case "ru":
      out = await import("../../data/dict/_built/dict_ru.json");
      break;
    case "fa":
      out = await import("../../data/dict/_built/dict_fa.json");
      break;
    case "ps":
      out = await import("../../data/dict/_built/dict_ps.json");
      break;
    case "bn":
      out = await import("../../data/dict/_built/dict_bn.json");
      break;
    case "zh":
      out = await import("../../data/dict/_built/dict_zh.json");
      break;
    case "ar":
      out = await import("../../data/dict/_built/dict_ar.json");
      break;
    default:
      out = await import("../../data/dict/_built/dict_en.json");
      break;
  }
  _dict_cache[lang] = out.default;
  return _dict_cache[lang];
}

/** Translate text, tooltype or placeholder in element based on "[data-lang_key]" id and a json key-value pair dictionnary
 * @param {Object} o
 * @param {Element} o.el Target element. If omitted, the whole document will be translated.
 * @param {String} o.lang Language code. e.g. "en" or "fr".
 */
export async function updateLanguageElements(o) {
  o = Object.assign({}, o);
  o.lang = o.lang || getLanguageCurrent();
  let els, el, doc, label, found, type, id, data;
  let i, iL, j, jL;
  let changes = [];
  const dict = await getDict(o.lang);
  const lang = o.lang;

  // if no el to look at, serach the whole document
  doc = isElement(o.el) ? o.el : document;

  // fetch all elements with data-lang_key attr
  els = doc.querySelectorAll("[data-lang_key]");

  for (i = 0, iL = els.length; i < iL; i++) {
    el = els[i];
    type = el.dataset.lang_type;
    id = el.dataset.lang_key;
    data = el.dataset.lang_data;
    found = false;
    label = "";

    /*
     * NOTE: BUG IN SAFARI : sometimes, dataset is not returning correctly
     */
    if (!type) {
      type = el.getAttribute("data-lang_type");
    }

    /*
     * Default is text : inner text will be updated
     */
    if (!type) {
      type = "text";
    }

    for (j = 0, jL = dict.length; j < jL; j++) {
      if (!found) {
        if (dict[j].id === id) {
          found = true;
          label = dict[j][lang];
          if (!label) {
            label = dict[j][langDefault];
          }
          if (isNotEmpty(data)) {
            data = JSON.parse(data);
            label = parseTemplate(label, data);
          }
        }
      }
    }

    changes.push([type, el, label]);
  }

  /**
   * Group all change to avoid many reflow;
   */
  for (const change of changes) {
    setValue(change[0], change[1], change[2]);
  }

  /**
   * Helpers
   */
  function setValue(type, el, label) {
    if (!label) {
      return;
    }
    switch (type) {
      case "title":
        el.setAttribute("title", label);
        return;
      case "tooltip":
        if (el.dataset.lang_split) {
          label = splitnwords(label);
        }
        el.setAttribute("aria-label", label);
        if (el.className.indexOf("hint--") === -1) {
          el.className += " hint--left";
        }
        return;
      case "placeholder":
        el.setAttribute("placeholder", label);
        return;
      default:
        el.innerText = label;
    }
  }
}

/**
 * Get value from the dictionary for a given key and language. Fallback to "def"
 * @param {string} key Key to look for in the dictionnary
 * @param {string} lang  Two letters language code
 * @return {Promise<String|Array>} If key is an array, array of item, else string.
 */
export async function getDictItem(key, lang) {
  lang = lang || getLanguageCurrent();

  if (isEmpty(key)) {
    return;
  }

  const keys = [];
  const defaultLang = getLanguageDefault();
  const kIsArray = isArray(key);
  const dict = await getDict(lang);
  const res = [];

  if (!isArray(dict)) {
    dict = objectToArray(dict);
  }

  if (isString(key)) {
    key = [key];
  }

  keys.push(...key);

  for (const k of keys) {
    let found = false;
    for (const d of dict) {
      if (!found && (d.id === k || d.id === syn.get(k))) {
        res.push(d[lang] || d[defaultLang] || k);
        found = true;
      }
    }
    if (!found) {
      res.push(k);
    }
  }

  return kIsArray ? res : res[0];
}

/**
 * Get template from dict and use an object to replace {{<key>}} parts
 * @param {String} key Dict key
 * @param {Object} data Object to use for remplacement
 * @param  {String} lang Two letters language
 * @return {Promise<string>} Parsed template string
 */
export async function getDictTemplate(key, data, lang) {
  const template = await getDictItem(key, lang);
  return templateHandler(template, data);
}

export function templateHandler(text, data = {}) {
  return text.replace(/{{([^{}]+)}}/g, (_, key) => {
    return data[key];
  });
}

/**
 * Get label value from an object path.
 * @param {Object} o Options
 * @param {string} o.lang Selected language two letter code.
 * @param {Any} o.defaultValue Default value
 * @param {Object} o.obj Object containing the value
 * @param {String} o.path Path to the value container. Eg. "data.title"
 */
export function getLabelFromObjectPath(o) {
  const langs = getLanguagesAll();
  const defaultValue = o.defaultValue || "";

  o.lang = o.lang ? o.lang : getLanguageCurrent();
  o.sep = o.sep ? o.sep : ".";
  o.path = o.path ? o.path + o.sep : "";
  let out = path(o.obj, o.path + o.lang, null);

  if (!out) {
    /**
     * Try alternative language
     */
    for (const l of langs) {
      if (!out) {
        out = path(o.obj, o.path + l, null);
      }
    }
  }

  if (!out) {
    /**
     * Use the default value
     */
    out = defaultValue;
  }

  return out;
}

/**
 * Check language code for the view item and control fallback
 * @param {Object} opt options
 * @param {Object} opt.obj object to check
 * @param {String} opt.path path to the string to check
 * @param {String} opt.language language code expected
 * @param {Array} opt.languages code for fallback
 * @param {String} opt.prefix Language prefix. e.g. 'label_' -> 'label_en'
 * @return {Sting} Language for which the object as value.
 * @example
 *     checkLanguage({
 *         obj : it,
 *         path : "data.title",
 *         language : "fr",
 *         languages :  ["en","de","ru"]
 *     })
 */
export function checkLanguage(opt) {
  const def = {
    obj: {},
    path: "",
    languages: getLanguagesAll(),
    language: getLanguageCurrent(),
    prefix: "",
  };
  const o = Object.assign({}, def, opt);

  /*
   * Put code expected in first position and
   * remove duplicate if any
   */
  const langs = getArrayDistinct([o.language, ...o.languages]);

  /**
   * Set path separator
   */
  if (isNotEmpty(o.path)) {
    o.path = `${o.path}.`;
  }

  for (const lang of langs) {
    const value = path(o.obj, `${o.path}${o.prefix + lang}`);
    if (isNotEmpty(value)) {
      return lang;
    }
  }
  /**
   * Nothing found. Fallack to default language
   */
  return getLanguageDefault();
}

/**
 * Get language item from object
 * @param {object} o options
 * @param {object} o.obj object to check
 * @param {string} o.path path to the string to check
 * @param {string} o.language language code expected
 */
export function getTranslationFromObject(o) {
  o = Object.assign({}, o);
  const lang = checkLanguage(o);
  const out = path(o.obj, o.path + "." + lang, "");
  return out;
}

/**
 * Get language from language object
 * NOTE Simple version of `getTranslationFromObject`, without path
 * @param {Object} obj Language object
 * @param {String} language Language code
 * @return {String} item
 */
export function getLanguageItem(obj, language) {
  language = checkLanguage({
    obj,
    language,
  });
  return obj[language];
}

/**
 * Update language views list
 * @param {Object} o options
 * @param {String} o.lang Language
 */
export async function updateLanguageViewsList(o) {
  o = Object.assign({}, o);
  const lang = o.lang || getLanguageCurrent() || getLanguageDefault();
  const views = getViews();
  const isModeStatic = path(mx, "settings.mode.static") === true;
  if (isModeStatic) {
    return false;
  }

  for (const view of views) {
    try {
      const elTitle = view._el.querySelector(".mx-view-tgl-title");
      const elText = view._el.querySelector(".mx-view-item-desc");
      const elLegendRtTitle = view._el.querySelector(".mx-legend-rt-title");
      const hasVtLegend = view._legend instanceof LegendVt;

      /**
       * Update vt legend
       */
      if (hasVtLegend) {
        view._legend.updateLanguage();
      }

      /**
       * Update rt legend text only
       */
      if (elLegendRtTitle) {
        const legendTitle = getLabelFromObjectPath({
          lang: lang,
          obj: view,
          path: "data.source.legendTitles",
          defaultValue: null,
        });
        if (legendTitle) {
          elLegendRtTitle.innerText = legendTitle;
          elLegendRtTitle.setAttribute("title", legendTitle);
        }
      }

      /**
       * Update view title
       */
      if (elTitle) {
        elTitle.innerHTML = getLabelFromObjectPath({
          lang: lang,
          obj: view,
          path: "data.title",
        });
      }

      /**
       * Update view description
       */
      if (elText) {
        elText.innerHTML = getLabelFromObjectPath({
          lang: lang,
          obj: view,
          path: "data.abstract",
        });
      }
    } catch (e) {
      console.warn("updateLanguageViewsList error", e.message);
    }
  }
  return true;
}

/**
 * Set or Update language of a layer, based on text-field attribute.
 * @param {object} o Options
 * @param {string} o.mapId Map id
 * @param {string} [o.language='en'] Two letter language code
 */
export async function updateLanguageMap(o) {
  o = Object.assign(
    {},
    {
      language: getLanguageCurrent(),
    },
    o,
  );

  /**
   * Map do not yet support all MapX languages. Subset here:
   */
  const mapLang = ["en", "es", "fr", "de", "ru", "zh", "pt", "ar"];
  const rtlLang = ["ar"];
  const defaultLang = mapLang[0];
  const lang = mapLang.includes(o.language) ? o.language : defaultLang;
  const layers = [
    "road-label",
    "water-label-line",
    "water-label-point",
    "waterway-label",
    "place-label-city",
    "place-label-capital",
    ...[0, 1, 2, 3, 4, 5, 99].map((i) => {
      return `country_un_0_label_${i}`;
    }),
    ...[1].map((i) => {
      return `country_un_1_label_${i}`;
    }),
  ];

  const map = getMap(o.id);
  const lang2 = lang === "zh" ? "zh-Hans" : defaultLang;

  if (!isMap(map)) {
    console.error("updateLanguageMap require a Map");
    return;
  }

  if (rtlLang.includes(lang)) {
    await mapboxRTLload();
  }

  /**
   * Set language in layers
   */
  for (const layer of layers) {
    const layerExists =
      getLayerNamesByPrefix({
        id: o.id,
        prefix: layer,
      }).length > 0;

    if (layerExists) {
      map.setLayoutProperty(layer, "text-field", [
        "coalesce",
        ["get", `name_${lang}`],
        ["get", `name_${lang2}`],
        ["get", `name_${defaultLang}`],
        ["get", "name"],
      ]);
    }
  }
  return true;
}

/**
 * Get dict id by name + language
 */
export async function getDictItemId(txt, language) {
  language = language || getLanguageCurrent();
  const dict = await getDict(language);
  const reg = new RegExp("^" + txt);
  const res = dict.find((d) => {
    return d[language].match(reg) || d.en.match(reg);
  });
  if (res && res?.id) {
    return res.id;
  }
}

/**
 * Load LTR plugin for mapbox gl
 * @return {Promise<boolean>} success
 */
let rtlLoaded = false;
async function mapboxRTLload() {
  if (rtlLoaded) {
    return true;
  }

  return new Promise((resolve, reject) => {
    try {
      mapboxgl.setRTLTextPlugin(
        "https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js",
        (err) => {
          if (err) {
            reject(err);
          } else {
            rtlLoaded = true;
            resolve(true);
          }
        },
        false,
      );
    } catch (e) {
      reject(e);
    }
  });
}
