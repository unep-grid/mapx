import {el} from '@fxi/el';
import {getDictItem} from './../mx_helper_language.js';
import * as test from './../is_test_mapx/index.js';
export {el, elAuto, elPanel, elButtonIcon, elSpanTranslate};

function elAuto(render, data, opt) {
  opt = opt || {};

  var def = {
    render: 'auto',
    tableHeadersSkip: false,
    tableHeadersClasses: [],
    tableHeadersLabels: [],
    tableTitle: 'Table',
    tableTitleAsLanguageKey: false,
    tableClass: ['table'],
    tableContainerHeaderClass: ['panel-heading'],
    tableContainerClass: ['panel', 'panel-default'],
    booleanValues: [true, false],
    stringStyle: {paddingRight: '5px'},
    numberStyle: {float: 'right'},
    dateStyle: {float: 'right'},
    langKeyPrefix: '',
    stringAsLanguageKey: false,
    urlDefaultLabel: 'Link'
  };

  /*
   * Import keys from opt
   */
  Object.assign(def, opt);
  /*
   * Import keys from def
   */
  Object.assign(opt, def);

  const r = {
    auto: renderAuto,
    string: renderString,
    date: renderDate,
    boolean: renderBoolean,
    array_auto: renderArrayAuto,
    array_table: renderArrayTable,
    array_string: renderArrayString
  };
  var elRendered = (r[render || opt.render] || console.log)(data);

  return elRendered;

  /**
   * renderer
   */
  function renderAuto(x) {
    if (test.isElement(x)) {
      return x;
    }
    if (test.isDateString(x)) {
      return renderDate(x);
    }
    if (test.isUrl(x)) {
      return renderUrl(x);
    }
    if (test.isString(x)) {
      return renderString(x);
    }
    if (test.isNumeric(x)) {
      return renderNumeric(x);
    }
    if (test.isBoolean(x)) {
      return renderBoolean(x);
    }
    if (test.isLanguageObject(x)) {
      return renderStringLanguage(x);
    }
    if (test.isLanguageObjectArray(x)) {
      return renderStringLanguageArray(x);
    }
    if (test.isTable(x)) {
      return renderArrayTable(x);
    }
    if (test.isArray(x)) {
      return renderArrayAuto(x);
    }
  }

  function renderNumeric(x) {
    return el('span', {style: opt.numberStyle}, x + '');
  }
  function renderBoolean(x) {
    var str = x === true ? opt.booleanValues[0] : opt.booleanValues[1];
    return renderString(str + '');
  }
  function renderStringLanguage(obj) {
    var lang = mx.settings.language;
    var langs = mx.settings.languages;
    var str = obj[lang] || obj[langs.filter((l) => obj[l])[0]];
    return renderString(str, false);
  }
  function renderStringLanguageArray(arr) {
    return el(
      'ul',
      arr.map((d) => {
        return el('li', renderStringLanguage(d));
      })
    );
  }
  function renderDate(date) {
    var dateDefault = '0001-01-01';
    if (date === dateDefault) {
      return renderString('-');
    }

    return el('span', {style: opt.dateStyle}, new Date(date).toDateString());
  }
  function renderUrl(url, label) {
    label = label || opt.urlDefaultLabel;

    return el(
      'a',
      {
        target: '_blank',
        href: url
      },
      label
    );
  }
  function renderString(str, asLanguageKey) {
    asLanguageKey = test.isBoolean(asLanguageKey)
      ? asLanguageKey
      : opt.stringAsLanguageKey;

    str = asLanguageKey ? opt.langKeyPrefix + str : str;
    return el(
      'span',
      {
        style: opt.stringStyle,
        dataset: asLanguageKey
          ? {
              lang_key: str
            }
          : {}
      },
      str + ''
    );
  }
  function renderArrayString(arr) {
    return el(
      'div',
      arr.map((str) => {
        return renderString(str);
      })
    );
  }
  function renderArrayAuto(arr) {
    return el(
      'div',
      arr.map((x) => {
        return renderAuto(x);
      })
    );
  }
  function renderArrayTable(array) {
    var hLabels = opt.tableHeadersLabels || [];
    var hClasses = opt.tableHeadersClasses || [];
    var tTitle = opt.tableTitle || '';
    var hSkip = opt.tableHeadersSkip === true;

    var firstRow = array[0];
    if (typeof firstRow === 'undefined') {
      return el('table');
    }
    var labels = Object.keys(array[0]);
    if (labels.length === 0) {
      return el('table');
    }

    const elTable = el(
      'table',
      {
        class: opt.tableClass
      },
      makeHeaders(),
      makeBody()
    );

    return elPanel({
      classHeader: opt.tableContainerHeaderClass,
      classContainer: opt.tableContainerClass,
      title: renderString(tTitle, opt.tableTitleAsLanguageKey),
      content: elTable
    });

    /**
     * Table parts
     */
    function makeHeaders() {
      if (!hSkip) {
        return el(
          'thead',
          el(
            'tr',
            labels.map((l, i) => {
              l = hLabels[i] || l;
              return el(
                'th',
                {
                  class: hClasses[i],
                  scope: 'col',
                  dataset: {
                    lang_key: l
                  }
                },
                l
              );
            })
          )
        );
      }
    }

    function makeBody() {
      return el(
        'tbody',
        array.map((row) => {
          return el(
            'tr',
            labels.map((l) => {
              return el('td', renderAuto(row[l]));
            })
          );
        })
      );
    }
  }
}

function elPanel(opt) {
  opt = Object.assign(
    {},
    {
      classHeader: ['panel-heading'],
      classContainer: ['panel', 'panel-default'],
      content: null,
      title: null
    },
    opt
  );

  return el(
    'div',
    {
      class: opt.classContainer
    },
    el(
      'div',
      {
        class: opt.classHeader
      },
      opt.title
    ),
    opt.content
  );
}

/**
 * Create a tag and set translation item in it
 * @param {String} keys Key to look for in the dictionnary
 * @param {String} lang  Two letters language code
 * @return {Element} span element with dataset-lang_key
 */
function elSpanTranslate(key, lang) {
  return el(
    'span',
    {
      dataset: {
        lang_key: key
      }
    },
    getDictItem(key, lang)
  );
}

/**
 * Create a standard button with icon
 * @param {String} key Translation key
 * @param {Object} opt options
 * @param {Array} opt.classes Additional button classes
 * @param {String} opt.icon Icon class
 * @param {String} opt.mode Mode : text_icon, icon, text
 * @param {Object} opt.dataset Button dataset
 * @param {Object} opt.style Additional style
 * @param {String} opt.badgeContent Value to show in badge
 * @param {Element} opt.content Additinal content
 */
function elButtonIcon(key, opt) {
  opt = Object.assign(
    {},
    {
      mode: 'text_icon',
      classes: [],
      icon: null,
      dataset: {},
      badgeContent: null,
      style : null,
      content : null
    },
    opt
  );

  const addIcon = opt.mode === 'text_icon' || opt.mode === 'icon';
  const addText = opt.mode === 'text_icon' || opt.mode === 'text';
  const addBadge = !!opt.badgeContent; 
  const addContent = !!opt.content;

  if (addIcon && !addText) {
    opt.dataset.lang_type = 'tooltip';
    opt.classes.push('hint--bottom');
    opt.dataset.lang_key = opt.key;
  }

  const elBtn = el(
    'button',
    {
      type: 'button',
      class: ['btn', 'btn-default', 'btn-icon', ...opt.classes],
      dataset: opt.dataset,
      style : opt.style
    },
    [
      addBadge ? el('span', {class: ['badge']}, `${opt.badgeContent}`) : false,
      addText ? elSpanTranslate(key) : false,
      addIcon ? el('i', {class: ['fa', opt.icon]}) : false,
      addContent ? opt.content : false
    ]
  );

  if (!addText) {
    getDictItem(key).then((txt) => {
      elBtn.setAttribute('aria-label', txt);
    });
  }
  return elBtn;
}
