/* jshint esversion:6 */
import {buel} from 'buel';

export function el(type, ...opt) {
  return buel(type, ...opt);
}

export function elAuto(render, data, opt) {
  opt = opt || {};

  var def = {
    render: 'auto',
    tableHeadersSkip: false,
    tableHeadersClasses: [],
    tableHeadersLabels: [],
    tableTitle: 'Table',
    tableTitleAsLanguageKey: false,
    tableClass : ['table'],
    tableContainerHeaderClass : ['panel-heading'],
    tableContainerClass : ['panel', 'panel-default'],
    booleanValues: [true, false],
    stringStyle: {paddingRight: '5px'},
    numberStyle: {float: 'right'},
    dateStyle: {float: 'right'},
    langKeyPrefix: '',
    stringAsLanguageKey: false
  };

  /*
   * Import keys from opt
   */
  Object.assign(def, opt);
  /*
   * Import keys from def
   */
  Object.assign(opt, def);

  const h = mx.helpers;
  const el = h.el;
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
    if (h.isElement(x)) {
      return x;
    }
    if (h.isDateString(x)) {
      return renderDate(x);
    }
    if (h.isString(x)) {
      return renderString(x);
    }
    if (h.isNumeric(x)) {
      return renderNumeric(x);
    }
    if (h.isBoolean(x)) {
      return renderBoolean(x);
    }
    if (h.isLanguageObject(x)) {
      return renderStringLanguage(x);
    }
    if (h.isLanguageObjectArray(x)) {
      return renderStringLanguageArray(x);
    }
    if (h.isTable(x)) {
      return renderArrayTable(x);
    }
    /* if (h.isObject(x)) {*/
    //return renderList(x);
    /*}*/
    if (h.isArray(x)) {
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
  function renderString(str, asLanguageKey) {
    asLanguageKey = h.isBoolean(asLanguageKey)
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
    var elTable = el(
      'div',
      {
        class: opt.tableContainerClass
      },
      el(
        'div',
        {
          class: opt.tableContainerHeaderClass
        },
        renderString(tTitle, opt.tableTitleAsLanguageKey)
      ),
      el(
        'table',
        {
          class: opt.tableClass
        },
        makeHeaders(),
        makeBody()
      )
    );

    return elTable;

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
