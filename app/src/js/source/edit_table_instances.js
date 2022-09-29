import { EditTableSessionClient } from "./edit_table.js";
import { ws } from "./../mx.js";
import { modalDialog } from "./../mx_helper_modal.js";
import { isFunction } from "./../is_test";
const instances = new Map();

/**
 * Init Edit Table session
 * @param {Object} config
 * @param {String} config.idTable Id of the source to edit
 * @param {Function} config.destroyCb Optional callback when destroy is called
 * @return {Object} state : instance state
 */
export async function editTable(config) {
  const { idTable, testMode } = config;
  try {
    const exists = instances.get(idTable) instanceof EditTableSessionClient;
    if (exists) {
      console.warn("Table already loaded");
      return;
    }
    const instance = new EditTableSessionClient(ws.socket, {
      id_table: idTable,
      test_mode: testMode,
    });
    instance.addDestroyCb(() => {
      instances.delete(idTable);
    });
    if (isFunction(config.destroyCb)) {
      instance.addDestroyCb(config.destroyCb);
    }
    instances.set(idTable, instance);
    const e = await instance.init();
    if (e instanceof Error) {
      await modalDialog({
        content: e.message,
      });
    }
    return instance;
  } catch (e) {
    const instanceToRemove = instances.get(idTable);
    if (instanceToRemove) {
      instanceToRemove.destroy();
    }
    throw e;
  }
}

/**
 * Get table editor instance
 * @param {Object} options
 * @param {String} options.idTable Id of the source to edit
 * @return {Object} Table editor instance
 */
export async function editTableGet(config) {
  try {
    return instances.get(config?.idTable);
  } catch (e) {
    console.error(e);
  }
}
