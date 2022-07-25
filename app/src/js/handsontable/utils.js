import { getLanguageCurrent } from "./../language";

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

/*export function typeConverter(type) {*/
/*const def = "text";*/
/*return (*/
/*{*/
/*boolean: "checkbox",*/
/*number: "numeric",*/
/*string: "text",*/
/*date: "date",*/
/*}[type] || def*/
/*);*/
/*}*/

const types = [
  {
    postgres: "text",
    input: "text",
    javascript: "string",
    json: "string",
  },
  {
    postgres: "boolean",
    input: "checkbox",
    javascript: "boolean",
    json: "boolean",
  },
  {
    postgres: "integer",
    input: "numeric",
    javascript: "number",
    json: "number",
  },
  {
    postgres: "numeric",
    input: "numeric",
    javascript: "number",
    json: "number",
  },
];

/**
 * Convert cell type
 * @param {String} type Cell type
 * @param {String} from From : postgres, input, javascript, json
 * @param {String} to From : postgres, input, javascript, json
 * @return {String} type
 */
export function typeConvert(type, from, to) {
  for (const t of types) {
    if (t[from] === type) {
      return t[to];
    }
  }
  return "text";
}

/**
 * Get list of types
 * @param {String} from from : postgres, json, ...
 * @return {Array}
 */
export function getTypes(from) {
  return types.map((t) => t[from]);
}
