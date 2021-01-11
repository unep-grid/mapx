/**
 * Update language : Elements, view list and map
 */
export async function updateLanguage(language) {
  if(language){
    mx.settings.language = language;
  }
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

export function splitnwords(str) {
  return str
    .split(/((?:\w+ ){6})/g)
    .filter(Boolean)
    .join('\n');
}

export function getDict(lang) {
  'use strict';
  lang = lang || mx.settings.language || 'en';
  var out;

  switch (lang) {
    case 'en':
      out = import('../data/dict_built/dict_en.json');
      break;
    case 'fr':
      out = import('../data/dict_built/dict_fr.json');
      break;
    case 'es':
      out = import('../data/dict_built/dict_es.json');
      break;
    case 'de':
      out = import('../data/dict_built/dict_de.json');
      break;
    case 'ru':
      out = import('../data/dict_built/dict_ru.json');
      break;
    case 'fa':
      out = import('../data/dict_built/dict_fa.json');
      break;
    case 'ps':
      out = import('../data/dict_built/dict_ps.json');
      break;
    case 'bn':
      out = import('../data/dict_built/dict_bn.json');
      break;
    case 'zh':
      out = import('../data/dict_built/dict_zh.json');
      break;
    default:
      out = import('../data/dict_built/dict_en.json');
      break;
  }
  return out.then((m) => {
    return m.default;
  });
}

/** Translate text, tooltype or placeholder in element based on "[data-lang_key]" id and a json key-value pair dictionnary
 * @param {Object} o
 * @param {Element} o.el Target element. If omitted, the whole document will be translated.
 * @param {String} o.lang Language code. e.g. "en" or "fr".
 */
export async function updateLanguageElements(o) {
  o = Object.assign({}, o);
  const h = mx.helpers;
  let langDefault = 'en';
  o.lang = o.lang || mx.settings.language || langDefault;
  let els, el, doc, label, found, type, id;
  let i, iL, j, jL;
  let changes = [];
  const dict = await getDict(o.lang);
  const lang = o.lang;

  // if no el to look at, serach the whole document
  doc = h.isElement(o.el) ? o.el : document;

  // fetch all elements with data-lang_key attr
  els = doc.querySelectorAll('[data-lang_key]');
 
  for (i = 0, iL = els.length; i < iL; i++) {
    el = els[i];
    type = el.dataset.lang_type;
    id = el.dataset.lang_key;
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
 * Create a tag and set translation item in it
 * @param {String} keys Key to look for in the dictionnary
 * @param {String} lang  Two letters language code
 * @return {Element} span element with dataset-lang_key
 */
export async function getTranslationTag(key, lang) {
  const el = mx.helpers.el('span', {
    dataset: {
      lang_key: key
    }
  });

  const item = await getDictItem(key, lang);
  el.innerText = item;
  return el;
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
  const h = mx.helpers;
  const defaultLang = 'en';
  o.lang = o.lang ? o.lang : mx.settings.language || defaultLang;
  o.sep = o.sep ? o.sep : '.';
  o.path = o.path ? o.path + o.sep : '';
  const defaultValue = o.defaultValue || '';
  const langs = mx.settings.languages;
  let out = h.path(o.obj, o.path + o.lang, null);

  if (!out) {
    /**
     * Try default language
     */
    out = h.path(o.obj, o.path + defaultLang, null);
  }

  if (!out) {
    /**
     * Try alternative language
     */
    out = langs.reduce((a, l) => {
      if (!a) {
        return h.path(o.obj, o.path + l, null);
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
 * @param {object} o options
 * @param {object} o.obj object to check
 * @param {string} o.path path to the string to check
 * @param {string} o.language language code expected
 * @param {array} o.languages code for fallback
 * @param {boolean} o.concat concat language with path instead of select children
 * @example
 *     checkLanguage({
 *         obj : it,
 *         path : "data.title",
 *         language : "fr",
 *         languages :  ["en","de","ru"]
 *     })
 */
export function checkLanguage(o) {
  'use strict';
  const langs = o.languages || mx.settings.languages;
  const concat = !!o.concat;
  let lang = o.language || mx.settings.language || langs[0];
  let out = lang;
  let found = false;

  /**
   * Test if lang value return something
   */
  function test() {
    var p = concat ? o.path + lang : o.path + '.' + lang;
    found = !!mx.helpers.path(o.obj, p);
  }

  /**
   * Initial language test
   */
  test();

  /**
   * If nothing found, iterrate through languages
   */
  if (!found) {
    for (var l in langs) {
      lang = langs[l];
      test();
      if (found) {
        return lang;
      }
    }
  }

  return out;
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
  var h = mx.helpers;
  var lang = checkLanguage(o);
  var out = h.path(o.obj, o.path + '.' + lang, '');
  return out;
}

export function updateLanguageViewsList(o) {
  o = Object.assign({}, o);
  const h = mx.helpers;
  const lang = o.lang || mx.settings.language;
  const views = h.getViews();
  const isModeStatic = h.path(mx, 'settings.mode.static') === true;

  if (isModeStatic) {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
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
        const legendTitle = h.getLabelFromObjectPath({
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
        elTitle.innerHTML = h.getLabelFromObjectPath({
          lang: lang,
          obj: view,
          path: 'data.title'
        });
      }

      /**
       * Update view description
       */
      if (elText) {
        elText.innerHTML = h.getLabelFromObjectPath({
          lang: lang,
          obj: view,
          path: 'data.abstract'
        });
      }
    });
    resolve(true);
  }).catch((e) => {
    console.error(e);
    return false;
  });
}

/**
 * Set or Update language of a layer, based on text-field attribute.
 * @param {object} o Options
 * @param {string} o.mapId Map id
 * @param {string} [o.language='en'] Two letter language code
 */
export function updateLanguageMap(o) {
  o = Object.assign({}, o);
  return new Promise((resolve) => {
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
            ['get', 'name']
          ]);
        }
      }
      resolve(true);
    }
  });
}
