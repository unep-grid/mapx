import {jsoneditor} from 'json-editor';
import localforage from 'localforage';
import {modal} from './../mx_helper_modal.js';
import {el} from './../el/src/index.js';
import './../../css/mx_jed.css';
import schema from './schema.json';

const def = {
  theme: 'bootstrap3',
  iconlib: 'bootstrap3',
  disable_collapse: true,
  disable_properties: true,
  disableSelectize: true,
  disable_edit_json: true,
  required_by_default: true,
  show_errors: 'always',
  no_additional_properties: true,
  schema: {},
  startval: {}
};

const defValues = {};
for(const k in schema.properties){
   defValues[k]=schema.properties[k].default;
}

const settings = localforage.createInstance('user_pref_settings');
const prefData = localforage.createInstance('user_pref_data');

/**
 * Simple preferences register.
 */
export async function prefGet(key) {
  try {
    validate(key);
    return settings.getItem(key);
  } catch (e) {
    console.warn('User get pref issue', e);
  }
}
export async function prefSet(key, value) {
  try {
    validate(key);
    return settings.setItem(key, value);
  } catch (e) {
    console.warn('User set pref issue', e);
  }
}
export async function prefGetAll() {
  try {
    const all = {};
    await settings.iterate((value, key) => (all[key] = value));
    return all;
  } catch (e) {
    console.warn('User get all pref issue', e);
  }
}
export async function prefGetAllKeys() {
  try {
    return await settings.keys();
  } catch (e) {
    console.warn('User get all pref issue', e);
  }
}
export async function prefSetAll(data) {
  try {
    data = Object.assign({},defValues,data);
    for (const key in data) {
      await prefSet(key, data[key]);
    }
    return true;
  } catch (e) {
    console.warn('User set all pref issue', e);
  }
}
export async function prefReset() {
  try {
    await prefSetAll(defValues);
    return true;
  } catch (e) {
    console.warn('User set all pref issue', e);
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

/**
 * TODO: connect to modules (e.g. button panel sizes, interface colors, text size, etc...);
 * Save custom data (style, panel size
 */

export async function prefSetData(key) {
  return prefData.getItem(key);
}
export async function prefGetData(id) {
  return prefData.setItem(key, value);
}
export async function prefGetAllData() {
  const all = {};
  await prefData.iterate((value, key) => (all[key] = value));
  return all;
}

let elModal;

/**
 * Draft pref panel
 * TODO:
 * - move 'clear cache' button here
 * - move 'reset default panel size' button here
 * - Check how to connect style from preferences to mx.theme
 */
export async function showPrefPanel() {
  try {
    if (elModal) {
      return;
    }
    const elJsonEditor = el('div');

    const startval = await prefGetAll();
    const options = Object.assign({}, def, {schema, startval});

    elModal = modal({
      title: 'User settings',
      content: elJsonEditor,
      onClose: clean
    });

    const editor = new JSONEditor(elJsonEditor, options);

    editor.on('change', () => {
      console.log(editor.getValue());
    });

    function clean() {
      elModal = null;
      editor.destroy();
    }
  } catch (e) {
    console.warn('User pref modale issue', e);
  }
}
