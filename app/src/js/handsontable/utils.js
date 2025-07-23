import { getLanguageCurrent } from "./../language";
import { pgTypesData } from "./types.js";

export function getHandsonLanguageCode() {
  let lang = getLanguageCurrent();
  let languages = {
    de: "de-DE",
    es: "es-MX",
    fr: "fr-FR",
    ru: "ru-RU",
    zh: "zh-CN",
  };
  return languages[lang] || "en-US";
}

/*
 * NOTE: PG supported types
 * with tt as (select id as table_name from mx_sources) select distinct data_type from information_schema.columns cc, tt where cc.table_name = tt.table_name;
 */
const pgTypes = Object.keys(pgTypesData);

/**
 * Convert cell type
 * @param {String} pg_type pg type
 * @param {String} format 'json','table_editor','mx','postgres'. Default: postgres
 * @return {String} type
 */
export function typeConvert(pg_type, format) {
  if (!isPgType(pg_type)) {
    throw new Error(`typeConvert, unexpected pg type : ${pg_type}`);
  }
  switch (format) {
    case "json":
    case "table_editor":
    case "mx":
      return pgTypesData[pg_type][format];
    case "postgres":
      return pg_type;
    default:
      return pg_type;
  }
}

/**
 * Get list of supported pg types
 * @return {Array}
 */
export function getPgTypes() {
  return pgTypes;
}

/**
 * Validate pg type
 * @param {String} type Item to test
 * @return {Boolean}
 */
export function isPgType(type) {
  return pgTypes.includes(type);
}

const regDatePg = new RegExp("^date|^timestamp");
export function isPgTypeDate(type) {
  return regDatePg.test(type);
}

export class TableResizer {
  constructor(hot, elTable, elObserve) {
    this._hot = hot;
    this._elTable = elTable;
    this._elObserve = elObserve;
    this._timeout = 200;
    this._to = null;
    this._init = false;
    this.init();
  }

  disconnect() {
    return this._resizeObserver.disconnect();
  }

  init() {
    if (this._init) {
      return;
    }
    this._resizeObserver = new ResizeObserver(this.tableRender.bind(this));
    this._resizeObserver.observe(this._elObserve);
    this.tableRender();
    this._init = true;
  }

  tableRender() {
    const hot = this._hot;
    clearTimeout(this._to);
    const elTable = this._elTable;
    const elTableParent = elTable.parentElement;

    this._to = setTimeout(() => {
      if (!hot || !hot.render) {
        return;
      }
      const styleParent = getComputedStyle(elTableParent);
      const bboxParent = this._elTable.parentElement.getBoundingClientRect();
      const padW =
        parseInt(styleParent.paddingLeft) + parseInt(styleParent.paddingRight);
      const padH =
        parseInt(styleParent.paddingTop) + parseInt(styleParent.paddingBottom);
      this._elTable.style.width = bboxParent.width - padW + "px";
      this._elTable.style.height = bboxParent.height - padH + "px";

      hot.render();
    }, this._timeout);
  }
}
