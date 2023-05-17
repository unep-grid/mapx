import { el, svg } from "./../el/src/index.js";
import {
  getDictItem,
  getLanguageCurrent,
  getLanguagesAll,
} from "./../language";
import * as test from "./../is_test_mapx/index.js";
import { parseTemplate } from "../mx_helper_misc.js";
import { isNotEmpty } from "./../is_test_mapx/index.js";

export { el, svg, elAuto, elPanel, elButtonIcon, elSpanTranslate };

/**
 * MapX "components"
 */

/**
 * Auto renderer : table,array, string, boolean,...
 * @param {String} render Renderer type : auto, string, date, boolean, array_auto, arra_table, array_string
 * @param {Object} data Data/content to render. element, string, date, etc..
 * @param {Object} opt Options additional options.
 * @param {String} opt.render Renderer (alternative)
 * @param {Boolean} opt.tableHeadersSkip No header in table
 * @param {Array} opt.tableHeadersClasses Table array of classes for headers
 * @param {Array} opt.tableHeadersLabels Table array of labels
 * @param {String} opt.tableTitle Table title
 * @param {Boolean} opt.tableTitleAsLanguageKey Use table title as language key (attempt to translate)
 * @param {Array} opt.tableClass Table array of classes
 * @param {Array} opt.tableContainerHeaderClass Table container header array of claseses
 * @param {Array} opt.tableContainerClass Table container array of classes
 * @param {Array} opt.booleanValues Array of boolean values e.g. ["yes","no"], ["☑","✖️"]
 * @param {Object} opt.stringStyle Object for string style. e.g. {float:'right'}
 * @param {Object} opt.numberStyle Object for nuemeric style e.g. {margin:'3px'}
 * @param {Object} opt.dateStyle Object for date style. e.g. {background:'red'}
 * @param {String} opt.langKeyPrefix Language prefix for translation ['open','close'] + prefix 'btn_' -> 'btn_open', 'btn_close'
 * @param {Boolean} opt.stringAsLanguageKey Use string as language key
 * @param {String} opt.urlDefaultLabel Defaut label for links. e.g. "[ link ]"
 * @param {String} opt.urlDefaultTitle Defaut title for links. e.g. "[ homepage ]"
 */

function elAuto(render, data, opt) {
  opt = opt || {};

  const def = {
    render: "auto",
    tableHeadersSkip: false,
    tableHeadersClasses: [],
    tableHeadersLabels: [],
    tableTitle: "Table",
    tableTitleAsLanguageKey: false,
    tableClass: ["table"],
    tableContainerHeaderClass: ["panel-heading"],
    tableContainerClass: ["panel", "panel-default"],
    booleanValues: [true, false],
    stringStyle: { marginRight: "5px" },
    numberStyle: { float: "right" },
    dateStyle: { float: "right" },
    langKeyPrefix: "",
    stringAsLanguageKey: false,
    urlDefaultLabel: "Link",
    urlDefaultTitle: "",
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
    url: renderUrl,
    array_auto: renderArrayAuto,
    array_table: renderArrayTable,
    array_string: renderArrayString,
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
    if (test.isEmail(x)) {
      return renderEmail(x);
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
    if (test.isArrayOf(x, test.isElement)) {
      return renderArrayElement(x);
    }
    if (test.isArray(x)) {
      return renderArrayAuto(x);
    }
  }

  function renderNumeric(x) {
    return el("span", { style: opt.numberStyle }, x + "");
  }
  function renderBoolean(x) {
    var str = x === true ? opt.booleanValues[0] : opt.booleanValues[1];
    return renderString(str + "");
  }
  function renderStringLanguage(obj) {
    const lang = getLanguageCurrent();
    const langs = getLanguagesAll();
    const str = obj[lang] || obj[langs.filter((l) => obj[l])[0]];
    return renderString(str, false);
  }
  function renderStringLanguageArray(arr) {
    return el(
      "ul",
      {
        style: {
          maxHeight: "200px",
          overflow: "auto",
        },
      },
      arr.map((d) => {
        return el("li", renderStringLanguage(d));
      })
    );
  }
  function renderArrayElement(arr) {
    return el(
      "ul",
      {
        style: {
          maxHeight: "200px",
          overflow: "auto",
        },
      },
      arr.map((d) => {
        return el("li", d);
      })
    );
  }
  function renderDate(date) {
    var dateDefault = "0001-01-01";
    if (date === dateDefault) {
      return renderString("-");
    }

    return el("span", { style: opt.dateStyle }, new Date(date).toDateString());
  }
  function renderUrl(url, label, title) {
    label = label || opt.urlDefaultLabel;
    title = title || opt.urlDefaultTitle;

    return el(
      "a",
      {
        target: "_blank",
        href: url,
        "aria-label": title,
        class: ["hint--left"],
      },
      label
    );
  }
  function renderEmail(email) {
    return el(
      "a",
      {
        target: "_blank",
        href: `mailto:${email}`,
        style: {
          maxWidth: "100%",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        },
      },
      email
    );
  }
  function renderString(str, asLanguageKey) {
    asLanguageKey = test.isBoolean(asLanguageKey)
      ? asLanguageKey
      : opt.stringAsLanguageKey;

    str = asLanguageKey ? opt.langKeyPrefix + str : str;
    return el(
      "span",
      {
        style: opt.stringStyle,
        dataset: asLanguageKey
          ? {
              lang_key: str,
            }
          : {},
      },
      str + ""
    );
  }
  function renderArrayString(arr) {
    return el("div", arr.map(renderString));
  }
  function renderArrayAuto(arr) {
    return el("div", arr.map(renderAuto));
  }
  function renderArrayTable(array) {
    var hLabels = opt.tableHeadersLabels || [];
    var hClasses = opt.tableHeadersClasses || [];
    var tTitle = opt.tableTitle || "";
    var hSkip = opt.tableHeadersSkip === true;

    var firstRow = array[0];
    if (typeof firstRow === "undefined") {
      return el("table");
    }
    var labels = Object.keys(array[0]);
    if (labels.length === 0) {
      return el("table");
    }

    const elTable = el(
      "table",
      {
        class: opt.tableClass,
      },
      makeHeaders(),
      makeBody()
    );

    return elPanel({
      classHeader: opt.tableContainerHeaderClass,
      classContainer: opt.tableContainerClass,
      title: renderString(tTitle, opt.tableTitleAsLanguageKey),
      content: elTable,
    });

    /**
     * Table parts
     */
    function makeHeaders() {
      if (!hSkip) {
        return el(
          "thead",
          el(
            "tr",
            labels.map((l, i) => {
              l = hLabels[i] || l;
              return el(
                "th",
                {
                  class: hClasses[i],
                  scope: "col",
                  dataset: {
                    lang_key: l,
                  },
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
        "tbody",
        array.map((row) => {
          return el(
            "tr",
            labels.map((l) => {
              return el("td", renderAuto(row[l]));
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
      classHeader: ["panel-heading"],
      classContainer: ["panel", "panel-default"],
      content: null,
      title: null,
    },
    opt
  );

  return el(
    "div",
    {
      class: opt.classContainer,
    },
    el(
      "div",
      {
        class: opt.classHeader,
      },
      opt.title
    ),
    opt.content
  );
}

/**
 * Create a tag and set translation item in it
 * @param {String} keys Key to look for in the dictionnary
 * @param {Object} opt Options 
 * @param {String} opt.lang Two letter code language 
 * @param {String} opt.tooltip Add tooltip (default:true) 
 * @param {Object} opt.data Data for templating

 * @return {Element} span element with dataset-lang_key
 */
function elSpanTranslate(key, opt) {
  opt = Object.assign({}, { lang: null, data: null, tooltip: true }, opt);

  const promText = getDictItem(key, opt.lang).then((t) => {
    if (opt.data) {
      return parseTemplate(t, opt.data);
    }
    return t;
  });

  const dataset = {
    lang_key: key,
    lang_type: "text",
  };

  if (opt.data) {
    dataset.lang_data = JSON.stringify(opt.data);
  }

  const confEl = { dataset };

  if (opt.tooltip) {
    confEl.class = ["hint--bottom"];
  }

  return el("span", confEl, promText);
}

/**
 * Shorcut for elSpanTranslate
 */
export function tt(txt, opt) {
  const optTt = Object.assign({}, { tooltip: false }, opt);
  return elSpanTranslate(txt, optTt);
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
 * @param {Object} opt.config Additional "el" config
 */
function elButtonIcon(key, opt) {
  opt = Object.assign(
    {},
    {
      mode: "text_icon",
      classes: [],
      icon: null,
      dataset: {},
      badgeContent: null,
      style: null,
      content: null,
      config: null,
    },
    opt
  );

  const addIcon = opt.mode === "text_icon" || opt.mode === "icon";
  const addText = opt.mode === "text_icon" || opt.mode === "text";
  const addBadge = !!opt.badgeContent;
  const addContent = !!opt.content;

  opt.dataset.lang_type = "tooltip";
  opt.classes.push("hint--bottom");
  opt.dataset.lang_key = key;

  const elBtn = el(
    "button",
    {
      type: "button",
      class: ["btn", "btn-default", "btn-icon", ...opt.classes],
      dataset: opt.dataset,
      style: opt.style,
      ...opt.config,
    },
    [
      addBadge
        ? el("span", { class: ["badge"] }, `${opt.badgeContent}`)
        : false,
      addText ? elSpanTranslate(key) : false,
      addIcon
        ? el(
            "div",
            { class: "btn-icon-wrapper" },
            el("i", { class: ["fa", opt.icon] })
          )
        : false,
      addContent ? opt.content : false,
    ]
  );

  getDictItem(key).then((txt) => {
    elBtn.setAttribute("aria-label", txt);
  });
  return elBtn;
}

/**
 * Standard fa icon button ( alternative to elButtonIcon )
 * @param {String} key Translation key
 * @param {Object} opt Options
 * @param {String} opt.icon Font awesome icon name e.g. fa-lock => 'lock'
 * @param {Function} opt.action Callback when clicked
 * @return {Element}
 */
export function elButtonFa(key, opt) {
  opt = Object.assign(
    {},
    {
      icon: "question",
      action: () => {},
    },
    opt
  );
  return elButtonIcon(key, {
    icon: `fa-${opt.icon}`,
    mode: "text_icon",
    config: {
      on: { click: opt.action },
    },
  });
}

/**
 * Standard checkbox
 * @param {String} key Unique key : used form name + translation
 * @param {Object} opt Options
 * @param {String} opt.id Element id
 * @param {String} opt.dataset Additional custom data-
 * @param {String} opt.action Callback
 * @param {String} opt.name Form name item, if not equal to key
 * @param {Boolean} opt.checked Checked at start
 * @param {Boolean} opt.checked Disabled at start
 * @param {Boolean} opt.tooltip Add tooltip (false)
 * @param {Boolean} opt.keyLabel Optional translation key for label
 * @param {Boolean} opt.keyDesc Optional translation key for descriptiom
 */
/*export function elCheckbox(key, opt) {*/
/*opt = Object.assign(*/
/*{},*/
/*{*/
/*id: Math.random().toString(32),*/
/*action: () => {},*/
/*checked: true,*/
/*disabled: false,*/
/*tooltip: false,*/
/*keyLabel: null,*/
/*keyDesc: null,*/
/*dataset: "",*/
/*},*/
/*opt*/
/*);*/

/*return el("div", { class: "checkbox" }, [*/
/*el("label", { for: opt.id }, [*/
/*el("input", {*/
/*name: opt.name || key,*/
/*id: opt.id,*/
/*type: "checkbox",*/
/*checked: opt.checked,*/
/*disabled: opt.disabled,*/
/*value: "true", // will be used in form data. If not set, "on" will be returned.*/
/*on: ["change", opt.action],*/
/*dataset: opt.dataset,*/
/*}),*/
/*elSpanTranslate(opt.keyLabel ? opt.keyLabel : `${key}_label`, {*/
/*tooltip: opt.tooltip,*/
/*}),*/
/*el(*/
/*"div",*/
/*{ class: ["text-muted", "help-box"] },*/
/*elSpanTranslate(opt.keyDesc ? opt.keyDesc : `${key}_desc`, {*/
/*tooltip: opt.tooltip,*/
/*})*/
/*),*/
/*]),*/
/*]);*/
/*}*/

/**
 * Generic input element
 * @param {String} key Unique key : used for name + translation
 * @param {Object} opt Options
 * @param {String} opt.id Element id
 * @param {String} opt.dataset Additional custom data
 * @param {String} opt.action Callback
 * @param {String} opt.name Form name item, if not equal to key
 * @param {String} opt.value Default value
 * @param {Boolean} opt.checked Checked at start (only for checkboxes)
 * @param {Boolean} opt.disabled Disabled at start
 * @param {Boolean} opt.tooltip Add tooltip (false)
 * @param {Boolean} opt.keyLabel Optional translation key for label
 * @param {Boolean} opt.keyDesc Optional translation key for description
 * @param {String} opt.type Input type (text, number, checkbox, etc.)
 */
export function elInput(key, opt) {
  opt = Object.assign(
    {},
    {
      id: Math.random().toString(32),
      action: () => {},
      checked: null,
      disabled: false,
      tooltip: false,
      keyLabel: null,
      keyDesc: null,
      dataset: "",
      type: "text",
      class: null,
    },
    opt
  );

  const inputOptions = {
    name: opt.name || key,
    id: opt.id,
    type: opt.type,
    disabled: opt.disabled,
    value: opt.value,
    on: ["change", opt.action],
    dataset: opt.dataset,
  };

  if (opt.type === "checkbox") {
    inputOptions.checked = opt.checked;
    inputOptions.value = "true"; // for form data. If not set, "on" will be returned.
  }

  const elInput = el("input", inputOptions);

  const elLabelText = elSpanTranslate(
    opt.keyLabel ? opt.keyLabel : `${key}_label`,
    {
      tooltip: opt.tooltip,
    }
  );
  const elLabel = el("label", { for: opt.id });

  const elHelp = el(
    "div",
    { class: ["text-muted", "help-box"] },
    elSpanTranslate(opt.keyDesc ? opt.keyDesc : `${key}_desc`, {
      tooltip: opt.tooltip,
    })
  );

  if (opt.type === "checkbox") {
    elLabel.appendChild(elInput);
    elLabel.appendChild(elLabelText);
    const elCheckbox = el("div", { class: ["checkbox", opt.class] }, [
      elLabel,
      elHelp,
    ]);
    return elCheckbox;
  }

  elInput.classList.add("form-control");
  elLabel.appendChild(elLabelText);
  const elGroup = el("div", { class: ["form-group", opt.class] }, [
    elLabel,
    elInput,
    elHelp,
  ]);
  return elGroup;
}

/**
 * Standard checkbox
 * @param {String} key Unique key : used form name + translation
 * @param {Object} opt Options
 * @param {String} opt.id Element id
 * @param {String} opt.dataset Additional custom data
 * @param {String} opt.action Callback
 * @param {String} opt.name Form name item, if not equal to key
 * @param {Boolean} opt.checked Checked at start
 * @param {Boolean} opt.checked Disabled at start
 * @param {Boolean} opt.tooltip Add tooltip (false)
 * @param {Boolean} opt.keyLabel Optional translation key for label
 * @param {Boolean} opt.keyDesc Optional translation key for descriptiom
 */
export function elCheckbox(key, opt) {
  opt = Object.assign(
    {},
    {
      type: "checkbox",
      checked: true,
      value: "true", // will be used in form data. If not set, "on" will be returned.
    },
    opt
  );

  return elInput(key, opt);
}

/**
 * Standard select
 * @param {String} key Unique key : used form name + translation
 * @param {Object} opt Options
 * @param {String} opt.id Element id
 * @param {String} opt.dataset Additional custom data-
 * @param {String} opt.action Callback
 * @param {String} opt.keyLabel Optional translation key for label
 * @param {String} opt.keyDesc Optional translation key for descriptiom
 * @param {Boolean} opt.asRow return result as table row ( tr<td, td> )
 */
export function elSelect(key, opt) {
  opt = Object.assign(
    {},
    {
      id: Math.random().toString(32),
      action: () => {},
      items: [],
      keyLabel: null,
      keyDesc: null,
      dataset: "",
      asRow: false,
    },
    opt
  );

  if (isNotEmpty(opt.item)) {
    opt.item[0].selected = true;
  }

  const elOut = opt.asRow ? el("tr") : el("div", { class: "form-group" });

  const elSelectInput = el(
    "select",
    {
      on: ["change", opt.action],
      name: key,
      id: opt.id,
      class: "form-control",
      dataset: opt.dataset,
    },
    opt.items
  );

  const elLabelText = elSpanTranslate(
    opt.keyLabel ? opt.keyLabel : `${key}_label`
  );

  const elLabel = opt.asRow
    ? el("td", elLabelText)
    : el("label", { for: opt.id }, elLabelText);

  const elInput = opt.asRow ? el("td", elSelectInput) : elSelectInput;

  elOut.appendChild(elLabel);
  elOut.appendChild(elInput);

  return elOut;
}

/**
 * Detail element
 * @param {String} key Translation key
 * @param {Element} content Content
 */
export function elDetails(key, content) {
  return el("details", el("summary", elSpanTranslate(key)), content);
}

/**
 * Create alert box
 * @param {String} key Translation key
 * @param {String} type Alert type : warning, info, success, danger
 */
export function elAlert(key, type, opt) {
  const elAlert = el(
    "div",
    { class: ["alert", `alert-${type}`], role: "alert" },
    elSpanTranslate(key, opt)
  );
  return elAlert;
}
