import { EditTableSessionClient } from "./edit_table.js";
import { ws } from "./../mx.js";

const instances = new Map();

export async function editTable(config) {
  try {
    const { idTable } = config;
    const exists = instances.get(idTable) instanceof EditTableSessionClient;
    if (exists) {
      console.warn("Table already loaded");
      return;
    }
    const instance = new EditTableSessionClient(ws.socket, {
      id_table: idTable,
    });
    instance.addDestroyCb(() => {
      instances.delete(idTable);
    });
    instances.set(idTable, instance);
    console.log(`instance init for ${idTable}`);
    await instance.init();
  } catch (e) {
    console.error(e);
    const instanceToRemove = instances.set(idTable);
    if (instanceToRemove) {
      instanceToRemove.destroy();
    }
  }
}
