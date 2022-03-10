import {isElement, isStringRange, isNotEmpty} from './is_test';
import {path, parseTemplate} from './mx_helper_misc.js';
import {getViews} from './mx_helper_map.js';

/**
 * Update language : Elements, view list and map
 * @param {String} Language code
 */
export async function updateLanguage(language) {
  const validLang = isStringRange(language, 2, 2);

  if (!validLang) {
    language = mx.settings.language || 'en';
  }

  mx.settings.language = language;
  const lang = mx.settings.language;

  /**
   * Fire language_change
   */
  mx.events.fire({
    type: 'language_change',
    data: {
      new_language: lang
    }
  });

  /*
   * Set language for the document
   */
  document.querySelector('html').setAttribute('lang', lang);

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
    .join('\n');
}

/**
 * Get Full dictionnary for a language
 * @param {String} lang Language code (e.g. 'en')
 * @return {Promise<Object>} Full dictionnary object
 */
const _dict_cache = {};
export async function getDict(lang) {
  'use strict';
  lang = lang || mx.settings.language || 'en';
  var out;

  if (_dict_cache[lang]) {
    return _dict_cache[lang];
  }

  switch (lang) {
    case 'en':
      out = await import('../data/dict/_built/dict_en.json');
      break;
    case 'fr':
      out = await import('../data/dict/_built/dict_fr.json');
      break;
    case 'es':
      out = await import('../data/dict/_built/dict_es.json');
      break;
    case 'de':
      out = await import('../data/dict/_built/dict_de.json');
      break;
    case 'ru':
      out = await import('../data/dict/_built/dict_ru.json');
      break;
    case 'fa':
      out = await import('../data/dict/_built/dict_fa.json');
      break;
    case 'ps':
      out = await import('../data/dict/_built/dict_ps.json');
      break;
    case 'bn':
      out = await import('../data/dict/_built/dict_bn.json');
      break;
    case 'zh':
      out = await import('../data/dict/_built/dict_zh.json');
      break;
    case 'ar':
      out = await import('../data/dict/_built/dict_ar.json');
      break;
    default:
      out = await import('../data/dict/_built/dict_en.json');
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
  let langDefault = 'en';
  o.lang = o.lang || mx.settings.language || langDefault;
  let els, el, doc, label, found, type, id, data;
  let i, iL, j, jL;
  let changes = [];
  const dict = await getDict(o.lang);
  const lang = o.lang;

  // if no el to look at, serach the whole document
  doc = isElement(o.el) ? o.el : document;

  // fetch all elements with data-lang_key attr
  els = doc.querySelectorAll('[data-lang_key]');

  for (i = 0, iL = els.length; i < iL; i++) {
    el = els[i];
    type = el.dataset.lang_type;
    id = el.dataset.lang_key;
    data = el.dataset.lang_data;
    found = false;
    label = '';

    /*
     * NOTE: BUG IN SAFARI : sometimes, dataset is not returning correctly
     */
    if (!type) {
      type = el.getAttribute('data-lang_type');
    }

    /*
     * Default is text : inner text will be updated
     */
    if (!type) {
      type = 'text';
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
  changes.forEach((c) => {
    setValue(c[0], c[1], c[2]);
  });

  /**
   * Helpers
   */
  function setValue(type, el, label) {
    if (!label) {
      return;
    }
    if (type === 'title') {
      el.setAttribute('title', label);
      return;
    }
    if (type === 'tooltip') {
      if (el.dataset.lang_split) {
        label = splitnwords(label);
      }
      el.setAttribute('aria-label', label);
      if (el.className.indexOf('hint--') === -1) {
        el.className += ' hint--left';
      }
      return;
    }

    if (type === 'placeholder') {
      el.setAttribute('placeholder', label);
      return;
    }
    el.innerText = label;
  }
}

/**
 * Get value from the dictionary for a given key and language. Fallback to "def"
 * @param {string} keys Key to look for in the dictionnary
 * @param {string} lang  Two letters language code
 */
export async function getDictItem(key, lang) {
  'use strict';
  let keys = [];
  let defaultLang = 'en';
  let isArray = key instanceof Array;
  lang = lang || mx.settings.language || defaultLang;

  let dict = await getDict(lang);

  if (!(dict instanceof Array)) {
    dict = mx.helpers.objectToArray(dict);
  }

  if (isArray) {
    keys = key;
  } else {
    keys = keys.concat(key);
  }

  let res = keys.reduce((a, k) => {
    const item = dict.find((a) => {
      return a.id === k;
    });
    const out = item ? item[lang] || item[defaultLang] : k;
    a.push(out);
    return a;
  }, []);

  res = isArray ? res : res[0];
  return res;
}

/**
 * Get template from dict and use an object to replace {{<key>}} parts
 * @param {String} key Dict key
 * @param {Object} data Object to use for remplacement
 * @param  {String} lang Two letters language
 * @return {String} Parsed template string
 */
export async function getDictTemplate(key, data, lang) {
  const template = await getDictItem(key, lang);
  return template.replace(/{{([^{}]+)}}/g, (_, key) => {
    return data[key];
  });
}

/**
 * Get label value from an object path.
 * @param {Object} o Options
 * @param {string} o.lang Selected language two letter code. Default = mx.settings.language
 * @param {Any} o.defaultValue Default value
 * @param {Object} o.obj Object containing the value
 * @param {String} o.path Path to the value container. Eg. "data.title"
 */
export function getLabelFromObjectPath(o) {
  'use strict';
  const defaultLang = 'en';
  o.lang = o.lang ? o.lang : mx.settings.language || defaultLang;
  o.sep = o.sep ? o.sep : '.';
  o.path = o.path ? o.path + o.sep : '';
  const defaultValue = o.defaultValue || '';
  const langs = mx.settings.languages;
  let out = path(o.obj, o.path + o.lang, null);

  if (!out) {
    /**
     * Try default language
     */
    out = path(o.obj, o.path + defaultLang, null);
  }

  if (!out) {
    /**
     * Try alternative language
     */
    out = langs.reduce((a, l) => {
      if (!a) {
        return path(o.obj, o.path + l, null);
      } else {
        return a;
      }
    }, null);
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
 * @example
 *     checkLanguage({
 *         obj : it,
 *         path : "data.title",
 *         language : "fr",
 *         languages :  ["en","de","ru"]
 *     })
 */
export function checkLanguage(opt) {
  const h = mx.helpers;
  const s = mx.settings;
  const def = {
    obj: {},
    path: '',
    languages: s.languages,
    language: s.language || s.languages[0],
    prefix: null
  };

  const o = Object.assign({}, def, opt);
  const langs = [o.language, ...o.languages];

  for (const lang of langs) {
    const notEmpty = !!path(o.obj, o.path, o.prefix + lang);
    if (notEmpty) {
      return lang;
    }
  }
  return def.language;
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
  const out = path(o.obj, o.path + '.' + lang, '');
  return out;
}

/**
 * Get language from language object
 * NOTE Simple version of `getTranslationFromObject`, without path
 * @param {Object} obj Language object
 * @param {String} lang Language code
 * @return {String} item
 */
export function getLanguageItem(obj, lang) {
  lang = checkLanguage({
    obj,
    language: lang
  });
  return obj[lang];
}

/**
 * Update language views list
 * @param {Object} o options
 * @param {String} o.lang Language
 */
export async function updateLanguageViewsList(o) {
  o = Object.assign({}, o);
  const lang = o.lang || mx.settings.language;
  const views = getViews();
  const isModeStatic = path(mx, 'settings.mode.static') === true;

  try {
    if (isModeStatic) {
      return false;
    }

    views.forEach((view) => {
      const elTitle = view._el.querySelector('.mx-view-tgl-title');
      const elText = view._el.querySelector('.mx-view-item-desc');
      const elLegendVt = view._el.querySelector('.mx-view-legend-vt');
      const elLegendRtTitle = view._el.querySelector('.mx-legend-rt-title');

      /**
       * Regenerate vt legend
       */
      if (elLegendVt) {
        elLegendVt.innerHTML = mx.templates.viewListLegend(view);
      }

      /**
       * Update rt legend text only
       */
      if (elLegendRtTitle) {
        const legendTitle = getLabelFromObjectPath({
          lang: lang,
          obj: view,
          path: 'data.source.legendTitles',
          defaultValue: null
        });
        if (legendTitle) {
          elLegendRtTitle.innerText = legendTitle;
          elLegendRtTitle.setAttribute('title', legendTitle);
        }
      }

      /**
       * Update view title
       */
      if (elTitle) {
        elTitle.innerHTML = getLabelFromObjectPath({
          lang: lang,
          obj: view,
          path: 'data.title'
        });
      }

      /**
       * Update view description
       */
      if (elText) {
        elText.innerHTML = getLabelFromObjectPath({
          lang: lang,
          obj: view,
          path: 'data.abstract'
        });
      }
    });
  } catch (e) {
    console.warn('updateLanguageViewsList error', e.message);
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
  o = Object.assign({}, o);
  var map = mx.helpers.getMap(o.id);
  if (!mx.helpers.isMap(map)) {
    return;
  }
  var mapLang = ['en', 'es', 'fr', 'de', 'ru', 'zh', 'pt', 'ar'];
  var defaultLang = 'en';
  var layers = [
    'place-label-city',
    'place-label-capital',
    'country-label',
    'water-label-line',
    'water-label-point',
    'poi-label'
  ];

  if (map) {
    if (!o.language || mapLang.indexOf(o.language) === -1) {
      o.language = mx.settings.language;
    }

    if (!o.language) {
      o.language = defaultLang;
    }

    /*
     * set default to english for the map layers if not in language set
     */
    if (mapLang.indexOf(o.language) === -1) {
      o.language = defaultLang;
    }

    /**
     * Set language in layers
     */
    for (var i = 0; i < layers.length; i++) {
      var layer = layers[i];
      var layerExists =
        mx.helpers.getLayerNamesByPrefix({
          id: o.id,
          prefix: layer
        }).length > 0;

      if (layerExists) {
        map.setLayoutProperty(layer, 'text-field', [
          'coalesce',
          ['get', `name_${o.language}`],
          ['get', 'name_en']
        ]);
      }
    }
    return true;
  }
}

/**
 * Get dict id by name + language
 */

export async function getDictItemId(txt, language) {
  language = language || mx.settings.language || 'en';
  const dict = await getDict(language);
  const reg = new RegExp('^' + txt);
  const res = dict.find((d) => {
    return d[language].match(reg) || d.en.match(reg);
  });
  if (res && res?.id) {
    return res.id;
  }
}
