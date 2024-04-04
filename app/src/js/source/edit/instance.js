import { EditTableSessionClient } from "./index.js";
import { ws } from "./../../mx.js";

const store = new Map();

/**
 * Create a table editor instance
 * @param {opt} EditTableSessionClient options
 * @return {Promise<EditTableSessionClient>}
 */
export async function editTable(opt) {
  if (opt.idTable) {
    opt.id_table = opt.idTable;
  }
  const idTable = opt.idTable;

  if (store.has(idTable)) {
    return store.get(idTable);
  }

  const editor = new EditTableSessionClient(ws, opt);

  editor.addDestroyCb(() => {
    store.delete(idTable);
  });

  store.set(idTable, editor);

  await editor.init();

  return editor;
}
