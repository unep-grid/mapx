/**
 * @module language
 * @description This module handles language translations for the application.
 * It initializes an in-memory dictionary from JSON files and provides
 * functions to translate strings, import dictionary data into a PostgreSQL
 * database, and retrieve specific translations.
 */

import { readTxt, parseTemplate } from "#mapx/helpers";
import { pgAdmin, pgRead } from "#mapx/db";

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dir = "dict/_built";
const db = {};
const files = fs.readdirSync(new URL(dir, import.meta.url).pathname);
const dicts_lang = files.filter((f) => f.match(/.*dict_[a-z]{2}\.json$/gm));
const dict_full = path.join(__dirname, dir, "dict_full.json");

for (const file of dicts_lang) {
  const { name } = path.parse(file);
  const lang = name.split(/_|\./)[1];
  const data = JSON.parse(readTxt(path.join(__dirname, dir, file)));
  db[lang] = {};
  for (const d of data) {
    db[lang][d.id] = d[lang] || d.en || d.id;
  }
}

/**
 * Initializes the language module by importing the dictionary into the database.
 * @returns {Promise<void>}
 */
export async function init() {
  try {
    /**
     * Copy in postgres
     */
    const start = Date.now();
    const done = await importDict();
    if (done) {
      console.log(`Imported dict in ${Date.now() - start} ms`);
    }
  } catch (e) {
    console.error(e);
  }
}

/**
 * Translates a given ID into a specified language and optionally applies template data.
 * @param {string} id - The dictionary entry ID to translate.
 * @param {string} [lang='en'] - The two-letter language code (e.g., 'en', 'fr'). Defaults to 'en'.
 * @param {Object<string, any>} [data] - Data for templating, where keys in the object match placeholders in the translation string (e.g., { name: 'Bob' } for 'User name is {{name}}').
 * @returns {string} The translated and templated string, or the original ID if no translation is found.
 */
export function translate(id, lang, data) {
  let item;
  try {
    item = db[lang || "en"][id];
    if (data) {
      item = parseTemplate(item, data);
    }
  } catch (e) {
    console.error(e);
  }
  return item || id;
}
export const t = translate;

/**
 * Imports the full dictionary from a JSON file into the PostgreSQL database.
 * It performs a full replacement of the `mx_dict_translate` table.
 * @private
 * @returns {Promise<boolean>} Returns `true` if the import was successful, otherwise `undefined`.
 */
async function importDict() {
  const fileExists = fs.existsSync(dict_full);
  if (!fileExists) {
    return;
  }
  const client = await pgAdmin.connect();
  try {
    const dict = JSON.parse(readTxt(dict_full));
    await client.query("BEGIN");
    await client.query("DELETE FROM mx_dict_translate");
    for (let r = 0, rL = dict.length; r < rL; r++) {
      const row = dict[r];
      const keys = Object.keys(row).join(",");
      const values = Object.values(row).map(client.escapeLiteral).join(",");
      await client.query(
        `INSERT INTO mx_dict_translate (${keys}) VALUES (${values})`
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(e);
  } finally {
    client.release();
  }
  return true;
}

/**
 * Retrieves translations for M49 and ISO3 country codes from the database.
 * @returns {Promise<Array<Object<string, any>>>|undefined>} A promise that resolves to an array of translation objects, or undefined on error.
 */
export async function getDictM49iso3() {
  try {
    const resp = await pgRead.query(
      `select * from mx_dict_translate where id ~ '(^m49_.*|^[A-Z]{3})'`
    );
    return resp.rows;
  } catch (e) {
    console.error(e);
  }
}
