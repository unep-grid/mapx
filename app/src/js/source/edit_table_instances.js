import { EditTableSessionClient } from "./edit_table.js";
import { ws } from "./../mx.js";

const instances = new Map();

export async function editTable(config) {
  const { idTable } = config;
  try {
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
    const instanceToRemove = instances.get(idTable);
    if (instanceToRemove) {
      instanceToRemove.destroy();
    }
  }
}
