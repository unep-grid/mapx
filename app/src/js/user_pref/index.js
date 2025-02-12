import localforage from "localforage";
import schema from "./schema.json";

const defValues = {};
for (const k in schema.properties) {
  defValues[k] = schema.properties[k].default;
}

const settings = localforage.createInstance("user_pref_settings");

/**
 * Simple preferences register.
 */
export async function prefGet(key) {
  try {
    validate(key);
    return settings.getItem(key);
  } catch (e) {
    console.warn("User get pref issue", e);
  }
}
export async function prefSet(key, value) {
  try {
    validate(key);
    return settings.setItem(key, value);
  } catch (e) {
    console.warn("User set pref issue", e);
  }
}
export async function prefGetAll() {
  try {
    const all = {};
    await settings.iterate((value, key) => (all[key] = value));
    return all;
  } catch (e) {
    console.warn("User get all pref issue", e);
  }
}
export async function prefGetAllKeys() {
  try {
    return settings.keys();
  } catch (e) {
    console.warn("User get all pref issue", e);
  }
}
export async function prefSetAll(data) {
  try {
    data = Object.assign({}, defValues, data);
    for (const key in data) {
      await prefSet(key, data[key]);
    }
    return true;
  } catch (e) {
    console.warn("User set all pref issue", e);
  }
}
export async function prefReset() {
  try {
    await prefSetAll(defValues);
    return true;
  } catch (e) {
    console.warn("User set all pref issue", e);
  }
}
/**
 * TODO: make proper schema validation
 */

function validate(key) {
  if (!schema.properties[key]) {
    throw new Error(`User pref : unknown key ${key}`);
  }
}

