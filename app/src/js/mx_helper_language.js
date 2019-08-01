/**
 * Update language : Element, view list and map
 * @param {Object} o Options
 * @param {String} o.id Map id
 * @param {String} o.lang Language code
 */
export function updateLanguage(o) {
  o.id = 'map_main';
  o.lang = o.lang || mx.settings.language || 'en';
  mx.settings.language = o.lang;

  // Set language for the document
  document.querySelector('html').setAttribute('lang', o.lang);

  //updateButtons(o);
  updateLanguageElements(o);
  updateLanguageViewsList(o);
  updateLanguageMap(o);
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
      out = import('../built/dict_en.json');
      break;
    case 'fr':
      out = import('../built/dict_fr.json');
      break;
    case 'es':
      out = import('../built/dict_es.json');
      break;
    case 'de':
      out = import('../built/dict_de.json');
      break;
    case 'ru':
      out = import('../built/dict_ru.json');
      break;
    case 'fa':
      out = import('../built/dict_fa.json');
      break;
    case 'ps':
      out = import('../built/dict_ps.json');
      break;
    case 'bn':
      out = import('../built/dict_bn.json');
      break;
    case 'zh':
      out = import('../built/dict_zh.json');
      break;
    default:
      out = import('../built/dict_en.json');
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
export function updateLanguageElements(o) {
  const h = mx.helpers;
  o = o || {};
  o.lang = o.lang || mx.settings.language || 'en';
  var langDefault = 'en';

  getDict(o.lang).then(function(dict) {
    var els, el, doc, label, found;
    var lang = o.lang;

    // custom buttons
    var elBtnLanguage = document.querySelector('#btnShowLanguage');
    if (elBtnLanguage) {
      elBtnLanguage.dataset.lang_key = o.lang;
    }

    // set value selector

    var setValue = {
      tooltip: function(el) {
        if (el.dataset.lang_split) {
          label = splitnwords(label);
        }
        el.setAttribute('aria-label', label);
        if (el.className.indexOf('hint--') === -1) {
          el.className += ' hint--left';
        }
      },
      placeholder: function(el) {
        el.setAttribute('placeholder', label);
      },
      text: function(el) {
        el.innerHTML = label;
      }
    };

    // if no el to look at, serach the whole document
    doc = h.isElement(o.el) ? o.el : document;

    // fetch all elements with data-lang_key attr
    els = doc.querySelectorAll('[data-lang_key]');
    for (var i = 0; i < els.length; i++) {
      el = els[i];

      if (h.isElement(el)) {
        var type = el.dataset.lang_type;
        var id = el.dataset.lang_key;

        /*
         * NOTE: BUG IN SAFARI : sometimes, dataset is not returning correctly
         */
        if (!type) {
          type = el.getAttribute('data-lang_type');
        }

        // Default is text. Maybe not the most clever default.
        if (!type) {
          type = 'text';
        }

        found = false;
        label = '';

        for (var j = 0; j < dict.length; j++) {
          if (!found) {
            if (dict[j].id === id) {
              found = true;
              label = dict[j][lang];
              if (!label) {
                // if label no in dict, take the default
                label = dict[j][langDefault];
              }
            }
          }
        }
        /*
         * Fallback
         */
        if (!label) {
          if (el.innerText) {
            label = el.innerText;
          } else {
            label = id;
          }
        }
        setValue[type](el);
      }
    }
  });
}

/**
 * Get value from the dictionary for a given key and language. Fallback to "def"
 * @param {string} keys Key to look for in the dictionnary
 * @param {string} lang  Two letters language code
 */
export function getDictItem(key, lang) {
  'use strict';
  var keys = [];
  var res = [];
  var defaultLang = 'en';
  var isArray = key instanceof Array;
  lang = lang || mx.settings.language || defaultLang;

  return getDict(lang).then(function(dict) {
    if (!(dict instanceof Array)) {
      dict = mx.helpers.objectToArray(dict);
    }

    if (isArray) {
      keys = key;
    } else {
      keys = keys.concat(key);
    }

    keys.forEach(function(k) {
      var item = dict.find(function(a) {
        return a.id === k;
      });

      var out = item ? item[lang] || item[defaultLang] : k;
      res.push(out);
    });

    res = isArray ? res : res[0];
    return res;
  });
}

/**
 * Create a tag and set translation item in it
 * @param {String} keys Key to look for in the dictionnary
 * @param {String} lang  Two letters language code
 * @return {Element} span element with dataset-lang_key
 */
export function getTranslationTag(key, lang) {
  var el = mx.helpers.el('span', {
    dataset: {
      lang_key: key
    }
  });

  getDictItem(key, lang).then((item) => (el.innerText = item));

  return el;
}

/**
 * Get label value from an object path.
 * @param {Object} o Options
 * @param {string} o.lang Selected language two letter code. Default = mx.settings.language
 * @param {Any} o.default Default value
 * @param {Object} o.obj Object containing the value
 * @param {String} o.path Path to the value container. Eg. "data.title"
 */
export function getLabelFromObjectPath(o) {
  'use strict';
  o.lang = o.lang ? o.lang : mx.settings.language;
  o.path = o.path ? o.path + '.' : '';
  var defaultValue = o.default || '[ NA ]';
  var out = mx.helpers.path(o.obj, o.path + o.lang);

  if (!out) {
    out = mx.helpers.path(o.obj, o.path + 'en');
  }

  if (!out) {
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
  var langs = o.languages || mx.settings.languages;
  var lang = o.language || mx.settings.language || langs[0];
  var concat = !!o.concat;
  var out = lang;
  var found = false;

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
  var h = mx.helpers;
  var lang = checkLanguage(o);
  var out = h.path(o.obj, o.path + '.' + lang, '');
  return out;
}

export function updateLanguageViewsList(o) {
  var elsViews = document.getElementsByClassName('mx-view-item');

  if (!mx.maps || !mx.maps[o.id]) {
    return;
  }

  var views = mx.maps[o.id].views;
  var lang = o.lang || mx.settings.language;

  mx.helpers.forEachEl({
    els: elsViews,
    callback: function(el) {
      var id = el.dataset.view_id;
      var v = views.find(function(v) {
        return v.id === id;
      });
      var elTitle = el.querySelector('.mx-view-tgl-title');
      var elText = el.querySelector('.mx-view-item-desc');
      var elLegend = el.querySelector('.mx-view-item-legend-vt');

      if (elLegend) {
        elLegend.innerHTML = mx.templates.viewListLegend(v);
      }

      if (elTitle) {
        elTitle.innerHTML = mx.helpers.getLabelFromObjectPath({
          lang: lang,
          obj: v,
          path: 'data.title'
        });
      }
      if (elText) {
        elText.innerHTML = mx.helpers.getLabelFromObjectPath({
          lang: lang,
          obj: v,
          path: 'data.abstract'
        });
      }
    }
  });
}

/**
 * Set or Update language of a layer, based on text-field attribute.
 * @param {object} o Options
 * @param {string} o.mapId Map id
 * @param {string} [o.language='en'] Two letter language code
 */
export function updateLanguageMap(o) {
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
    'water-label',
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
        map.setLayoutProperty(layer, 'text-field', '{name_' + o.language + '}');
      }
    }
  }
}
