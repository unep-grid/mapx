import { EditTableSessionClient } from "./edit_table.js";
import { ws } from "./../mx.js";

const instances = new Map();

/**
 * Init Edit Table session
 * @param {Object} options
 * @param {String} options.idTable Id of the source to edit
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
      test_mode : testMode
    });
    instance.addDestroyCb(() => {
      instances.delete(idTable);
    });
    instances.set(idTable, instance);
    await instance.init();
    return instance;
  } catch (e) {
    console.error(e);
    const instanceToRemove = instances.get(idTable);
    if (instanceToRemove) {
      instanceToRemove.destroy();
    }
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
