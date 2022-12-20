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
 * @param {String} format 'json','handsontable','postgres'. Default: postgres
 * @return {String} type
 */
export function typeConvert(pg_type, format) {
  if (!isPgType(pg_type)) {
    throw new Error(`typeConvert, unexpected pg type : ${pg_type}`);
  }
  switch (format) {
    case "json":
    case "handsontable":
    case "mx_handsontable":
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
